import { MessageCircle } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { WhatsAppGatewaySettingsPanel } from "@/components/settings/WhatsAppGatewaySettingsPanel";
import { useSiteSettings } from "../settingsContext";

export function WhatsAppGatewaySettingsPage() {
  const { token } = useSiteSettings();
  return (
    <SettingsSection
      title="WhatsApp"
      description="Send phone verification (OTP) codes over WhatsApp when a shopper chooses it. Uses Meta Cloud API or Twilio WhatsApp with an approved template. Tokens are stored encrypted."
      icon={MessageCircle}
    >
      <WhatsAppGatewaySettingsPanel token={token} />
    </SettingsSection>
  );
}
