import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductPageContent from "@/components/shop/ProductPageContent";
import { getProductById, shopProducts } from "@/components/shop/data";

interface ProductPageProps {
    params: Promise<{ id: string }>;
}

export function generateStaticParams() {
    return shopProducts.map((product) => ({
        id: String(product.id),
    }));
}

export async function generateMetadata({
    params,
}: ProductPageProps): Promise<Metadata> {
    const { id } = await params;
    const product = getProductById(Number(id));

    if (!product) {
        return { title: "Product Not Found | Retail Market" };
    }

    return {
        title: `${product.name} | Retail Market`,
        description:
            product.description ??
            `Buy ${product.name} at Retail Market. Browse specs, reviews, and related products.`,
    };
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { id } = await params;
    const productId = Number(id);

    if (!Number.isFinite(productId)) {
        notFound();
    }

    const product = getProductById(productId);

    if (!product) {
        notFound();
    }

    return (
        <main>
            <ProductPageContent product={product} />
        </main>
    );
}
