import { CreditCard } from "lucide-react";
import { PaymentGatewaySettingsPanel } from "@/components/settings/PaymentGatewaySettingsPanel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useSiteSettings } from "../settingsContext";

export function PaymentSettingsPage() {
    const { token } = useSiteSettings();
    return (
        <SettingsSection
            title="Online payment"
            description="SSLCOMMERZ store credentials and sandbox/live mode. The store password is stored encrypted."
            icon={CreditCard}
        >
            <PaymentGatewaySettingsPanel token={token} />
        </SettingsSection>
    );
}
