/** Fallback CMS shapes matching seeded backend defaults (storefront SSR). */

export type WelcomeModalContent = {
  badge_label: string;
  eyebrow: string;
  headline_before: string;
  discount_percent: number;
  headline_after: string;
  body: string;
  cta_label: string;
  cta_href: string;
  dismiss_label: string;
  countdown_seconds: number;
  product_image: string;
  bg_image: string;
};

export const DEFAULT_WELCOME_MODAL: WelcomeModalContent = {
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
};

export type FeaturedItem = {
  title: string;
  description: string;
  icon: string;
  alt: string;
};

export type FeaturedContent = { items: FeaturedItem[] };

export const DEFAULT_FEATURED: FeaturedContent = {
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
};

export type DealsBannerCard = {
  title_top: string;
  title_bottom: string;
  discount_percent: number;
  image: string;
  alt: string;
  href: string;
  cta_label: string;
};

export type DealsBannerContent = { cards: DealsBannerCard[] };

export const DEFAULT_DEALS_BANNER: DealsBannerContent = {
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
};

export type LaptopRepairContent = {
  badge_label: string;
  headline_line1: string;
  headline_line2: string;
  subtext: string;
  offer_percent: number;
  offer_label: string;
  cta_label: string;
  cta_href: string;
  bg_image: string;
  product_image: string;
};

export const DEFAULT_LAPTOP_REPAIR: LaptopRepairContent = {
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
};

export type TopBrandItem = {
  name: string;
  href: string;
  image: string | null;
};

export type TopBrandsContent = {
  title: string;
  see_all_label: string;
  see_all_href: string;
  brands: TopBrandItem[];
};

export const DEFAULT_TOP_BRANDS: TopBrandsContent = {
  title: "Top Brands",
  see_all_label: "See All Brands",
  see_all_href: "/brands",
  brands: [
    { name: "Apple", href: "/shop?brand=apple", image: "/images/apple.png" },
    { name: "Microsoft", href: "/shop?brand=microsoft", image: null },
    { name: "HP", href: "/shop?brand=hp", image: null },
    { name: "ASUS", href: "/shop?brand=asus", image: null },
    { name: "DELL", href: "/shop?brand=dell", image: null },
    { name: "Lenovo", href: "/shop?brand=lenovo", image: null },
    { name: "Acer", href: "/shop?brand=acer", image: null },
  ],
};

export type PromoSlideContent = {
  price: string;
  tagline: string;
  highlight_text: string;
  sub_highlight: string;
  category_tag: string;
  title_line1: string;
  title_line2: string;
  cta_label: string;
  cta_href: string;
  image: string;
  image_alt: string;
};

export type PromoSliderContent = {
  bg_image: string;
  autoplay_ms: number;
  slides: PromoSlideContent[];
};

export const DEFAULT_PROMO_SLIDER: PromoSliderContent = {
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
};

export type BestSellersContent = {
  title: string;
  promo_badge: string;
  promo_headline: string;
  promo_discount_percent: number;
  promo_cta_label: string;
  promo_cta_href: string;
  promo_image: string;
  product_sort: string;
  product_limit: number;
};

export const DEFAULT_BEST_SELLERS: BestSellersContent = {
  title: "Best Sellers",
  promo_badge: "Hot Deal",
  promo_headline: "Engine Parts Collection",
  promo_discount_percent: 70,
  promo_cta_label: "Shop Now",
  promo_cta_href: "/shop",
  promo_image: "/images/best_seller_product_banner_poset_image.png",
  product_sort: "newest",
  product_limit: 8,
};

export type LatestProductsContent = {
  title: string;
  sidebar_title: string;
  product_sort: string;
  product_limit: number;
  sidebar_limit: number;
};

export const DEFAULT_LATEST_PRODUCTS: LatestProductsContent = {
  title: "Best Seller Product",
  sidebar_title: "Latest Items",
  product_sort: "newest",
  product_limit: 8,
  sidebar_limit: 6,
};

export type DealsOfDayCenterSlide = {
  brand: string;
  title: string;
  subtitle: string;
  price: number;
  original_price: number;
  discount_percent: number;
  rating: number;
  main_image: string;
  thumb_image: string;
  alt: string;
  href: string;
};

export type DealsOfDayRightSlide = {
  name: string;
  price: number;
  original_price: number;
  discount_percent: number;
  rating: number;
  available: number;
  sold_out: number;
  main_image: string;
  thumb_image: string;
  alt: string;
  href: string;
};

export type DealsOfDayContent = {
  title: string;
  left_badge: string;
  left_headline: string;
  left_cta_label: string;
  left_cta_href: string;
  left_image: string;
  left_bg: string;
  autoplay_ms: number;
  deal_ends_at: string;
  center_slides: DealsOfDayCenterSlide[];
  right_slides: DealsOfDayRightSlide[];
};

export const DEFAULT_DEALS_OF_DAY: DealsOfDayContent = {
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
};

export type ProductGroupsContent = {
  title: string;
  note?: string;
};

export const DEFAULT_PRODUCT_GROUPS: ProductGroupsContent = {
  title: "Product groups",
};
