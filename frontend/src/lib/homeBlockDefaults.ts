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
      cta_href: "/shop?product=acer-chromebook-tab-10",
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
      cta_href: "/shop?product=curved-display-edition",
      image: "/images/PromoBannerSlider_Product_1.png",
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
      cta_href: "/shop?product=yoga-slim-pro",
      image: "/images/PromoBannerSlider_Product_1.png",
      image_alt: "Convertible Touch Laptop",
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

export type DealsOfDayContent = {
  title: string;
  left_badge: string;
  left_headline: string;
  left_cta_label: string;
  left_cta_href: string;
  left_image: string;
  left_bg: string;
  product_sort: string;
  product_limit: number;
};

export const DEFAULT_DEALS_OF_DAY: DealsOfDayContent = {
  title: "Deals of the Day",
  left_badge: "Special Offer",
  left_headline: "Save Big Today",
  left_cta_label: "Shop Now",
  left_cta_href: "/shop",
  left_image: "/images/Deals of The Day left product image.png",
  left_bg: "/images/Deals of The Day_left_bg.jpg",
  product_sort: "newest",
  product_limit: 4,
};

export type ProductGroupsContent = {
  title: string;
  note?: string;
};

export const DEFAULT_PRODUCT_GROUPS: ProductGroupsContent = {
  title: "Product groups",
};
