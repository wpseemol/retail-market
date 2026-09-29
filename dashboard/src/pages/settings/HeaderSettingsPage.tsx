import { Menu } from "lucide-react";
import { HeaderSettingsPanel } from "@/components/settings/HeaderSettingsPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useSiteSettings } from "./settingsContext";

export function HeaderSettingsPage() {
    const { token, settings, setSettings, error, success, showError, showSuccess } =
        useSiteSettings();

    return (
        <SettingsSection
            title="Header & top bar"
            description="Contact details, social links, and primary navigation (drag to reorder)."
            icon={Menu}
        >
            <HeaderSettingsPanel
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
