import "../src/lib/env.js";
import { PrismaClient, type UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const staff: Array<{
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
}> = [
  {
    first_name: "Super",
    last_name: "Admin",
    username: "superadmin",
    email: "superadmin@niyenin.local",
    phone: "+8801700000001",
    role: "super_admin",
    password: "SuperAdmin123!",
  },
  {
    first_name: "Site",
    last_name: "Admin",
    username: "admin",
    email: "admin@niyenin.local",
    phone: "+8801700000002",
    role: "admin",
    password: "Admin123!",
  },
  {
    first_name: "Mod",
    last_name: "Erator",
    username: "moderator",
    email: "moderator@niyenin.local",
    phone: "+8801700000003",
    role: "moderator",
    password: "Moderator123!",
  },
  {
    first_name: "Store",
    last_name: "Vendor",
    username: "vendor",
    email: "vendor@niyenin.local",
    phone: "+8801700000004",
    role: "vendor",
    password: "Vendor123!",
  },
];

async function seedCatalog() {
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: { name: "Electronics", is_active: true, sort_order: 1 },
    create: {
      name: "Electronics",
      slug: "electronics",
      description: "Phones, laptops, and gadgets",
      is_active: true,
      sort_order: 1,
    },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: "fashion" },
    update: { name: "Fashion", is_active: true, sort_order: 2 },
    create: {
      name: "Fashion",
      slug: "fashion",
      description: "Apparel and accessories",
      is_active: true,
      sort_order: 2,
    },
  });

  // Catalog products stay unattached until a real vendor shop is created.
  // Do not seed a demo shop — shops are created from the dashboard.
  const vendorId: bigint | null = null;

  // Soft-delete any leftover demo shop from older seeds.
  await prisma.vendor.updateMany({
    where: {
      OR: [
        { slug: "demo-vendor-shop" },
        { shop_name: "Demo Vendor Shop" },
      ],
      deleted_at: null,
    },
    data: {
      status: "inactive",
      deleted_at: new Date(),
    },
  });

  const simple = await prisma.product.upsert({
    where: { slug: "wireless-earbuds-pro" },
    update: {
      name: "Wireless Earbuds Pro",
      category_id: electronics.id,
      vendor_id: vendorId,
      type: "simple",
      price: 3499.0,
      compare_at_price: 4499.0,
      stock_qty: 120,
      status: "active",
      is_featured: true,
      brand: "Niyenin",
      short_description: "Noise-cancelling wireless earbuds",
      published_at: new Date(),
      deleted_at: null,
    },
    create: {
      name: "Wireless Earbuds Pro",
      slug: "wireless-earbuds-pro",
      sku: "EAR-PRO-001",
      category_id: electronics.id,
      vendor_id: vendorId,
      type: "simple",
      price: 3499.0,
      compare_at_price: 4499.0,
      stock_qty: 120,
      status: "active",
      is_featured: true,
      brand: "Niyenin",
      short_description: "Noise-cancelling wireless earbuds",
      published_at: new Date(),
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "EAR-PRO-001" },
    update: {
      product_id: simple.id,
      title: "Default",
      price: 3499.0,
      stock_qty: 120,
      is_default: true,
      is_active: true,
      deleted_at: null,
    },
    create: {
      product_id: simple.id,
      sku: "EAR-PRO-001",
      title: "Default",
      price: 3499.0,
      stock_qty: 120,
      is_default: true,
      is_active: true,
    },
  });

  const tee = await prisma.product.upsert({
    where: { slug: "classic-cotton-tee" },
    update: {
      name: "Classic Cotton Tee",
      category_id: fashion.id,
      vendor_id: vendorId,
      type: "variable",
      price: 899.0,
      stock_qty: 0,
      status: "active",
      brand: "Niyenin Basics",
      short_description: "Soft cotton tee with size and color options",
      published_at: new Date(),
      deleted_at: null,
    },
    create: {
      name: "Classic Cotton Tee",
      slug: "classic-cotton-tee",
      sku: "TEE-CLASSIC",
      category_id: fashion.id,
      vendor_id: vendorId,
      type: "variable",
      price: 899.0,
      stock_qty: 0,
      status: "active",
      brand: "Niyenin Basics",
      short_description: "Soft cotton tee with size and color options",
      published_at: new Date(),
    },
  });

  const colorOption = await prisma.productOption.upsert({
    where: { product_id_name: { product_id: tee.id, name: "Color" } },
    update: { position: 0 },
    create: { product_id: tee.id, name: "Color", position: 0 },
  });

  const sizeOption = await prisma.productOption.upsert({
    where: { product_id_name: { product_id: tee.id, name: "Size" } },
    update: { position: 1 },
    create: { product_id: tee.id, name: "Size", position: 1 },
  });

  const black = await prisma.productOptionValue.upsert({
    where: { option_id_value: { option_id: colorOption.id, value: "Black" } },
    update: { color_hex: "#111111", position: 0 },
    create: {
      option_id: colorOption.id,
      value: "Black",
      color_hex: "#111111",
      position: 0,
    },
  });

  const white = await prisma.productOptionValue.upsert({
    where: { option_id_value: { option_id: colorOption.id, value: "White" } },
    update: { color_hex: "#FFFFFF", position: 1 },
    create: {
      option_id: colorOption.id,
      value: "White",
      color_hex: "#FFFFFF",
      position: 1,
    },
  });

  const sizeM = await prisma.productOptionValue.upsert({
    where: { option_id_value: { option_id: sizeOption.id, value: "M" } },
    update: { position: 0 },
    create: { option_id: sizeOption.id, value: "M", position: 0 },
  });

  const sizeL = await prisma.productOptionValue.upsert({
    where: { option_id_value: { option_id: sizeOption.id, value: "L" } },
    update: { position: 1 },
    create: { option_id: sizeOption.id, value: "L", position: 1 },
  });

  const combos: Array<{
    sku: string;
    title: string;
    values: Array<{ id: bigint }>;
    stock: number;
    isDefault?: boolean;
  }> = [
    {
      sku: "TEE-CLASSIC-BLK-M",
      title: "Black / M",
      values: [black, sizeM],
      stock: 25,
      isDefault: true,
    },
    {
      sku: "TEE-CLASSIC-BLK-L",
      title: "Black / L",
      values: [black, sizeL],
      stock: 18,
    },
    {
      sku: "TEE-CLASSIC-WHT-M",
      title: "White / M",
      values: [white, sizeM],
      stock: 22,
    },
    {
      sku: "TEE-CLASSIC-WHT-L",
      title: "White / L",
      values: [white, sizeL],
      stock: 15,
    },
  ];

  for (const [index, combo] of combos.entries()) {
    const variant = await prisma.productVariant.upsert({
      where: { sku: combo.sku },
      update: {
        product_id: tee.id,
        title: combo.title,
        price: 899.0,
        stock_qty: combo.stock,
        is_default: Boolean(combo.isDefault),
        is_active: true,
        position: index,
        deleted_at: null,
      },
      create: {
        product_id: tee.id,
        sku: combo.sku,
        title: combo.title,
        price: 899.0,
        stock_qty: combo.stock,
        is_default: Boolean(combo.isDefault),
        is_active: true,
        position: index,
      },
    });

    for (const value of combo.values) {
      await prisma.productVariantOption.upsert({
        where: {
          variant_id_option_value_id: {
            variant_id: variant.id,
            option_value_id: value.id,
          },
        },
        update: {},
        create: {
          variant_id: variant.id,
          option_value_id: value.id,
        },
      });
    }
  }

  console.log(
    `Seeded categories: ${electronics.slug}, ${fashion.slug}; products: ${simple.slug}, ${tee.slug}`,
  );
}

async function main() {
  for (const account of staff) {
    const password = await hashPassword(account.password);
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        first_name: account.first_name,
        last_name: account.last_name,
        username: account.username,
        phone: account.phone,
        role: account.role,
        password,
        status: "active",
        deleted_at: null,
      },
      create: {
        first_name: account.first_name,
        last_name: account.last_name,
        username: account.username,
        email: account.email,
        phone: account.phone,
        role: account.role,
        password,
        status: "active",
      },
    });
    console.log(
      `Seeded ${account.role}: ${account.username} / ${account.email} / ${account.phone}`,
    );
  }

  await seedCatalog();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
