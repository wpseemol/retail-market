import { Megaphone } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { TrackerRow } from "@/components/settings/TrackerRow";
import { GeneralSettingsForm } from "./GeneralSettingsForm";
import { useSiteSettings } from "./settingsContext";

export function PixelsSettingsPage() {
    const { form } = useSiteSettings();

    return (
        <GeneralSettingsForm>
            <SettingsSection
                title="Advertising pixels"
                description="Enable and configure advertising conversion pixels."
                icon={Megaphone}
            >
                <TrackerRow
                    form={form}
                    label="Google Ads"
                    enabledField="google_ads_enabled"
                    idField="google_ads_id"
                    idLabel="Conversion ID"
                    idPlaceholder="AW-123456789"
                />
                <TrackerRow
                    form={form}
                    label="TikTok Pixel"
                    enabledField="tiktok_enabled"
                    idField="tiktok_pixel_id"
                    idLabel="Pixel ID"
                    idPlaceholder="ABCDEFGHIJ1234567890"
                />
                <TrackerRow
                    form={form}
                    label="LinkedIn Insight Tag"
                    enabledField="linkedin_enabled"
                    idField="linkedin_partner_id"
                    idLabel="Partner ID"
                    idPlaceholder="1234567"
                />
                <TrackerRow
                    form={form}
                    label="Twitter/X Pixel"
                    enabledField="twitter_pixel_enabled"
                    idField="twitter_pixel_id"
                    idLabel="Pixel ID"
                    idPlaceholder="abcde12345"
                />
                <TrackerRow
                    form={form}
                    label="Meta (Facebook) Pixel"
                    enabledField="meta_pixel_enabled"
                    idField="meta_pixel_id"
                    idLabel="Pixel ID"
                    idPlaceholder="123456789012345"
                />
            </SettingsSection>
        </GeneralSettingsForm>
    );
}
