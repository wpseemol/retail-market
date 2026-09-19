import type { Metadata } from "next";
import AboutPageContent from "@/components/about/AboutPageContent";
import { createPageMetadata, siteConfig } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "About Us",
    description: `Learn about ${siteConfig.name} — our story, achievements, leadership, and the team behind more than 25 years of trusted service.`,
    path: "/about",
});

export default function AboutPage() {
    return (
        <main>
            <AboutPageContent />
        </main>
    );
}
