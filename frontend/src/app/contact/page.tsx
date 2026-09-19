import type { Metadata } from "next";
import ContactPageContent from "@/components/contact/ContactPageContent";

export const metadata: Metadata = {
    title: "Contact | Retail Market",
    description:
        "Send us a message or find our office location, phone numbers, and email addresses.",
};

export default function ContactPage() {
    return (
        <main>
            <ContactPageContent />
        </main>
    );
}
