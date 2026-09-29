import { PanelBottom } from "lucide-react";
import { FooterSettingsPanel } from "@/components/settings/FooterSettingsPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useSiteSettings } from "./settingsContext";

export function FooterSettingsPage() {
    const { token, settings, setSettings, error, success, showError, showSuccess } =
        useSiteSettings();

    return (
        <SettingsSection
            title="Footer"
            description="Support blurb, phone, and footer link columns (drag to reorder)."
            icon={PanelBottom}
        >
            <FooterSettingsPanel
                token={token}
                settings={settings}
                error={error}
                success={success}
                onUpdated={setSettings}
                onError={showError}
                onSuccess={showSuccess}
            />
        </SettingsSection>
    );
}
