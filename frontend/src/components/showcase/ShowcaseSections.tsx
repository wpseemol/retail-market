import { Fragment, type ComponentProps, type ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ShowcaseContent, ShowcaseReviewsPayload, ShowcaseSectionKey } from "@/lib/showcase";
import type { StorefrontProduct } from "@/lib/stores";
import { AboutSection, ContactSocial, PoliciesSection } from "./InfoSections";
import { FeaturedProducts, ProductGrid } from "./ProductSections";
import { ShowcaseReviews } from "./ShowcaseReviews";

type GridProps = Omit<ComponentProps<typeof ProductGrid>, "t" | "name" | "hideBrand">;

/** Renders the enabled page sections in the order the owner chose. */
export function ShowcaseSections({
    content,
    name,
    dict,
    intlLocale,
    featured,
    grid,
    reviews,
    hideBrand,
}: {
    content: ShowcaseContent;
    name: string;
    dict: Dictionary;
    intlLocale: string;
    featured: StorefrontProduct[];
    grid: GridProps;
    reviews: ShowcaseReviewsPayload | null;
    hideBrand?: boolean;
}) {
    const t = dict.showcase;
    const render: Record<ShowcaseSectionKey, () => ReactNode> = {
        featured: () => <FeaturedProducts products={featured} name={name} t={t} hideBrand={hideBrand} />,
        products: () => <ProductGrid {...grid} name={name} t={t} hideBrand={hideBrand} />,
        about: () => <AboutSection text={content.about} name={name} t={t} />,
        reviews: () => <ShowcaseReviews data={reviews} name={name} dict={dict} intlLocale={intlLocale} />,
        contact: () => <ContactSocial content={content} name={name} t={t} />,
        policies: () => <PoliciesSection policies={content.policies} t={t} />,
    };

    // Products must always be reachable, even if an owner hides the section.
    const order = content.sections.includes("products") ? content.sections : [...content.sections, "products" as const];

    return (
        <div className="container mx-auto flex flex-col gap-12 px-4 py-10 sm:px-6 sm:py-12">
            {order.map((key) => (
                <Fragment key={key}>{render[key]()}</Fragment>
            ))}
        </div>
    );
}
