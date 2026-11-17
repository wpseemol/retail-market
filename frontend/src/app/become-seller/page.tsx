import type { Metadata } from "next";
import BecomeSellerContent from "@/components/become-seller/BecomeSellerContent";
import { ContentHero, HeroPill } from "@/components/content/ContentHero";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDictionary } from "@/i18n/server";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

const PATH = "/become-seller";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  const copy = dict.becomeSeller;
  return buildMetadata({
    title: copy.title,
    description: copy.subtitle,
    path: PATH,
  });
}

export default async function BecomeSellerPage() {
  const dict = await getDictionary();
  const copy = dict.becomeSeller;
  const t = dict.contentPages;

  return (
    <main className="showcase-theme flex-1 bg-bg-base">
      <JsonLd
        id="become-seller-jsonld"
        data={breadcrumbJsonLd([
          { name: t.home, path: "/" },
          { name: copy.title, path: PATH },
        ])}
      />
      <ContentHero
        hero={{
          eyebrow: copy.eyebrow,
          title: copy.title,
          subtitle: copy.subtitle,
        }}
        crumbs={[{ name: t.home, href: "/" }, { name: copy.title }]}
        breadcrumbLabel={t.breadcrumb}
        meta={
          <>
            <HeroPill>{copy.heroPillAccount}</HeroPill>
            <HeroPill>{copy.heroPillVerify}</HeroPill>
            <HeroPill>{copy.heroPillReview}</HeroPill>
          </>
        }
      />
      <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <BecomeSellerContent />
      </div>
    </main>
  );
}
