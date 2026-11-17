import { Fingerprint } from "lucide-react";
import { KycSettingsPanel } from "@/components/settings/KycSettingsPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useSiteSettings } from "../settingsContext";

export function KycSettingsPage() {
  const { token } = useSiteSettings();
  return (
    <SettingsSection
      title="KYC"
      description="How seller identity documents are checked before an admin or super admin approves a Become a seller application."
      icon={Fingerprint}
    >
      <KycSettingsPanel token={token} />
    </SettingsSection>
  );
}
