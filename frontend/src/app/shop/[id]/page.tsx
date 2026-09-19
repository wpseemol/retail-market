import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductPageContent from "@/components/shop/ProductPageContent";
import { getProductById, shopProducts } from "@/components/shop/data";
import { createPageMetadata, siteConfig } from "@/config/site";

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
        return createPageMetadata({
            title: "Product Not Found",
            path: `/shop/${id}`,
            noIndex: true,
        });
    }

    return createPageMetadata({
        title: product.name,
        description:
            product.description ??
            `Buy ${product.name} at ${siteConfig.name}. Browse specs, reviews, and related products.`,
        path: `/shop/${product.id}`,
        image: product.gallery?.[0] ?? product.image ?? siteConfig.logo.og,
    });
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
