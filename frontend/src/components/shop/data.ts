import type {
    ProductQuestion,
    ProductReview,
    ProductSpecSection,
    ShopProduct,
} from "./types";

export const PRICE_RANGE = { min: 1200, max: 13200 } as const;

export const SHOP_COLORS = [
    { id: "green", value: "#00B207", label: "Green" },
    { id: "red", value: "#EA4B48", label: "Red" },
    { id: "blue", value: "#2388FF", label: "Blue" },
    { id: "orange", value: "#FF8A00", label: "Orange" },
    { id: "black", value: "#1A1A1A", label: "Black" },
    { id: "yellow", value: "#FFC107", label: "Yellow" },
    { id: "purple", value: "#7B61FF", label: "Purple" },
    { id: "pink", value: "#FF6B9D", label: "Pink" },
] as const;

export const SHOP_CATEGORIES = [
    { id: "laptops", label: "Laptops", count: 12 },
    { id: "desktop", label: "Desktop and Server", count: 8 },
    { id: "gaming", label: "Gaming", count: 15 },
    { id: "monitor", label: "Monitor", count: 9 },
    { id: "tablet", label: "Tablet PC", count: 11 },
    { id: "printer", label: "Printer", count: 6 },
    { id: "camera", label: "Camera", count: 10 },
] as const;

export const SHOP_BRANDS = [
    { id: "samsung", label: "Samsung", count: 14 },
    { id: "apple", label: "Apple", count: 9 },
    { id: "dell", label: "Dell", count: 11 },
    { id: "lenovo", label: "Lenovo", count: 8 },
    { id: "msi", label: "MSI", count: 7 },
    { id: "asus", label: "Asus", count: 10 },
] as const;

export const SHOP_TAGS = [
    "Symphony",
    "Nokia",
    "Oppo",
    "Landing Page",
    "Samsung",
    "iPhone 13 Pro Max",
    "Huawei",
    "iPhone 12",
    "Laptop",
    "Headphone",
] as const;

export const SORT_OPTIONS = [
    { value: "default", label: "Default Sorting" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "name-asc", label: "Name: A to Z" },
    { value: "rating-desc", label: "Average Rating" },
] as const;

export const PRODUCTS_PER_PAGE = 12;

export const shopProducts: ShopProduct[] = [
    {
        id: 1,

        slug: "product-1",
        name: 'SAMSUNG Galaxy A7 Lite 8.7" 32GB Android Tablet',
        image: "/images/best_seller_product (1).png",
        alt: "Samsung Galaxy A7 Lite Tablet",
        rating: 4,
        reviewCount: 230,
        priceMin: 3662,
        priceMax: 4862,
        available: 994,
        isNew: true,
        category: "tablet",
        brand: "samsung",
        colors: ["black", "blue"],
        tags: ["Samsung", "Landing Page"],
    },
    {
        id: 2,

        slug: "product-2",
        name: "All-in-One Desktop PC with UltraWide Display",
        image: "/images/Best Seller Product anather (1).png",
        alt: "All-in-One Desktop PC",
        rating: 5,
        reviewCount: 182,
        priceMin: 4742,
        priceMax: 5942,
        available: 354,
        isNew: true,
        category: "desktop",
        brand: "dell",
        colors: ["black", "silver"],
        tags: ["Laptop", "Landing Page"],
    },
    {
        id: 3,

        slug: "product-3",
        name: "HP DeskJet 4255e Wireless All-in-One Printer",
        image: "/images/best_seller_product (2).png",
        alt: "HP DeskJet Wireless Printer",
        rating: 4,
        reviewCount: 96,
        priceMin: 5400,
        priceMax: 6600,
        available: 210,
        isNew: true,
        category: "printer",
        brand: "dell",
        colors: ["black", "white"],
        tags: ["Laptop", "Landing Page"],
    },
    {
        id: 4,

        slug: "product-4",
        name: "Optoma UHZ35ST Ultra Short Throw 4K Projector",
        image: "/images/best_seller_product (3).png",
        alt: "Optoma UHZ35ST Projector",
        rating: 4,
        reviewCount: 64,
        priceMin: 6240,
        priceMax: 8160,
        available: 88,
        isNew: true,
        category: "monitor",
        brand: "asus",
        colors: ["black"],
        tags: ["Headphone"],
    },
    {
        id: 5,

        slug: "product-5",
        name: "Canon EOS Rebel T7 DSLR Camera with Lens Kit",
        image: "/images/best_seller_product (4).png",
        alt: "Canon EOS Rebel T7 Camera",
        rating: 5,
        reviewCount: 311,
        priceMin: 5820,
        priceMax: 7440,
        available: 142,
        isNew: true,
        category: "camera",
        brand: "apple",
        colors: ["black", "red"],
        tags: ["Nokia", "Camera"],
    },
    {
        id: 6,

        slug: "product-6",
        name: "Microsoft Surface Laptop Touchscreen 13.5 Inch",
        image: "/images/Deals of The Day product center 1.png",
        alt: "Microsoft Surface Laptop",
        rating: 4,
        reviewCount: 148,
        priceMin: 9000,
        priceMax: 11400,
        available: 67,
        isNew: true,
        category: "laptops",
        brand: "dell",
        colors: ["silver", "black"],
        tags: ["Laptop", "Huawei"],
    },
    {
        id: 7,

        slug: "product-7",
        name: "OneOdio Wired Over-Ear Studio Headphones",
        image: "/images/Leatest Item (5).png",
        alt: "OneOdio Wired Headphones",
        rating: 3,
        reviewCount: 55,
        priceMin: 2640,
        priceMax: 3840,
        available: 420,
        isNew: true,
        category: "gaming",
        brand: "msi",
        colors: ["red", "black"],
        tags: ["Headphone", "Oppo"],
    },
    {
        id: 8,

        slug: "product-8",
        name: "Apple iPhone 14 Pro Max 256GB Unlocked",
        image: "/images/Leatest Item (3).png",
        alt: "Apple iPhone 14 Pro Max",
        rating: 5,
        reviewCount: 502,
        priceMin: 10680,
        priceMax: 13200,
        available: 54,
        isNew: true,
        category: "tablet",
        brand: "apple",
        colors: ["purple", "black"],
        tags: ["iPhone 13 Pro Max", "iPhone 12"],
    },
    {
        id: 9,

        slug: "product-9",
        name: "Smart Watch for Men Women Fitness Tracker",
        image: "/images/bottom_banner_left_product.png",
        alt: "Smart Watch Fitness Tracker",
        rating: 4,
        reviewCount: 201,
        priceMin: 3360,
        priceMax: 4560,
        available: 318,
        isNew: true,
        category: "gaming",
        brand: "samsung",
        colors: ["black", "green"],
        tags: ["Symphony", "Samsung"],
    },
    {
        id: 10,

        slug: "product-10",
        name: "Bearway Super Console X2 Retro Gaming Handheld",
        image: "/images/buttom_right_product.png",
        alt: "Bearway Super Console X2",
        rating: 4,
        reviewCount: 77,
        priceMin: 4200,
        priceMax: 5400,
        available: 190,
        isNew: true,
        category: "gaming",
        brand: "msi",
        colors: ["blue", "black"],
        tags: ["Landing Page", "Nokia"],
    },
    {
        id: 11,

        slug: "product-11",
        name: "Microsoft Surface Pro 9 13 Inch Tablet PC",
        image: "/images/Deals of The Day product center 4.png",
        alt: "Microsoft Surface Pro 9",
        rating: 5,
        reviewCount: 266,
        priceMin: 9840,
        priceMax: 12600,
        available: 41,
        isNew: true,
        category: "tablet",
        brand: "lenovo",
        colors: ["black", "blue"],
        tags: ["Laptop", "Huawei"],
    },
    {
        id: 12,

        slug: "product-12",
        name: "Cloud Cam Wireless Home Security Camera",
        image: "/images/best_seller_product_banner_poset_image.png",
        alt: "Cloud Cam Security Camera",
        rating: 4,
        reviewCount: 119,
        priceMin: 3960,
        priceMax: 5160,
        available: 275,
        isNew: true,
        category: "camera",
        brand: "asus",
        colors: ["white", "black"],
        tags: ["Oppo", "Symphony"],
    },
    {
        id: 13,

        slug: "product-13",
        name: "Gaming Desktop Tower with RGB Lighting",
        image: "/images/Best Seller Product anather (2).png",
        alt: "Gaming Desktop Tower",
        rating: 4,
        reviewCount: 88,
        priceMin: 8400,
        priceMax: 11760,
        available: 33,
        isNew: false,
        category: "desktop",
        brand: "msi",
        colors: ["black", "red"],
        tags: ["Laptop", "Landing Page"],
    },
    {
        id: 14,

        slug: "product-14",
        name: "4K Ultra HD Curved Gaming Monitor 32 Inch",
        image: "/images/Best Seller Product anather (3).png",
        alt: "4K Curved Gaming Monitor",
        rating: 5,
        reviewCount: 174,
        priceMin: 6960,
        priceMax: 9360,
        available: 96,
        isNew: true,
        category: "monitor",
        brand: "asus",
        colors: ["black"],
        tags: ["Samsung", "Headphone"],
    },
    {
        id: 15,

        slug: "product-15",
        name: "Lenovo ThinkPad X1 Carbon Business Laptop",
        image: "/images/top_products (1).png",
        alt: "Lenovo ThinkPad X1 Carbon",
        rating: 5,
        reviewCount: 143,
        priceMin: 10200,
        priceMax: 12960,
        available: 29,
        isNew: false,
        category: "laptops",
        brand: "lenovo",
        colors: ["black"],
        tags: ["Laptop", "Huawei"],
    },
    {
        id: 16,

        slug: "product-16",
        name: "Wireless Bluetooth Portable Speaker Mini",
        image: "/images/top_products (2).png",
        alt: "Wireless Bluetooth Portable Speaker",
        rating: 3,
        reviewCount: 42,
        priceMin: 2160,
        priceMax: 3120,
        available: 510,
        isNew: true,
        category: "gaming",
        brand: "samsung",
        colors: ["blue", "pink", "green"],
        tags: ["Nokia", "Oppo"],
    },
    {
        id: 17,

        slug: "product-17",
        name: "Dell UltraSharp USB-C Hub Monitor Dock",
        image: "/images/top_products (3).png",
        alt: "Dell UltraSharp Monitor Dock",
        rating: 4,
        reviewCount: 67,
        priceMin: 5040,
        priceMax: 6720,
        available: 112,
        isNew: false,
        category: "monitor",
        brand: "dell",
        colors: ["silver", "black"],
        tags: ["Laptop", "Landing Page"],
    },
    {
        id: 18,

        slug: "product-18",
        name: "ASUS ROG Strix Gaming Laptop RTX Edition",
        image: "/images/top_products (4).png",
        alt: "ASUS ROG Strix Gaming Laptop",
        rating: 5,
        reviewCount: 289,
        priceMin: 11040,
        priceMax: 13200,
        available: 18,
        isNew: true,
        category: "laptops",
        brand: "asus",
        colors: ["black", "red"],
        tags: ["Laptop", "Samsung"],
    },
];

export const DEFAULT_PRODUCT_GALLERY = [
    "/images/best_seller_product (1).png",
    "/images/Best Seller Product anather (1).png",
    "/images/best_seller_product (2).png",
    "/images/best_seller_product (4).png",
] as const;

export const DEFAULT_PRODUCT_SPECS: ProductSpecSection[] = [
    {
        title: "Processor",
        rows: [
            { label: "Processor Brand", value: "Intel" },
            { label: "Processor Model", value: "Core i3-1215U" },
            { label: "Generation", value: "12th Gen" },
            { label: "Processor Frequency", value: "up to 4.40 GHz" },
        ],
    },
    {
        title: "Display",
        rows: [
            { label: "Display Size", value: '10.1"' },
            { label: "Display Type", value: "IPS LCD" },
            { label: "Resolution", value: "1920 x 1200 (Full HD)" },
            { label: "Touch Screen", value: "Yes" },
        ],
    },
    {
        title: "Memory & Storage",
        rows: [
            { label: "RAM", value: "3 GB" },
            { label: "Internal Storage", value: "32 GB" },
            { label: "Expandable Storage", value: "Up to 1 TB via microSD" },
        ],
    },
    {
        title: "Connectivity",
        rows: [
            { label: "Wi-Fi", value: "Wi-Fi 5 (802.11ac)" },
            { label: "Bluetooth", value: "Bluetooth 5.0" },
            { label: "Ports", value: "USB-C, microSD" },
        ],
    },
];

export const PRODUCT_REVIEWS: ProductReview[] = [
    {
        id: 1,
        author: "James Carter",
        rating: 5,
        date: "Jul 12, 2024",
        comment:
            "Excellent tablet for everyday use. The display is crisp and battery life easily lasts a full day of browsing and streaming.",
    },
    {
        id: 2,
        author: "Priya Sharma",
        rating: 4,
        date: "Jul 02, 2024",
        comment:
            "Great value for the price. Setup was simple and performance is smooth for reading, video calls, and light productivity.",
    },
    {
        id: 3,
        author: "Michael Chen",
        rating: 4,
        date: "Jun 21, 2024",
        comment:
            "Solid build quality and a bright screen. Would have preferred more storage out of the box, but expandable storage helps.",
    },
];

export const PRODUCT_QUESTIONS: ProductQuestion[] = [
    {
        id: 1,
        question: "Does this tablet support stylus input?",
        answer: "Yes, it works with compatible capacitive styluses for note-taking and sketching.",
        author: "Support Team",
        date: "Jul 08, 2024",
    },
    {
        id: 2,
        question: "Is Google Play Store available on this device?",
        answer: "Yes, the device includes access to the Google Play Store for apps and updates.",
        author: "Support Team",
        date: "Jun 30, 2024",
    },
    {
        id: 3,
        question: "What is included in the box?",
        answer: "The box includes the tablet, a USB-C charging cable, and a quick start guide.",
        author: "Support Team",
        date: "Jun 18, 2024",
    },
];

export function getProductById(id: number): ShopProduct | undefined {
    return shopProducts.find((product) => product.id === id);
}

export function getRelatedProducts(
    product: ShopProduct,
    limit = 4,
): ShopProduct[] {
    const sameCategory = shopProducts.filter(
        (item) => item.id !== product.id && item.category === product.category,
    );
    if (sameCategory.length >= limit) {
        return sameCategory.slice(0, limit);
    }

    const extras = shopProducts.filter(
        (item) =>
            item.id !== product.id &&
            !sameCategory.some((related) => related.id === item.id),
    );

    return [...sameCategory, ...extras].slice(0, limit);
}

export function getProductGallery(product: ShopProduct): string[] {
    if (product.gallery && product.gallery.length > 0) {
        return product.gallery;
    }
    const unique = Array.from(
        new Set([product.image, ...DEFAULT_PRODUCT_GALLERY]),
    );
    return unique.slice(0, 4);
}
