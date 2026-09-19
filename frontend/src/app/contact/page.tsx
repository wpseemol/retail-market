import type { Metadata } from "next";
import ContactPageContent from "@/components/contact/ContactPageContent";
import { createPageMetadata } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
    title: "Contact",
    description:
        "Send us a message or find our office location, phone numbers, and email addresses.",
    path: "/contact",
});

export default function ContactPage() {
    return (
        <main>
            <ContactPageContent />
        </main>
    );
}
