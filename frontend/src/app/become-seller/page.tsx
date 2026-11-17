import type { Metadata } from "next";
import BecomeSellerContent from "@/components/become-seller/BecomeSellerContent";
import { createPageMetadata } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
  title: "Become a seller",
  description:
    "Apply to sell on Niyenin: create an account, upload identity documents, and review partner fee and rent terms.",
  path: "/become-seller",
});

export default function BecomeSellerPage() {
  return (
    <main>
      <BecomeSellerContent />
    </main>
  );
}
