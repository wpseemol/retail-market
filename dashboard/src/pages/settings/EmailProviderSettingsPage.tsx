import { Mail } from "lucide-react";
import { EmailProviderSettingsPanel } from "@/components/settings/EmailProviderSettingsPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useSiteSettings } from "./settingsContext";

export function EmailProviderSettingsPage() {
    const { token } = useSiteSettings();
    return (
        <SettingsSection
            title="Email provider"
            description="Choose the email service that sends verification and account emails (Gmail, SendGrid, Brevo, SMTP…). Passwords are stored encrypted."
            icon={Mail}
        >
            <EmailProviderSettingsPanel token={token} />
        </SettingsSection>
    );
}
