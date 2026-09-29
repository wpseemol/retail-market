import { MessageSquareText } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SmsGatewaySettingsPanel } from "@/components/settings/SmsGatewaySettingsPanel";
import { useSiteSettings } from "./settingsContext";

export function SmsGatewaySettingsPage() {
    const { token } = useSiteSettings();
    return (
        <SettingsSection
            title="SMS gateway"
            description="Choose the SMS provider that sends phone verification (OTP) codes and store its credentials encrypted."
            icon={MessageSquareText}
        >
            <SmsGatewaySettingsPanel token={token} />
        </SettingsSection>
    );
}
