import "../src/lib/env.js";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PrismaClient, type UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_IMAGES = path.resolve(
  __dirname,
  "../../frontend/public/images",
);
const UPLOADS_PRODUCTS = path.resolve(process.cwd(), "uploads", "products");

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

type DemoProduct = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  compareAt?: number;
  stock: number;
  featured?: boolean;
  image: string;
  short: string;
  description: string;
};

const CATEGORIES: Array<{
  name: string;
  slug: string;
  description: string;
  sort: number;
}> = [
  {
    name: "Electronics",
    slug: "electronics",
    description: "Phones, laptops, and everyday gadgets",
    sort: 1,
  },
  {
    name: "Cameras & Photography",
    slug: "cameras",
    description: "DSLR, mirrorless, and photography gear",
    sort: 2,
  },
  {
    name: "Laptops & Computers",
    slug: "laptops",
    description: "Notebooks, workstations, and PC parts",
    sort: 3,
  },
  {
    name: "Smart Phones & Tablets",
    slug: "smartphones",
    description: "Mobile phones and tablets",
    sort: 4,
  },
  {
    name: "Audio & Headphones",
    slug: "audio",
    description: "Wireless headphones, earbuds, and headsets",
    sort: 5,
  },
  {
    name: "Printers & Office",
    slug: "printers",
    description: "Wireless printers and office essentials",
    sort: 6,
  },
  {
    name: "Monitors & Displays",
    slug: "monitors",
    description: "Gaming and productivity displays",
    sort: 7,
  },
  {
    name: "Gaming",
    slug: "gaming",
    description: "Controllers, mice, and gaming accessories",
    sort: 8,
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Apparel, watches, and accessories",
    sort: 9,
  },
];

const BRANDS: Array<{ name: string; slug: string; description: string }> = [
  { name: "Samsung", slug: "samsung", description: "Mobile and display electronics" },
  { name: "HP", slug: "hp", description: "Computers and printers" },
  { name: "Canon", slug: "canon", description: "Cameras and imaging" },
  { name: "Sony", slug: "sony", description: "Audio and entertainment" },
  { name: "Dell", slug: "dell", description: "Laptops and workstations" },
  { name: "Apple", slug: "apple", description: "iPhone, iPad, and Mac" },
  { name: "Optoma", slug: "optoma", description: "Projectors and displays" },
  { name: "Beats", slug: "beats", description: "Premium headphones" },
  { name: "Corsair", slug: "corsair", description: "PC power and peripherals" },
  { name: "Sceptre", slug: "sceptre", description: "Monitors and TVs" },
  { name: "Microsoft", slug: "microsoft", description: "Surface devices" },
  { name: "Lenovo", slug: "lenovo", description: "ThinkPad and IdeaPad" },
  { name: "Acer", slug: "acer", description: "Chromebooks and notebooks" },
  { name: "OneOdio", slug: "oneodio", description: "Studio headphones" },
  { name: "Niyenin", slug: "niyenin", description: "Niyenin house brand" },
];

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android',
    slug: "samsung-galaxy-a7-lite",
    sku: "SAM-A7LITE-32",
    category: "smartphones",
    brand: "samsung",
    price: 15599,
    compareAt: 19199,
    stock: 48,
    featured: true,
    image: "best_seller_product (1).png",
    short: "Compact Android tablet for everyday browsing and streaming.",
    description:
      "The SAMSUNG Galaxy A7 Lite 8.7\" 32GB Android tablet is built for light work and entertainment. Enjoy a crisp display, long battery life, and room for your apps, photos, and offline media.",
  },
  {
    name: "HP DeskJet 4255e Wireless Printer",
    slug: "hp-deskjet-4255e",
    sku: "HP-DJ-4255E",
    category: "printers",
    brand: "hp",
    price: 10799,
    compareAt: 14399,
    stock: 36,
    featured: true,
    image: "best_seller_product (2).png",
    short: "Wireless all-in-one inkjet for home offices.",
    description:
      "The HP DeskJet 4255e Wireless Printer handles print, scan, and copy with easy Wi‑Fi setup. Ideal for schoolwork and home documents with reliable color output.",
  },
  {
    name: "Optoma UHZ35ST Projector",
    slug: "optoma-uhz35st",
    sku: "OPT-UHZ35ST",
    category: "monitors",
    brand: "optoma",
    price: 179880,
    compareAt: 215880,
    stock: 12,
    featured: true,
    image: "best_seller_product (3).png",
    short: "Short-throw 4K laser projector for bright rooms.",
    description:
      "The Optoma UHZ35ST Projector delivers sharp 4K visuals in a short-throw design. Perfect for home cinema setups where space is limited but picture quality matters.",
  },
  {
    name: "Canon EOS Rebel T7 DSLR Camera",
    slug: "canon-eos-rebel-t7",
    sku: "CAN-REBEL-T7",
    category: "cameras",
    brand: "canon",
    price: 57480,
    compareAt: 65880,
    stock: 22,
    featured: true,
    image: "best_seller_product (4).png",
    short: "Beginner-friendly DSLR with versatile kit lens options.",
    description:
      "The Canon EOS Rebel T7 DSLR Camera is a reliable entry into photography. Capture high-detail stills and Full HD video with intuitive controls and Canon EF lens support.",
  },
  {
    name: "Canon EOS 4000D 18MP DSLR Camera",
    slug: "canon-eos-4000d",
    sku: "CAN-4000D-18",
    category: "cameras",
    brand: "canon",
    price: 47880,
    compareAt: 53880,
    stock: 18,
    image: "Leatest Item (1).png",
    short: "Affordable 18MP DSLR for learning photography.",
    description:
      "The Canon EOS 4000D 18MP DSLR Camera helps new photographers grow skills with guided modes, solid image quality, and a lightweight body for travel and everyday shoots.",
  },
  {
    name: "Table Fan 12-Inch Oscillating Table Fan",
    slug: "table-fan-12-inch",
    sku: "FAN-TBL-12",
    category: "electronics",
    brand: "niyenin",
    price: 4199,
    compareAt: 5399,
    stock: 80,
    image: "Leatest Item (2).png",
    short: "Quiet oscillating fan for desks and bedrooms.",
    description:
      "This Table Fan 12-Inch Oscillating Table Fan keeps air moving with adjustable speed settings. Compact enough for desks, dorms, and small living spaces.",
  },
  {
    name: "Samsung Galaxy A13 LTE Cell Phone",
    slug: "samsung-galaxy-a13",
    sku: "SAM-A13-LTE",
    category: "smartphones",
    brand: "samsung",
    price: 19199,
    compareAt: 23999,
    stock: 55,
    featured: true,
    image: "Leatest Item (3).png",
    short: "Everyday LTE smartphone with a large display.",
    description:
      "The Samsung Galaxy A13 LTE Cell Phone balances battery life, camera convenience, and a spacious screen for chatting, streaming, and mobile productivity.",
  },
  {
    name: "Sceptre Curved 24 inch Gaming Monitor",
    slug: "sceptre-curved-24",
    sku: "SCE-CURV-24",
    category: "monitors",
    brand: "sceptre",
    price: 14399,
    compareAt: 17999,
    stock: 40,
    featured: true,
    image: "Leatest Item (4).png",
    short: "Immersive curved 24\" display for work and play.",
    description:
      "The Sceptre Curved 24 inch Gaming Monitor wraps your view for deeper immersion. Smooth refresh and a curved panel suit gaming sessions and multitasking.",
  },
  {
    name: "Sony WH-CH720N Wireless Headphones",
    slug: "sony-wh-ch720n",
    sku: "SON-WH-CH720N",
    category: "audio",
    brand: "sony",
    price: 15360,
    compareAt: 17999,
    stock: 60,
    featured: true,
    image: "Leatest Item (5).png",
    short: "Noise-cancelling wireless headphones with long battery life.",
    description:
      "Sony WH-CH720N Wireless Headphones combine comfortable over-ear design with noise cancelling and all-day battery for commuting, focus work, and travel.",
  },
  {
    name: "Canon G3270 Wireless Inkjet Printer",
    slug: "canon-g3270",
    sku: "CAN-G3270",
    category: "printers",
    brand: "canon",
    price: 29880,
    compareAt: 35880,
    stock: 20,
    image: "Leatest Item (6).png",
    short: "MegaTank wireless inkjet with low cost per page.",
    description:
      "The Canon G3270 Wireless Inkjet Printer uses refillable tanks for efficient home printing. Print documents and photos wirelessly with strong color fidelity.",
  },
  {
    name: "AltoPlus Amplified Corded Phone with Caller ID",
    slug: "altoplus-amplified-phone",
    sku: "ALT-CORD-CID",
    category: "electronics",
    brand: "niyenin",
    price: 5999,
    stock: 30,
    image: "Deals of The Day product right 2.png",
    short: "Loud, clear corded phone with caller ID display.",
    description:
      "The AltoPlus Amplified Corded Phone with Caller ID is designed for clear conversations. Amplified audio and a readable display make it a practical home phone.",
  },
  {
    name: "Corsair RM850x Fully Modular Power Supply",
    slug: "corsair-rm850x",
    sku: "COR-RM850X",
    category: "laptops",
    brand: "corsair",
    price: 17999,
    compareAt: 21599,
    stock: 25,
    image: "Deals of The Day product right 3.png",
    short: "850W fully modular PSU for high-performance PCs.",
    description:
      "The Corsair RM850x Fully Modular Power Supply delivers clean power with flexible cabling. Built for gaming and creator builds that need reliable wattage headroom.",
  },
  {
    name: "Dell Inspiron 15 Core i5 Workstation Laptop",
    slug: "dell-inspiron-15-i5",
    sku: "DEL-INS15-I5",
    category: "laptops",
    brand: "dell",
    price: 83880,
    compareAt: 95880,
    stock: 28,
    featured: true,
    image: "Deals of The Day product right 4.png",
    short: "Everyday Core i5 laptop for study and office work.",
    description:
      "The Dell Inspiron 15 Core i5 Workstation Laptop handles browsing, documents, and video calls with a balanced 15\" design for desks at home or school.",
  },
  {
    name: "Beats Solo3 Wireless Over-Ear Headphones",
    slug: "beats-solo3-wireless",
    sku: "BEA-SOLO3",
    category: "audio",
    brand: "beats",
    price: 17994,
    compareAt: 23994,
    stock: 45,
    featured: true,
    image: "Deals of The Day product 1.png",
    short: "Iconic on-ear wireless headphones with Fast Fuel charging.",
    description:
      "Beats Solo3 Wireless Over-Ear Headphones deliver punchy sound and Apple-friendly pairing. Carry them for workouts, commuting, and all-day listening.",
  },
  {
    name: "Microsoft Surface Pro 9",
    slug: "microsoft-surface-pro-9",
    sku: "MS-SPRO9",
    category: "smartphones",
    brand: "microsoft",
    price: 119880,
    compareAt: 131880,
    stock: 15,
    featured: true,
    image: "Deals of The Day product center 1.png",
    short: "2-in-1 tablet laptop for creatives and professionals.",
    description:
      "Microsoft Surface Pro 9 blends tablet flexibility with laptop power. Use it with Type Cover and pen for note-taking, design work, and meetings on the go.",
  },
  {
    name: "StreamCam HD Pro",
    slug: "streamcam-hd-pro",
    sku: "STR-HDPRO",
    category: "cameras",
    brand: "niyenin",
    price: 20280,
    compareAt: 23880,
    stock: 32,
    image: "Deals of The Day product center 2.png",
    short: "HD webcam built for streaming and video calls.",
    description:
      "StreamCam HD Pro captures sharp video for livestreams and remote meetings. Plug-and-play USB setup keeps your face clear in any workspace.",
  },
  {
    name: "Basilisk V3 Pro Gaming Mouse",
    slug: "basilisk-v3-pro",
    sku: "BAS-V3PRO",
    category: "gaming",
    brand: "niyenin",
    price: 19199,
    compareAt: 21599,
    stock: 38,
    image: "Deals of The Day product center 3.png",
    short: "Wireless ergonomic mouse for competitive gaming.",
    description:
      "The Basilisk V3 Pro Gaming Mouse offers precise sensors and customizable buttons. Stay comfortable through long ranked sessions and content creation.",
  },
  {
    name: "Lenovo IdeaPad Flex 5",
    slug: "lenovo-ideapad-flex-5",
    sku: "LEN-FLEX5",
    category: "laptops",
    brand: "lenovo",
    price: 77880,
    compareAt: 89880,
    stock: 24,
    featured: true,
    image: "Deals of The Day product center 4.png",
    short: "Convertible IdeaPad for school and hybrid work.",
    description:
      "Lenovo IdeaPad Flex 5 flips between laptop and tablet modes. A responsive touchscreen and solid battery make it a versatile everyday notebook.",
  },
  {
    name: "Dual Mic Gaming Earbuds",
    slug: "dual-mic-gaming-earbuds",
    sku: "EAR-DUALMIC",
    category: "audio",
    brand: "niyenin",
    price: 4799,
    compareAt: 5999,
    stock: 90,
    image: "products_group (1).png",
    short: "Lightweight earbuds with dual mics for clear chat.",
    description:
      "Dual Mic Gaming Earbuds keep your voice clear in party chat while delivering punchy game audio. Lightweight buds fit long sessions without fatigue.",
  },
  {
    name: "Studio Wireless Headset",
    slug: "studio-wireless-headset",
    sku: "HDS-STUDIO-W",
    category: "audio",
    brand: "oneodio",
    price: 9599,
    compareAt: 11999,
    stock: 42,
    image: "products_group (2).png",
    short: "Over-ear wireless headset for studio and calls.",
    description:
      "The Studio Wireless Headset balances rich audio and comfortable cushions. Use it for music mixing, Zoom calls, and daily listening.",
  },
  {
    name: "Curved 4K Display Monitor",
    slug: "curved-4k-display-monitor",
    sku: "MON-CURV-4K",
    category: "monitors",
    brand: "sceptre",
    price: 47880,
    compareAt: 53880,
    stock: 16,
    featured: true,
    image: "products_group (3).jpg",
    short: "Immersive curved 4K monitor for creators.",
    description:
      "This Curved 4K Display Monitor brings ultra-sharp detail for editing, design, and cinematic viewing. The curve reduces eye strain across wide workflows.",
  },
  {
    name: "Apple iPhone 14 Pro Max, 256GB",
    slug: "apple-iphone-14-pro-max-256",
    sku: "APL-IP14PM-256",
    category: "smartphones",
    brand: "apple",
    price: 119880,
    compareAt: 131880,
    stock: 14,
    featured: true,
    image: "bottom_banner_left_product.png",
    short: "Flagship iPhone with Pro camera system.",
    description:
      "Apple iPhone 14 Pro Max, 256GB pairs a bright ProMotion display with advanced cameras. Capture Pro-level photos and stay productive with all-day battery.",
  },
  {
    name: "Surface Laptop Touchscreen",
    slug: "surface-laptop-touchscreen",
    sku: "MS-SLAP-TS",
    category: "laptops",
    brand: "microsoft",
    price: 107880,
    compareAt: 119880,
    stock: 19,
    image: "buttom_right_product.png",
    short: "Sleek Surface laptop with responsive touchscreen.",
    description:
      "The Surface Laptop Touchscreen is a refined Windows notebook for writing, browsing, and light creative work with a premium aluminum finish.",
  },
  {
    name: "Acer Chromebook Tab 10",
    slug: "acer-chromebook-tab-10",
    sku: "ACE-CB-TAB10",
    category: "smartphones",
    brand: "acer",
    price: 39480,
    compareAt: 45480,
    stock: 21,
    image: "PromoBannerSlider_Product_1.png",
    short: "Chrome OS tablet for classrooms and light tasks.",
    description:
      "Acer Chromebook Tab 10 is built for education and simple productivity. Fast Chromebook apps, stylus support, and a durable design for daily carry.",
  },
];

function copyProductImage(sourceName: string): {
  fileName: string;
  size: number;
  mime: string;
} | null {
  const src = path.join(FRONTEND_IMAGES, sourceName);
  if (!fs.existsSync(src)) {
    console.warn(`Missing image: ${sourceName}`);
    return null;
  }

  fs.mkdirSync(UPLOADS_PRODUCTS, { recursive: true });
  const ext = path.extname(sourceName).toLowerCase() || ".png";
  const fileName = `${randomUUID()}${ext}`;
  const dest = path.join(UPLOADS_PRODUCTS, fileName);
  fs.copyFileSync(src, dest);
  const size = fs.statSync(dest).size;
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/png";
  return { fileName, size, mime };
}

async function ensureShopForVendor() {
  const vendorUser = await prisma.user.findUnique({
    where: { email: "vendor@niyenin.local" },
  });
  if (!vendorUser) return null;

  const existing = await prisma.vendor.findFirst({
    where: { user_id: vendorUser.id },
    orderBy: { id: "desc" },
  });
  if (existing) {
    return prisma.vendor.update({
      where: { id: existing.id },
      data: {
        shop_name: "Niyenin Gadgets",
        slug: "niyenin-gadgets",
        description:
          "Demo electronics store stocked with cameras, phones, audio, and more.",
        status: "active",
        deleted_at: null,
        storefront_theme: "marketplace",
        products_per_page: 24,
        featured_products_count: 6,
        show_banned_brands: true,
        product_sort: "featured_first",
      },
    });
  }

  return prisma.vendor.create({
    data: {
      user_id: vendorUser.id,
      shop_name: "Niyenin Gadgets",
      slug: "niyenin-gadgets",
      description:
        "Demo electronics store stocked with cameras, phones, audio, and more.",
      status: "active",
      storefront_theme: "marketplace",
      products_per_page: 24,
      featured_products_count: 6,
      show_banned_brands: true,
      product_sort: "featured_first",
    },
  });
}

async function seedCatalog() {
  const categoryMap = new Map<string, bigint>();
  for (const cat of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        is_active: true,
        sort_order: cat.sort,
        deleted_at: null,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        is_active: true,
        sort_order: cat.sort,
      },
    });
    categoryMap.set(cat.slug, row.id);
  }

  const brandMap = new Map<string, { id: bigint; name: string }>();
  for (const [index, brand] of BRANDS.entries()) {
    const row = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        description: brand.description,
        is_active: true,
        sort_order: index + 1,
        deleted_at: null,
      },
      create: {
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        is_active: true,
        sort_order: index + 1,
      },
    });
    brandMap.set(brand.slug, { id: row.id, name: row.name });
  }

  // Soft-delete leftover demo slug shops from older seeds.
  await prisma.vendor.updateMany({
    where: {
      OR: [{ slug: "demo-vendor-shop" }, { shop_name: "Demo Vendor Shop" }],
      deleted_at: null,
    },
    data: { status: "inactive", deleted_at: new Date() },
  });

  const shop = await ensureShopForVendor();
  const vendorId = shop?.id ?? null;

  let created = 0;
  for (const item of DEMO_PRODUCTS) {
    const categoryId = categoryMap.get(item.category);
    const brand = brandMap.get(item.brand);
    if (!categoryId || !brand) {
      console.warn(`Skip ${item.slug}: missing category/brand`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        category_id: categoryId,
        brand_id: brand.id,
        brand: brand.name,
        vendor_id: vendorId,
        type: "simple",
        price: item.price,
        compare_at_price: item.compareAt ?? null,
        stock_qty: item.stock,
        status: "active",
        is_featured: Boolean(item.featured),
        short_description: item.short,
        description: item.description,
        published_at: new Date(),
        deleted_at: null,
      },
      create: {
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        category_id: categoryId,
        brand_id: brand.id,
        brand: brand.name,
        vendor_id: vendorId,
        type: "simple",
        price: item.price,
        compare_at_price: item.compareAt ?? null,
        stock_qty: item.stock,
        status: "active",
        is_featured: Boolean(item.featured),
        short_description: item.short,
        description: item.description,
        published_at: new Date(),
      },
    });

    // Free SKU on soft-deleted variants so upsert can reclaim it.
    await prisma.productVariant.updateMany({
      where: { product_id: product.id },
      data: { sku: null, deleted_at: new Date(), is_active: false },
    });

    await prisma.productVariant.upsert({
      where: { sku: item.sku },
      update: {
        product_id: product.id,
        title: "Default",
        price: item.price,
        compare_at_price: item.compareAt ?? null,
        stock_qty: item.stock,
        is_default: true,
        is_active: true,
        deleted_at: null,
        position: 0,
      },
      create: {
        product_id: product.id,
        sku: item.sku,
        title: "Default",
        price: item.price,
        compare_at_price: item.compareAt ?? null,
        stock_qty: item.stock,
        is_default: true,
        is_active: true,
        position: 0,
      },
    });

    // Attach / refresh thumbnail from frontend demo image.
    const copied = copyProductImage(item.image);
    if (copied) {
      if (product.thumbnail_id) {
        const old = await prisma.media.findUnique({
          where: { id: product.thumbnail_id },
        });
        if (old) {
          const oldPath = path.join(UPLOADS_PRODUCTS, old.file_name);
          try {
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          } catch {
            /* ignore */
          }
          await prisma.product.update({
            where: { id: product.id },
            data: { thumbnail_id: null },
          });
          await prisma.media.delete({ where: { id: old.id } }).catch(() => undefined);
        }
      }

      const media = await prisma.media.create({
        data: {
          disk: "public",
          file_name: copied.fileName,
          original_name: item.image.slice(0, 255),
          file_path: "products",
          file_size: BigInt(copied.size),
          mime_type: copied.mime,
          alt_text: item.name.slice(0, 255),
          collection_name: "product_images",
          is_public: true,
          mediable_type: "Product",
          mediable_id: product.id,
          sort_order: 0,
        },
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { thumbnail_id: media.id },
      });
    }

    created += 1;
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${BRANDS.length} brands, ${created} demo products` +
      (shop ? ` under store ${shop.slug}` : " (no vendor shop)"),
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
