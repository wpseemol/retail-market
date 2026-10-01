import { BarChart3 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { TrackerRow } from "@/components/settings/TrackerRow";
import { GeneralSettingsForm } from "../GeneralSettingsForm";
import { useSiteSettings } from "../settingsContext";

export function AnalyticsSettingsPage() {
    const { form } = useSiteSettings();

    return (
        <GeneralSettingsForm>
            <SettingsSection
                title="Analytics"
                description="Enable and configure analytics tracking for the storefront."
                icon={BarChart3}
            >
                <TrackerRow
                    form={form}
                    label="Google Analytics (GA4)"
                    enabledField="google_analytics_enabled"
                    idField="google_analytics_id"
                    idLabel="Measurement ID"
                    idPlaceholder="G-XXXXXXXXXX"
                />
                <TrackerRow
                    form={form}
                    label="Google Tag Manager"
                    enabledField="google_tag_manager_enabled"
                    idField="google_tag_manager_id"
                    idLabel="Container ID"
                    idPlaceholder="GTM-XXXXXXX"
                />
                <TrackerRow
                    form={form}
                    label="Hotjar"
                    enabledField="hotjar_enabled"
                    idField="hotjar_site_id"
                    idLabel="Site ID"
                    idPlaceholder="1234567"
                />
                <TrackerRow
                    form={form}
                    label="Plerdy"
                    enabledField="plerdy_enabled"
                    idField="plerdy_site_id"
                    idLabel="Site ID"
                    idPlaceholder="abcd1234"
                />
            </SettingsSection>
        </GeneralSettingsForm>
    );
}
