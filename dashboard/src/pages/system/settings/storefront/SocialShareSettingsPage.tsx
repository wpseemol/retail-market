import { Share2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SeoMovedNotice } from "./SeoMovedNotice";

export function SocialShareSettingsPage() {
    return (
        <SettingsSection
            title="Social share"
            description="Open Graph and Twitter/X card metadata for link previews."
            icon={Share2}
        >
            <SeoMovedNotice what="The share image, Open Graph and Twitter/X cards" />
        </SettingsSection>
    );
}
