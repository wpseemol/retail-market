import type { Metadata } from "next";
import AboutPageContent from "@/components/about/AboutPageContent";

export const metadata: Metadata = {
    title: "About Us | Retail Market",
    description:
        "Learn about Retail Market — our story, achievements, leadership, and the team behind more than 25 years of trusted service.",
};

export default function AboutPage() {
    return (
        <main>
            <AboutPageContent />
        </main>
    );
}
