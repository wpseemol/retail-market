import { LayoutTemplate } from "lucide-react";
import { HeroBannerSettingsPanel } from "@/components/settings/HeroBannerSettingsPanel";
import { HomeComponentsEditor } from "@/components/settings/HomeComponentsEditor";
import { HomeSectionsPanel } from "@/components/settings/HomeSectionsPanel";
import {
    SettingsSection,
    SettingsStatusLine,
} from "@/components/settings/SettingsSection";
import { WelcomeModalSettingsPanel } from "@/components/settings/WelcomeModalSettingsPanel";
import { useSiteSettings } from "./settingsContext";

export function HomeSettingsPage() {
    const { token, settings, setSettings, error, success, showError, showSuccess } =
        useSiteSettings();
    const status = <SettingsStatusLine error={error} success={success} />;

    return (
        <div className="space-y-5">
            <SettingsSection
                title="Welcome modal"
                description="Home page popup offer — badge, headline, countdown, CTA, and images. Click Hide to collapse."
                icon={LayoutTemplate}
                collapsible
                defaultOpen={false}
            >
                <WelcomeModalSettingsPanel token={token} onError={showError} onSuccess={showSuccess} />
                {status}
            </SettingsSection>
            <SettingsSection
                title="Hero banner"
                description="Main and side promo copy, CTAs, and images. Click Hide to collapse."
                icon={LayoutTemplate}
                collapsible
                defaultOpen={false}
            >
                <HeroBannerSettingsPanel token={token} onError={showError} onSuccess={showSuccess} />
                {status}
            </SettingsSection>
            <SettingsSection
                title="Other home sections"
                description="Pick a block, edit what shoppers see. Images preview from the storefront; each form validates before save."
                icon={LayoutTemplate}
            >
                <HomeComponentsEditor token={token} onError={showError} onSuccess={showSuccess} />
                {status}
            </SettingsSection>
            <SettingsSection
                title="Home page sections"
                description="Enable, disable, and reorder storefront home components."
                icon={LayoutTemplate}
            >
                <HomeSectionsPanel
                    token={token}
                    sections={settings.home_sections ?? []}
                    onUpdated={setSettings}
                    onError={showError}
                    onSuccess={showSuccess}
                />
                {status}
            </SettingsSection>
        </div>
    );
}
