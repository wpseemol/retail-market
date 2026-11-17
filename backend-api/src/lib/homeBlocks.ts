import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Keys that store CMS JSON (hero stays on home_hero_banners). */
export const HOME_BLOCK_KEYS = [
  "welcome_modal",
  "featured",
  "deals_banner",
  "product_groups",
  "promo_slider",
  "best_sellers",
  "latest_products",
  "deals_of_day",
  "laptop_repair",
  "top_brands",
] as const;

export type HomeBlockKey = (typeof HOME_BLOCK_KEYS)[number];

const LEGACY_PROMO_IMAGE = "/images/PromoBannerSlider_Product_1.png";

/**
 * Older seeds reused one product PNG on every slide and `/shop?product=…` links.
 * - Same legacy image on every slide → replace with distinct default slides.
 * - Otherwise only rewrite `/shop?product=slug` → `/shop/slug` (keep custom copy/images).
 */
export async function repairLegacyPromoSliderContent() {
  const row = await prisma.homeBlockContent.findUnique({
    where: { key: "promo_slider" },
  });
  if (!row?.content || typeof row.content !== "object" || Array.isArray(row.content)) {
    return;
  }
  const content = row.content as {
    bg_image?: string;
    autoplay_ms?: number;
    slides?: Array<Record<string, unknown>>;
  };
  const slides = content.slides;
  if (!Array.isArray(slides) || slides.length < 2) return;

  const PLACEHOLDER_IMAGES = new Set([
    LEGACY_PROMO_IMAGE,
    "/images/top_products (4).png",
    "/images/Deals of The Day left product image.png",
  ]);
  const usesPlaceholders = slides.some(
    (s) => typeof s.image === "string" && PLACEHOLDER_IMAGES.has(s.image),
  );
  const allSameLegacyImage = slides.every((s) => s.image === LEGACY_PROMO_IMAGE);
  if (allSameLegacyImage || usesPlaceholders) {
    await prisma.homeBlockContent.update({
      where: { key: "promo_slider" },
      data: { content: DEFAULT_HOME_BLOCKS.promo_slider },
    });
    return;
  }

  let changed = false;
  const nextSlides = slides.map((slide) => {
    const href = typeof slide.cta_href === "string" ? slide.cta_href : "";
    const match = href.match(/^\/shop\/?\?product=([^&/#]+)/i);
    if (!match?.[1]) return slide;
    changed = true;
    let slug = match[1];
    try {
      slug = decodeURIComponent(match[1]);
    } catch {
      /* keep raw */
    }
    return { ...slide, cta_href: `/shop/${slug}` };
  });
  if (!changed) return;

  await prisma.homeBlockContent.update({
    where: { key: "promo_slider" },
    data: {
      content: {
        ...content,
        slides: nextSlides,
      } as Prisma.InputJsonValue,
    },
  });
}

export const DEFAULT_HOME_BLOCKS: Record<
  HomeBlockKey,
  Prisma.InputJsonValue
> = {
  welcome_modal: {
    badge_label: "Limited Offer",
    eyebrow: "Don't Miss Out",
    headline_before: "Get Up To",
    discount_percent: 70,
    headline_after: "Off Digital Cameras",
    body: "Flash deal ends when the timer hits zero. Shop now before this offer disappears.",
    cta_label: "Shop Now",
    cta_href: "/shop?category=cameras",
    dismiss_label: "No thanks, close",
    countdown_seconds: 30,
    product_image: "/images/camera.png",
    bg_image: "/images/hero_bg_06 1.png",
  },
  featured: {
    items: [
      {
        title: "Free Shipping",
        description: "Free shipping on all your order",
        icon: "/icons/featured_delivery-truck 1.svg",
        alt: "Delivery Truck Icon",
      },
      {
        title: "Customer Support 24/7",
        description: "Instant access to Support",
        icon: "/icons/featured_Group.svg",
        alt: "Headset Support Icon",
      },
      {
        title: "100% Secure Payment",
        description: "We ensure your money is safe",
        icon: "/icons/featured_Group-1.svg",
        alt: "Secure Bag Icon",
      },
      {
        title: "Money-Back Guarantee",
        description: "30 Days Money-Back Guarantee",
        icon: "/icons/featured_Group-2.svg",
        alt: "Guarantee Package Box Icon",
      },
    ],
  },
  deals_banner: {
    cards: [
      {
        title_top: "BREAK DISC",
        title_bottom: "DEALS ON THIS",
        discount_percent: 70,
        image: "/images/products_group (1).jpg",
        alt: "Convertible Laptop Deal",
        href: "/shop?category=laptops",
        cta_label: "Shop Now",
      },
      {
        title_top: "BREAK DISC",
        title_bottom: "DEALS ON THIS",
        discount_percent: 70,
        image: "/images/top_products (2).png",
        alt: "Headphones and Smartphone Deal",
        href: "/shop?category=audio",
        cta_label: "Shop Now",
      },
      {
        title_top: "BREAK DISC",
        title_bottom: "DEALS ON THIS",
        discount_percent: 70,
        image: "/images/top_products (3).png",
        alt: "Tablet Device Deal",
        href: "/shop?category=tablets",
        cta_label: "Shop Now",
      },
      {
        title_top: "BREAK DISC",
        title_bottom: "DEALS ON THIS",
        discount_percent: 70,
        image: "/images/top_products (4).png",
        alt: "Curved Smart TV Deal",
        href: "/shop?category=televisions",
        cta_label: "Shop Now",
      },
    ],
  },
  product_groups: {
    title: "Product groups",
    note: "Layout chrome — product tiles still use section defaults until catalog sources are wired.",
  },
  promo_slider: {
    bg_image: "/images/PromoBannerSlider_bg.png",
    autoplay_ms: 4500,
    slides: [
      {
        price: "৳23,640",
        tagline: "ALL-NEW-SPORT",
        highlight_text: "5K",
        sub_highlight: "STARTING AT",
        category_tag: "OS Tablet",
        title_line1: "Acer Chromebook Tab",
        title_line2: "10 Is Official",
        cta_label: "SHOP NOW",
        cta_href: "/shop/acer-chromebook-tab-10",
        image: "/images/PromoBannerSlider_Product_1.png",
        image_alt: "Acer Chromebook Tab 10",
      },
      {
        price: "৳35,999",
        tagline: "PRO WORKSPACE",
        highlight_text: "4K",
        sub_highlight: "STARTING AT",
        category_tag: "IPS Monitor",
        title_line1: "Curved UltraWide",
        title_line2: "Display Edition",
        cta_label: "EXPLORE DEALS",
        cta_href: "/shop/curved-ultrawide-display",
        image: "/images/PromoBannerSlider_Product_2.png",
        image_alt: "Curved UltraWide Monitor",
      },
      {
        price: "৳54,000",
        tagline: "ULTRA POWER",
        highlight_text: "12th",
        sub_highlight: "GEN INTEL",
        category_tag: "Touch Laptop",
        title_line1: "Convertible Yoga",
        title_line2: "Slim Pro Series",
        cta_label: "VIEW PRODUCT",
        cta_href: "/shop/yoga-slim-pro",
        image: "/images/PromoBannerSlider_Product_3.png",
        image_alt: "Convertible Yoga Slim Pro",
      },
    ],
  },
  best_sellers: {
    title: "Best Sellers",
    promo_badge: "Hot Deal",
    promo_headline: "Engine Parts Collection",
    promo_discount_percent: 70,
    promo_cta_label: "Shop Now",
    promo_cta_href: "/shop",
    promo_image: "/images/best_seller_product_banner_poset_image.png",
    product_sort: "newest",
    product_limit: 8,
  },
  latest_products: {
    title: "Best Seller Product",
    sidebar_title: "Latest Items",
    product_sort: "newest",
    product_limit: 8,
    sidebar_limit: 6,
  },
  deals_of_day: {
    title: "Deals of the Day",
    left_badge: "GET SAVE 30% OFF",
    left_headline: "General Motors Buick Sonic Engine",
    left_cta_label: "SHOP NOW",
    left_cta_href: "/shop",
    left_image: "/images/deals/left-product-v2.webp",
    left_bg: "/images/Deals of The Day_left_bg.jpg",
    autoplay_ms: 4500,
    deal_ends_at: "2026-12-31T23:59:59.000Z",
    center_slides: [
      {
        brand: "Microsoft Surface",
        title: "Surface Pro 9",
        subtitle: "Laptop Power, Tablet Flexibility",
        price: 19200,
        original_price: 24000,
        discount_percent: 20,
        rating: 3,
        main_image: "/images/deals/center-main-1-v2.webp",
        thumb_image: "/images/deals/center-thumb-1-v2.webp",
        alt: "Surface Pro 9 Convertible Laptop",
        href: "/shop",
      },
      {
        brand: "Logitech Vision",
        title: "StreamCam HD Pro",
        subtitle: "Ultra 1080p 60FPS Video Streaming",
        price: 11880,
        original_price: 15480,
        discount_percent: 23,
        rating: 4,
        main_image: "/images/deals/center-main-2-v2.webp",
        thumb_image: "/images/deals/center-thumb-2-v2.webp",
        alt: "Logitech StreamCam 1080p",
        href: "/shop",
      },
      {
        brand: "Razer Gaming",
        title: "Basilisk V3 Pro",
        subtitle: "Customizable Ergonomic Gaming Mouse",
        price: 8280,
        original_price: 10680,
        discount_percent: 22,
        rating: 5,
        main_image: "/images/deals/center-main-3-v2.webp",
        thumb_image: "/images/deals/center-thumb-3-v2.webp",
        alt: "Razer Basilisk Gaming Mouse",
        href: "/shop",
      },
      {
        brand: "Lenovo IdeaPad",
        title: "IdeaPad Flex 5",
        subtitle: "2-in-1 Touchscreen Laptop Mode",
        price: 59880,
        original_price: 71880,
        discount_percent: 17,
        rating: 4,
        main_image: "/images/deals/center-main-4-v2.webp",
        thumb_image: "/images/deals/center-thumb-4-v2.webp",
        alt: "Lenovo Flex 2-in-1 Laptop",
        href: "/shop",
      },
    ],
    right_slides: [
      {
        name: "AltoPlus Amplified Corded Phone with Caller ID",
        price: 17640,
        original_price: 18000,
        discount_percent: 20,
        rating: 3,
        available: 334,
        sold_out: 180,
        main_image: "/images/deals/right-main-1-v2.webp",
        thumb_image: "/images/deals/right-thumb-1-v2.webp",
        alt: "AltoPlus Amplified Desk Phone",
        href: "/shop",
      },
      {
        name: "Corsair RM850x Fully Modular Power Supply",
        price: 16680,
        original_price: 20280,
        discount_percent: 18,
        rating: 4,
        available: 120,
        sold_out: 240,
        main_image: "/images/deals/right-main-2-v2.webp",
        thumb_image: "/images/deals/right-thumb-2-v2.webp",
        alt: "Corsair Desktop Power Supply Unit",
        href: "/shop",
      },
      {
        name: "Dell Inspiron 15 Core i5 Workstation Laptop",
        price: 62400,
        original_price: 78000,
        discount_percent: 20,
        rating: 4,
        available: 95,
        sold_out: 110,
        main_image: "/images/deals/right-main-3-v2.webp",
        thumb_image: "/images/deals/right-thumb-3-v2.webp",
        alt: "Dell Inspiron Business Laptop",
        href: "/shop",
      },
      {
        name: "Beats Solo3 Wireless Over-Ear Headphones",
        price: 19080,
        original_price: 23880,
        discount_percent: 20,
        rating: 5,
        available: 210,
        sold_out: 320,
        main_image: "/images/deals/right-main-4-v2.webp",
        thumb_image: "/images/deals/right-thumb-4-v2.webp",
        alt: "Beats Solo3 Red Headphones",
        href: "/shop",
      },
    ],
  },
  laptop_repair: {
    badge_label: "Expert Mechanic",
    headline_line1: "Repair Laptop Perfectly",
    headline_line2: "From Expertist",
    subtext: "Sumptuous, filling, and temptingly",
    offer_percent: 30,
    offer_label: "offer",
    cta_label: "MAKE ENQUIRY",
    cta_href: "/contact?service=laptop-repair",
    bg_image: "/images/ad_promation_bg_bottom.jpg",
    product_image: "/images/ad_promation_product_imagesjpg.png",
  },
  top_brands: {
    title: "Top Brands",
    see_all_label: "See All Brands",
    see_all_href: "/brands",
    brands: [
      {
        name: "Apple",
        href: "/shop?brand=apple",
        image: "/images/apple.png",
      },
      { name: "Microsoft", href: "/shop?brand=microsoft", image: null },
      { name: "HP", href: "/shop?brand=hp", image: null },
      { name: "ASUS", href: "/shop?brand=asus", image: null },
      { name: "DELL", href: "/shop?brand=dell", image: null },
      { name: "Lenovo", href: "/shop?brand=lenovo", image: null },
      { name: "Acer", href: "/shop?brand=acer", image: null },
    ],
  },
};

/** Older deals_of_day only had left promo + product_sort — upgrade to slide carousels. */
export async function repairLegacyDealsOfDayContent() {
  const row = await prisma.homeBlockContent.findUnique({
    where: { key: "deals_of_day" },
  });
  if (!row?.content || typeof row.content !== "object" || Array.isArray(row.content)) {
    return;
  }
  const content = row.content as Record<string, unknown>;
  const hasCenter =
    Array.isArray(content.center_slides) && content.center_slides.length > 0;
  const hasRight =
    Array.isArray(content.right_slides) && content.right_slides.length > 0;
  const blob = JSON.stringify(content);
  const usesLegacyArt =
    blob.includes("/images/Deals of The Day") ||
    /\/images\/deals\/[a-z0-9-]+\.webp/.test(blob) &&
      !blob.includes("-v2.webp");
  if (
    hasCenter &&
    hasRight &&
    typeof content.autoplay_ms === "number" &&
    !usesLegacyArt
  ) {
    return;
  }

  await prisma.homeBlockContent.update({
    where: { key: "deals_of_day" },
    data: { content: DEFAULT_HOME_BLOCKS.deals_of_day },
  });
}
