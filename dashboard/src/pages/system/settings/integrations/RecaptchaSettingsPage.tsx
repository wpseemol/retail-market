import { Shield } from "lucide-react";
import { RecaptchaSettingsPanel } from "@/components/settings/RecaptchaSettingsPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useSiteSettings } from "../settingsContext";

export function RecaptchaSettingsPage() {
  const { token } = useSiteSettings();
  return (
    <SettingsSection
      title="Google reCAPTCHA"
      description="Site key and secret for storefront and dashboard auth forms. Choose v2 (checkbox) or v3 (score); default is v2."
      icon={Shield}
    >
      <RecaptchaSettingsPanel token={token} />
    </SettingsSection>
  );
}
