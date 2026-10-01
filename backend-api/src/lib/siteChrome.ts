import { prisma } from "./prisma.js";

export const SITE_NAV_MENUS = [
  "header",
  "footer_find",
  "footer_care",
  "footer_sell",
] as const;

export type SiteNavMenu = (typeof SITE_NAV_MENUS)[number];

export const DEFAULT_HOME_SECTIONS = [
  { key: "welcome_modal", label: "Welcome modal", position: 0 },
  { key: "hero", label: "Hero banner", position: 1 },
  { key: "featured", label: "Featured section", position: 2 },
  { key: "deals_banner", label: "Deals banner", position: 3 },
  { key: "product_groups", label: "Product groups", position: 4 },
  { key: "promo_slider", label: "Promo banner slider", position: 5 },
  { key: "best_sellers", label: "Best sellers", position: 6 },
  { key: "latest_products", label: "Latest products", position: 7 },
  { key: "deals_of_day", label: "Deals of the day", position: 8 },
  { key: "laptop_repair", label: "Laptop repair banner", position: 9 },
  { key: "top_brands", label: "Top brands", position: 10 },
] as const;

export const DEFAULT_NAV_SEED: Array<{
  menu: SiteNavMenu;
  label: string;
  href: string;
  external?: boolean;
  position: number;
  children?: Array<{ label: string; href: string; position: number }>;
}> = [
  { menu: "header", label: "Home", href: "/", position: 0 },
  { menu: "header", label: "Shop", href: "/shop", position: 1 },
  { menu: "header", label: "Stores", href: "/stores", position: 2 },
  {
    menu: "header",
    label: "Pages",
    href: "#",
    position: 3,
    children: [
      { label: "FAQ", href: "/faq", position: 0 },
      { label: "Terms", href: "/terms", position: 1 },
    ],
  },
  {
    menu: "header",
    label: "Blog",
    href: "/blog",
    position: 4,
    children: [{ label: "Blog", href: "/blog", position: 0 }],
  },
  { menu: "header", label: "About Us", href: "/about", position: 5 },
  { menu: "header", label: "Contact", href: "/contact", position: 6 },

  {
    menu: "footer_find",
    label: "Laptops & Computers",
    href: "/category/laptops",
    position: 0,
  },
  {
    menu: "footer_find",
    label: "Cameras & Photography",
    href: "/category/cameras",
    position: 1,
  },
  {
    menu: "footer_find",
    label: "Smart Phones & Tablets",
    href: "/category/smartphones",
    position: 2,
  },
  {
    menu: "footer_find",
    label: "Video Games & Consoles",
    href: "/category/gaming",
    position: 3,
  },
  {
    menu: "footer_find",
    label: "TV & Audio",
    href: "/category/tv-audio",
    position: 4,
  },
  { menu: "footer_find", label: "Gadgets", href: "/category/gadgets", position: 5 },
  {
    menu: "footer_find",
    label: "Waterproof Headphones",
    href: "/category/headphones",
    position: 6,
  },
  { menu: "footer_find", label: "Quick Links", href: "/quick-links", position: 7 },

  { menu: "footer_care", label: "My Account", href: "/account", position: 0 },
  {
    menu: "footer_care",
    label: "Track Your Order",
    href: "/track-order",
    position: 1,
  },
  { menu: "footer_care", label: "Wishlist", href: "/wishlist", position: 2 },
  { menu: "footer_care", label: "Stores", href: "/stores", position: 3 },
  {
    menu: "footer_care",
    label: "Customer Service",
    href: "/customer-service",
    position: 4,
  },
  { menu: "footer_care", label: "Returns/Exchange", href: "/returns", position: 5 },
  { menu: "footer_care", label: "FAQ", href: "/faq", position: 6 },
  { menu: "footer_care", label: "Product Support", href: "/support", position: 7 },

  {
    menu: "footer_sell",
    label: "Become a Seller",
    href: "dashboard:vendor",
    external: true,
    position: 0,
  },
  {
    menu: "footer_sell",
    label: "Super Admin Login",
    href: "dashboard:super_admin",
    external: true,
    position: 1,
  },
  {
    menu: "footer_sell",
    label: "Admin Login",
    href: "dashboard:admin",
    external: true,
    position: 2,
  },
  {
    menu: "footer_sell",
    label: "Moderator Login",
    href: "dashboard:moderator",
    external: true,
    position: 3,
  },
];

export function toPublicNavItem(row: {
  id: bigint;
  menu: string;
  label: string;
  href: string;
  external: boolean;
  position: number;
  is_enabled: boolean;
  parent_id: bigint | null;
  children?: Array<{
    id: bigint;
    label: string;
    href: string;
    external: boolean;
    position: number;
    is_enabled: boolean;
  }>;
}) {
  return {
    id: row.id.toString(),
    menu: row.menu,
    label: row.label,
    href: row.href,
    external: row.external,
    position: row.position,
    is_enabled: row.is_enabled,
    parent_id: row.parent_id?.toString() ?? null,
    children: (row.children ?? [])
      .filter((c) => c.is_enabled)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: c.id.toString(),
        label: c.label,
        href: c.href,
        external: c.external,
        position: c.position,
        is_enabled: c.is_enabled,
      })),
  };
}

export function toDashboardNavItem(row: {
  id: bigint;
  menu: string;
  label: string;
  href: string;
  external: boolean;
  position: number;
  is_enabled: boolean;
  parent_id: bigint | null;
  children?: Array<{
    id: bigint;
    label: string;
    href: string;
    external: boolean;
    position: number;
    is_enabled: boolean;
    parent_id: bigint | null;
  }>;
}) {
  return {
    id: row.id.toString(),
    menu: row.menu,
    label: row.label,
    href: row.href,
    external: row.external,
    position: row.position,
    is_enabled: row.is_enabled,
    parent_id: row.parent_id?.toString() ?? null,
    children: (row.children ?? [])
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: c.id.toString(),
        menu: row.menu,
        label: c.label,
        href: c.href,
        external: c.external,
        position: c.position,
        is_enabled: c.is_enabled,
        parent_id: c.parent_id?.toString() ?? null,
        children: [] as never[],
      })),
  };
}

/** Seed nav + home sections once if empty. */
export async function ensureSiteChromeDefaults() {
  const [navCount, sectionCount] = await Promise.all([
    prisma.siteNavItem.count({ where: { settings_id: 1 } }),
    prisma.homeSection.count({ where: { settings_id: 1 } }),
  ]);

  if (navCount === 0) {
    for (const item of DEFAULT_NAV_SEED) {
      const parent = await prisma.siteNavItem.create({
        data: {
          settings_id: 1,
          menu: item.menu,
          label: item.label,
          href: item.href,
          external: item.external ?? false,
          position: item.position,
          is_enabled: true,
        },
      });
      if (item.children?.length) {
        await prisma.siteNavItem.createMany({
          data: item.children.map((child) => ({
            settings_id: 1,
            menu: item.menu,
            label: child.label,
            href: child.href,
            external: false,
            position: child.position,
            is_enabled: true,
            parent_id: parent.id,
          })),
        });
      }
    }
  }

  if (sectionCount === 0) {
    await prisma.homeSection.createMany({
      data: DEFAULT_HOME_SECTIONS.map((s) => ({
        settings_id: 1,
        key: s.key,
        label: s.label,
        position: s.position,
        is_enabled: true,
      })),
    });
  }
}

export async function loadSiteNavTree(includeDisabled = false) {
  const rows = await prisma.siteNavItem.findMany({
    where: {
      settings_id: 1,
      parent_id: null,
      ...(includeDisabled ? {} : { is_enabled: true }),
    },
    include: {
      children: {
        where: includeDisabled ? undefined : { is_enabled: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
  });
  return rows;
}

export async function loadHomeSections(includeDisabled = false) {
  return prisma.homeSection.findMany({
    where: {
      settings_id: 1,
      ...(includeDisabled ? {} : { is_enabled: true }),
    },
    orderBy: { position: "asc" },
  });
}
