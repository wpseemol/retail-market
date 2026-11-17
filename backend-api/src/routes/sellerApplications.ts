import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { currentMediaDisk } from "../config/storage.config.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  discardTempUpload,
  sellerKycImageUpload,
  uploadBytes,
} from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sanitizeOriginalName } from "../lib/shopImage.js";
import {
  finalizeSellerKycImageUpload,
  SELLER_KYC_IMAGES_RELATIVE,
} from "../lib/sellerKycImage.js";
import { deleteMediaFile } from "../lib/storage/files.js";
import {
  applicationInclude,
  findOpenApplicationForUser,
  getPublicSellerTerms,
  hasRequiredIdentityDocs,
  toPublicApplication,
} from "../lib/sellerApplication.js";
import {
  ensureKycSettings,
  parsePartnerTerms,
  verifyIdentityWithProvider,
} from "../lib/kyc.js";
import {
  submitSellerApplicationSchema,
  uploadSellerDocumentSchema,
  upsertSellerApplicationSchema,
} from "../validators/sellerApplication.js";

export const sellerApplicationsRouter = Router();

async function loadUserVerification(userId: bigint) {
  return prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
    select: {
      id: true,
      role: true,
      email: true,
      phone: true,
      first_name: true,
      last_name: true,
      email_verified_at: true,
      phone_verified_at: true,
    },
  });
}

function verificationGate(user: NonNullable<Awaited<ReturnType<typeof loadUserVerification>>>) {
  if (user.role !== "customer" && user.role !== "vendor") {
    return {
      status: 403 as const,
      body: {
        message: "Only customer accounts can apply to become a seller",
        code: "ROLE_NOT_ELIGIBLE",
      },
    };
  }
  if (!user.email_verified_at) {
    return {
      status: 403 as const,
      body: {
        message: "Verify your email before applying",
        code: "EMAIL_NOT_VERIFIED",
      },
    };
  }
  if (!user.phone_verified_at) {
    return {
      status: 403 as const,
      body: {
        message: "Verify your phone before applying",
        code: "PHONE_NOT_VERIFIED",
      },
    };
  }
  return null;
}

/** Public fee/rent terms + staff checklist (no auth). */
sellerApplicationsRouter.get(
  "/terms",
  asyncHandler(async (_req, res) => {
    const payload = await getPublicSellerTerms();
    return res.json(payload);
  }),
);

sellerApplicationsRouter.use(requireAuth);

sellerApplicationsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await loadUserVerification(req.auth!.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const approved = await prisma.sellerApplication.findFirst({
      where: { user_id: user.id, status: "approved" },
      include: applicationInclude,
      orderBy: { updated_at: "desc" },
    });
    const open = approved ?? (await findOpenApplicationForUser(user.id));
    const terms = await getPublicSellerTerms();

    return res.json({
      application: open ? toPublicApplication(open) : null,
      account: {
        email_verified: Boolean(user.email_verified_at),
        phone_verified: Boolean(user.phone_verified_at),
        role: user.role,
        has_shop: Boolean(
          await prisma.vendor.findFirst({
            where: { user_id: user.id, deleted_at: null },
            select: { id: true },
          }),
        ),
      },
      terms: terms.terms,
      staff_checklist: terms.staff_checklist,
    });
  }),
);

sellerApplicationsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = await loadUserVerification(req.auth!.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const gate = verificationGate(user);
    if (gate) return res.status(gate.status).json(gate.body);

    const existingShop = await prisma.vendor.findFirst({
      where: { user_id: user.id, deleted_at: null },
      select: { id: true },
    });
    if (existingShop) {
      return res.status(409).json({
        message: "You already have a store",
        code: "ALREADY_SELLER",
      });
    }

    const parsed = upsertSellerApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const blocking = await prisma.sellerApplication.findFirst({
      where: {
        user_id: user.id,
        status: { in: ["submitted", "under_review", "approved"] },
      },
      select: { id: true, status: true },
    });
    if (blocking && blocking.status !== "approved") {
      return res.status(409).json({
        message: "You already have an application awaiting review",
        code: "APPLICATION_PENDING",
        application_id: blocking.id.toString(),
      });
    }

    let app = await findOpenApplicationForUser(user.id);
    if (app && (app.status === "submitted" || app.status === "under_review")) {
      return res.status(409).json({
        message: "Application is locked while under review",
        code: "APPLICATION_LOCKED",
      });
    }

    const data = parsed.data;
    if (!app || app.status === "rejected") {
      app = await prisma.sellerApplication.create({
        data: {
          user_id: user.id,
          status: "draft",
          shop_name: data.shop_name ?? null,
          shop_name_bn: data.shop_name_bn ?? null,
          description: data.description ?? null,
          contact_phone: data.contact_phone ?? user.phone,
          business_address: data.business_address ?? null,
        },
        include: applicationInclude,
      });
    } else {
      app = await prisma.sellerApplication.update({
        where: { id: app.id },
        data: {
          ...(data.shop_name !== undefined ? { shop_name: data.shop_name } : {}),
          ...(data.shop_name_bn !== undefined ? { shop_name_bn: data.shop_name_bn } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.contact_phone !== undefined
            ? { contact_phone: data.contact_phone }
            : {}),
          ...(data.business_address !== undefined
            ? { business_address: data.business_address }
            : {}),
          status: "draft",
          rejection_reason: null,
        },
        include: applicationInclude,
      });
    }

    return res.status(app ? 200 : 201).json({
      message: "Application saved",
      application: toPublicApplication(app),
    });
  }),
);

sellerApplicationsRouter.post(
  "/me/documents",
  sellerKycImageUpload.single("document"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Document image is required", code: "DOCUMENT_REQUIRED" });
    }

    const user = await loadUserVerification(req.auth!.userId);
    if (!user) {
      discardTempUpload(file);
      return res.status(401).json({ message: "User not found" });
    }
    const gate = verificationGate(user);
    if (gate) {
      discardTempUpload(file);
      return res.status(gate.status).json(gate.body);
    }

    const parsed = uploadSellerDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      discardTempUpload(file);
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    let app = await findOpenApplicationForUser(user.id);
    if (!app) {
      discardTempUpload(file);
      return res.status(409).json({
        message: "Save shop details before uploading documents",
        code: "APPLICATION_REQUIRED",
      });
    }
    if (app.status === "submitted" || app.status === "under_review") {
      discardTempUpload(file);
      return res.status(409).json({
        message: "Cannot change documents while the application is under review",
        code: "APPLICATION_LOCKED",
      });
    }
    if (app.status === "rejected") {
      app = await prisma.sellerApplication.update({
        where: { id: app.id },
        data: { status: "draft", rejection_reason: null },
        include: { documents: { include: { media: true } } },
      });
    }

    const finalized = await finalizeSellerKycImageUpload(uploadBytes(file), file.mimetype);
    if (!finalized.ok) {
      return res.status(400).json({ message: finalized.message, code: finalized.code });
    }

    const existingDoc = app.documents.find((d) => d.doc_type === parsed.data.doc_type);
    if (existingDoc) {
      await prisma.sellerApplicationDocument.delete({ where: { id: existingDoc.id } });
      try {
        await deleteMediaFile(existingDoc.media.file_path, existingDoc.media.file_name);
      } catch {
        /* ignore orphan cleanup */
      }
      await prisma.media.delete({ where: { id: existingDoc.media_id } }).catch(() => undefined);
    }

    const media = await prisma.media.create({
      data: {
        user_id: user.id,
        disk: currentMediaDisk(),
        file_name: finalized.fileName,
        original_name: sanitizeOriginalName(file.originalname),
        file_path: SELLER_KYC_IMAGES_RELATIVE,
        file_size: BigInt(finalized.size),
        mime_type: finalized.detected.mime,
        collection_name: "seller_kyc",
        is_public: false,
        mediable_type: "SellerApplication",
        mediable_id: app.id,
      },
    });

    await prisma.sellerApplicationDocument.create({
      data: {
        application_id: app.id,
        doc_type: parsed.data.doc_type,
        media_id: media.id,
        label: parsed.data.label ?? null,
      },
    });

    const refreshed = await prisma.sellerApplication.findUniqueOrThrow({
      where: { id: app.id },
      include: applicationInclude,
    });

    return res.status(201).json({
      message: "Document uploaded",
      application: toPublicApplication(refreshed),
    });
  }),
);

sellerApplicationsRouter.post(
  "/me/submit",
  asyncHandler(async (req, res) => {
    const user = await loadUserVerification(req.auth!.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const gate = verificationGate(user);
    if (gate) return res.status(gate.status).json(gate.body);

    const parsed = submitSellerApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "You must accept the partner fee and rent terms",
        errors: parsed.error.flatten().fieldErrors,
        code: "FEE_TERMS_REQUIRED",
      });
    }

    const app = await findOpenApplicationForUser(user.id);
    if (!app) {
      return res.status(404).json({ message: "No draft application found", code: "APPLICATION_REQUIRED" });
    }
    if (app.status === "submitted" || app.status === "under_review") {
      return res.status(409).json({
        message: "Application already submitted",
        code: "ALREADY_SUBMITTED",
        application: toPublicApplication(app),
      });
    }

    if (!app.shop_name?.trim()) {
      return res.status(400).json({
        message: "Shop name is required",
        code: "SHOP_NAME_REQUIRED",
        errors: { shop_name: ["Shop name is required"] },
      });
    }

    const docTypes = app.documents.map((d) => d.doc_type);
    if (!hasRequiredIdentityDocs(docTypes)) {
      return res.status(400).json({
        message: "Upload NID front and back, or a birth certificate",
        code: "DOCUMENTS_INCOMPLETE",
      });
    }

    const kyc = await ensureKycSettings();
    const terms = parsePartnerTerms(kyc.partner_terms);
    const providerResult = await verifyIdentityWithProvider({
      docType: docTypes.join(","),
      applicantName: `${user.first_name} ${user.last_name}`.trim(),
    });

    if (providerResult.status === "rejected") {
      return res.status(502).json({
        message: providerResult.message,
        code: "KYC_PROVIDER_FAILED",
        kyc: providerResult,
      });
    }

    const updated = await prisma.sellerApplication.update({
      where: { id: app.id },
      data: {
        status: "submitted",
        accepted_fee_terms_at: new Date(),
        fee_snapshot: terms as unknown as Prisma.InputJsonValue,
        kyc_provider_result: providerResult as unknown as Prisma.InputJsonValue,
        rejection_reason: null,
        reviewed_by_id: null,
        reviewed_at: null,
      },
      include: applicationInclude,
    });

    return res.json({
      message: "Application submitted for review",
      application: toPublicApplication(updated),
      kyc: providerResult,
    });
  }),
);
