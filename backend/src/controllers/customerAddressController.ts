import type { Request, Response } from "express";
import type { CustomerAddress } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../validators/customerAddress.js";

export function toPublicAddress(address: CustomerAddress) {
  return {
    id: address.id.toString(),
    label: address.label,
    full_name: address.full_name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
    type: address.type,
    is_default_shipping: address.is_default_shipping,
    is_default_billing: address.is_default_billing,
    created_at: address.created_at,
    updated_at: address.updated_at,
  };
}

async function clearOtherDefaults(
  userId: bigint,
  exceptId: bigint | null,
  opts: { shipping?: boolean; billing?: boolean },
) {
  if (opts.shipping) {
    await prisma.customerAddress.updateMany({
      where: {
        user_id: userId,
        deleted_at: null,
        is_default_shipping: true,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      data: { is_default_shipping: false },
    });
  }
  if (opts.billing) {
    await prisma.customerAddress.updateMany({
      where: {
        user_id: userId,
        deleted_at: null,
        is_default_billing: true,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      data: { is_default_billing: false },
    });
  }
}

export async function listAddresses(req: Request, res: Response) {
  const addresses = await prisma.customerAddress.findMany({
    where: { user_id: req.auth!.userId, deleted_at: null },
    orderBy: [{ is_default_shipping: "desc" }, { updated_at: "desc" }],
  });

  return res.json({
    addresses: addresses.map(toPublicAddress),
  });
}

export async function createAddress(req: Request, res: Response) {
  const parsed = createAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  const userId = req.auth!.userId;

  const count = await prisma.customerAddress.count({
    where: { user_id: userId, deleted_at: null },
  });

  // First address becomes default shipping + billing.
  const isDefaultShipping = count === 0 ? true : Boolean(data.is_default_shipping);
  const isDefaultBilling = count === 0 ? true : Boolean(data.is_default_billing);

  if (isDefaultShipping || isDefaultBilling) {
    await clearOtherDefaults(userId, null, {
      shipping: isDefaultShipping,
      billing: isDefaultBilling,
    });
  }

  const address = await prisma.customerAddress.create({
    data: {
      user_id: userId,
      label: data.label ?? null,
      full_name: data.full_name,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 ?? null,
      city: data.city,
      state: data.state ?? null,
      postal_code: data.postal_code,
      country: data.country ?? "BD",
      type: data.type ?? "both",
      is_default_shipping: isDefaultShipping,
      is_default_billing: isDefaultBilling,
    },
  });

  return res.status(201).json({
    message: "Address saved",
    address: toPublicAddress(address),
  });
}

export async function updateAddress(req: Request, res: Response) {
  let id: bigint;
  try {
    id = BigInt(String(req.params.id ?? ""));
  } catch {
    return res.status(400).json({ message: "Invalid address id" });
  }
  if (id <= 0n) {
    return res.status(400).json({ message: "Invalid address id" });
  }

  const parsed = updateAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.customerAddress.findFirst({
    where: {
      id,
      user_id: req.auth!.userId,
      deleted_at: null,
    },
  });

  if (!existing) {
    return res.status(404).json({ message: "Address not found" });
  }

  const data = parsed.data;
  const userId = req.auth!.userId;

  const nextShipping =
    data.is_default_shipping === undefined
      ? existing.is_default_shipping
      : data.is_default_shipping;
  const nextBilling =
    data.is_default_billing === undefined
      ? existing.is_default_billing
      : data.is_default_billing;

  if (nextShipping || nextBilling) {
    await clearOtherDefaults(userId, existing.id, {
      shipping: nextShipping,
      billing: nextBilling,
    });
  }

  const address = await prisma.customerAddress.update({
    where: { id: existing.id },
    data: {
      label: data.label === undefined ? undefined : data.label,
      full_name: data.full_name,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 === undefined ? undefined : data.line2,
      city: data.city,
      state: data.state === undefined ? undefined : data.state,
      postal_code: data.postal_code,
      country: data.country,
      type: data.type,
      is_default_shipping: data.is_default_shipping,
      is_default_billing: data.is_default_billing,
    },
  });

  return res.json({
    message: "Address updated",
    address: toPublicAddress(address),
  });
}

export async function deleteAddress(req: Request, res: Response) {
  let id: bigint;
  try {
    id = BigInt(String(req.params.id ?? ""));
  } catch {
    return res.status(400).json({ message: "Invalid address id" });
  }
  if (id <= 0n) {
    return res.status(400).json({ message: "Invalid address id" });
  }

  const existing = await prisma.customerAddress.findFirst({
    where: {
      id,
      user_id: req.auth!.userId,
      deleted_at: null,
    },
  });

  if (!existing) {
    return res.status(404).json({ message: "Address not found" });
  }

  await prisma.customerAddress.update({
    where: { id: existing.id },
    data: {
      deleted_at: new Date(),
      is_default_shipping: false,
      is_default_billing: false,
    },
  });

  // Promote another address to default if we removed a default.
  if (existing.is_default_shipping || existing.is_default_billing) {
    const next = await prisma.customerAddress.findFirst({
      where: { user_id: req.auth!.userId, deleted_at: null },
      orderBy: { updated_at: "desc" },
    });
    if (next) {
      await prisma.customerAddress.update({
        where: { id: next.id },
        data: {
          is_default_shipping:
            existing.is_default_shipping || next.is_default_shipping,
          is_default_billing:
            existing.is_default_billing || next.is_default_billing,
        },
      });
    }
  }

  return res.json({ message: "Address deleted" });
}
