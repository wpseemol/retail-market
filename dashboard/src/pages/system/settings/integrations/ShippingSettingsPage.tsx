import { Truck } from "lucide-react";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ShippingSettingsPanel } from "@/components/settings/ShippingSettingsPanel";
import { useSiteSettings } from "../settingsContext";

export function ShippingSettingsPage() {
    const { token } = useSiteSettings();
    return (
        <SettingsSection
            title="Shipping"
            description="Default delivery charge, free-shipping threshold, and whether store owners can set a different shipping cost per product."
            icon={Truck}
        >
            <ShippingSettingsPanel token={token} />
        </SettingsSection>
    );
}
