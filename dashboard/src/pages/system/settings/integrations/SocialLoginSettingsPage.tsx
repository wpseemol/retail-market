import { KeyRound } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SocialLoginSettingsPanel } from "@/components/settings/SocialLoginSettingsPanel";
import { useSiteSettings } from "../settingsContext";

export function SocialLoginSettingsPage() {
    const { token } = useSiteSettings();
    return (
        <SettingsSection
            title="Social login"
            description="Turn Google, Facebook, and Apple sign-in on or off for the storefront and store their credentials securely."
            icon={KeyRound}
        >
            <SocialLoginSettingsPanel token={token} />
        </SettingsSection>
    );
}
