import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import type { Prisma } from "@prisma/client";
import { currentMediaDisk } from "../config/storage.config.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireCsrf } from "../middleware/csrf.js";
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
  CUSTOMER_DOC_FILE_BASE,
  findOpenApplicationForUser,
  getPublicSellerTerms,
  hasRequiredIdentityDocs,
  toPublicApplication,
} from "../lib/sellerApplication.js";
import { sendSellerKycFile } from "../lib/sellerKycServe.js";
import {
  ensureKycSettings,
  parsePartnerTerms,
  verifyIdentityWithProvider,
} from "../lib/kyc.js";
import { rateLimit } from "../lib/rateLimit.js";
import { parseBigIntId } from "../utils/ids.js";
import {
  submitSellerApplicationSchema,
  uploadSellerDocumentSchema,
  upsertSellerApplicationSchema,
} from "../validators/sellerApplication.js";

export const sellerApplicationsRouter = Router();

const draftLimiter = rateLimit({
  name: "SELLER_APP_DRAFT",
  max: 20,
  windowMs: 60 * 60 * 1000,
  message: "Too many seller application saves. Try again later.",
  key: (req) => String(req.auth?.userId ?? "anon"),
});

const docUploadLimiter = rateLimit({
  name: "SELLER_APP_DOC",
  max: 30,
  windowMs: 60 * 60 * 1000,
  message: "Too many document uploads. Try again later.",
  key: (req) => String(req.auth?.userId ?? "anon"),
});

const submitLimiter = rateLimit({
  name: "SELLER_APP_SUBMIT",
  max: 10,
  windowMs: 60 * 60 * 1000,
  message: "Too many submission attempts. Try again later.",
  key: (req) => String(req.auth?.userId ?? "anon"),
});

function serialize(app: Parameters<typeof toPublicApplication>[0]) {
  return toPublicApplication(app, { documentFileBase: CUSTOMER_DOC_FILE_BASE });
}

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

function verificationGate(
  user: NonNullable<Awaited<ReturnType<typeof loadUserVerification>>>,
) {
  // Only customers may apply. Existing vendors already have (or had) a store path.
  if (user.role !== "customer") {
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

function wrapSellerKycUpload(req: Request, res: Response, next: NextFunction) {
  sellerKycImageUpload.single("document")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "Each document image must be 2 MB or smaller",
        code: "SELLER_KYC_TOO_LARGE",
      });
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    return res.status(400).json({ message, code: "SELLER_KYC_UPLOAD_FAILED" });
  });
}

/** Public fee/rent terms (no staff secrets). Checklist is also public so applicants know the bar. */
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
      application: open ? serialize(open) : null,
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

/** Owner-only KYC file download (Bearer). Public /uploads/seller-kyc is blocked. */
sellerApplicationsRouter.get(
  "/me/documents/:docId/file",
  asyncHandler(async (req, res) => {
    const docId = parseBigIntId(req.params.docId);
    if (docId === null) {
      return res.status(400).json({ message: "Invalid document id" });
    }
    const doc = await prisma.sellerApplicationDocument.findFirst({
      where: {
        id: docId,
        application: { user_id: req.auth!.userId },
      },
      include: { media: true },
    });
    if (!doc?.media) {
      return res.status(404).json({ message: "Document not found" });
    }
    return sendSellerKycFile(res, doc.media);
  }),
);

sellerApplicationsRouter.post(
  "/",
  requireCsrf,
  draftLimiter,
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

    const alreadyMember = await prisma.vendorMember.findFirst({
      where: { user_id: user.id },
      select: { id: true },
    });
    if (alreadyMember) {
      return res.status(409).json({
        message: "You are already on a store team",
        code: "ALREADY_MEMBER",
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
    if (blocking?.status === "approved") {
      return res.status(409).json({
        message: "You already have an approved seller application",
        code: "ALREADY_APPROVED",
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
    // Reuse a rejected/draft row instead of creating duplicates.
    if (!app) {
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
          reviewed_by_id: null,
          reviewed_at: null,
        },
        include: applicationInclude,
      });
    }

    return res.status(200).json({
      message: "Application saved",
      application: serialize(app),
    });
  }),
);

sellerApplicationsRouter.post(
  "/me/documents",
  requireCsrf,
  docUploadLimiter,
  wrapSellerKycUpload,
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Document image is required",
        code: "DOCUMENT_REQUIRED",
      });
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
        data: {
          status: "draft",
          rejection_reason: null,
          reviewed_by_id: null,
          reviewed_at: null,
        },
        include: { documents: { include: { media: true } } },
      });
    }

    const finalized = await finalizeSellerKycImageUpload(
      uploadBytes(file),
      file.mimetype,
    );
    if (!finalized.ok) {
      return res.status(400).json({ message: finalized.message, code: finalized.code });
    }

    const existingDoc = app.documents.find((d) => d.doc_type === parsed.data.doc_type);

    let refreshed;
    try {
      refreshed = await prisma.$transaction(async (tx) => {
        if (existingDoc) {
          await tx.sellerApplicationDocument.delete({ where: { id: existingDoc.id } });
          await tx.media.delete({ where: { id: existingDoc.media_id } }).catch(() => undefined);
        }

        const media = await tx.media.create({
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
            mediable_id: app!.id,
          },
        });

        await tx.sellerApplicationDocument.create({
          data: {
            application_id: app!.id,
            doc_type: parsed.data.doc_type,
            media_id: media.id,
            label: parsed.data.label ?? null,
          },
        });

        return tx.sellerApplication.findUniqueOrThrow({
          where: { id: app!.id },
          include: applicationInclude,
        });
      });
    } catch (err) {
      // File was written before the DB row — remove orphan on failure.
      try {
        await deleteMediaFile(SELLER_KYC_IMAGES_RELATIVE, finalized.fileName);
      } catch {
        /* best-effort */
      }
      throw err;
    }

    if (existingDoc) {
      try {
        await deleteMediaFile(existingDoc.media.file_path, existingDoc.media.file_name);
      } catch {
        /* orphan cleanup best-effort */
      }
    }

    return res.status(201).json({
      message: "Document uploaded",
      application: serialize(refreshed),
    });
  }),
);

sellerApplicationsRouter.post(
  "/me/submit",
  requireCsrf,
  submitLimiter,
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
      return res.status(404).json({
        message: "No draft application found",
        code: "APPLICATION_REQUIRED",
      });
    }
    if (app.status === "submitted" || app.status === "under_review") {
      return res.status(409).json({
        message: "Application already submitted",
        code: "ALREADY_SUBMITTED",
        application: serialize(app),
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

    // Optimistic lock: only draft/rejected can become submitted.
    const locked = await prisma.sellerApplication.updateMany({
      where: { id: app.id, status: { in: ["draft", "rejected"] } },
      data: {
        status: "submitted",
        accepted_fee_terms_at: new Date(),
        fee_snapshot: terms as unknown as Prisma.InputJsonValue,
        kyc_provider_result: providerResult as unknown as Prisma.InputJsonValue,
        rejection_reason: null,
        reviewed_by_id: null,
        reviewed_at: null,
      },
    });
    if (locked.count === 0) {
      return res.status(409).json({
        message: "Application already submitted",
        code: "ALREADY_SUBMITTED",
      });
    }

    const updated = await prisma.sellerApplication.findUniqueOrThrow({
      where: { id: app.id },
      include: applicationInclude,
    });

    return res.json({
      message: "Application submitted for review",
      application: serialize(updated),
      kyc: providerResult,
    });
  }),
);
