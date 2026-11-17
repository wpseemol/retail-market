import { LayoutTemplate } from "lucide-react";
import { useState } from "react";
import { HeroBannerSettingsPanel } from "@/components/settings/HeroBannerSettingsPanel";
import { HomeComponentsEditor } from "@/components/settings/HomeComponentsEditor";
import { WelcomeModalSettingsPanel } from "@/components/settings/WelcomeModalSettingsPanel";
import {
  SettingsSection,
  SettingsStatusLine,
} from "@/components/settings/SettingsSection";
import { PageHeader } from "@/components/dashboard/page-shell";
import { useAuthStore } from "@/store/auth";
import { useToastMessages } from "@/hooks/use-toast-messages";

/**
 * Admin + super_admin home CMS (hero, welcome modal, promo slider, …)
 * without opening full Site settings (payment / SMS secrets stay super_admin).
 */
export function HomeContentPage() {
  const token = useAuthStore((s) => s.token) ?? "";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  useToastMessages(success, error);

  const showError = (message: string) => {
    setSuccess(null);
    setError(message);
  };
  const showSuccess = (message: string) => {
    setError(null);
    setSuccess(message);
  };
  const status = <SettingsStatusLine error={error} success={success} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home content"
        description="Edit the storefront home hero, welcome modal, promo slider, and other home blocks. Upload a unique image per slide and link CTAs to /shop/{slug}."
      />

      <div className="space-y-5">
        <SettingsSection
          title="Welcome modal"
          description="Home page popup offer — badge, headline, countdown, CTA, and images."
          icon={LayoutTemplate}
          collapsible
          defaultOpen={false}
        >
          <WelcomeModalSettingsPanel
            token={token}
            onError={showError}
            onSuccess={showSuccess}
          />
          {status}
        </SettingsSection>

        <SettingsSection
          title="Hero banner"
          description="Main and side promo copy, CTAs, and images."
          icon={LayoutTemplate}
          collapsible
          defaultOpen={false}
        >
          <HeroBannerSettingsPanel
            token={token}
            onError={showError}
            onSuccess={showSuccess}
          />
          {status}
        </SettingsSection>

        <SettingsSection
          title="Other home sections"
          description="Promo slider and the rest of the home blocks. Each slide needs its own product image and a product URL."
          icon={LayoutTemplate}
        >
          <HomeComponentsEditor
            token={token}
            onError={showError}
            onSuccess={showSuccess}
          />
          {status}
        </SettingsSection>
      </div>
    </div>
  );
}
