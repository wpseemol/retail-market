import {
    BarChart3,
    CreditCard,
    Globe,
    History,
    KeyRound,
    LayoutGrid,
    LayoutTemplate,
    Mail,
    Megaphone,
    Menu,
    MessageSquareText,
    PanelBottom,
    Share2,
    Truck,
    type LucideIcon,
} from "lucide-react";

export type SettingsTab = {
    /** URL segment under /settings. */
    path: string;
    label: string;
    icon: LucideIcon;
};

export const SETTINGS_TABS: SettingsTab[] = [
    { path: "identity", label: "Identity", icon: Globe },
    { path: "header", label: "Header", icon: Menu },
    { path: "footer", label: "Footer", icon: PanelBottom },
    { path: "home", label: "Home", icon: LayoutTemplate },
    { path: "shop", label: "Shop", icon: LayoutGrid },
    { path: "social", label: "Social", icon: Share2 },
    { path: "social-login", label: "Social login", icon: KeyRound },
    { path: "sms", label: "SMS gateway", icon: MessageSquareText },
    { path: "email", label: "Email provider", icon: Mail },
    { path: "payment", label: "Payment", icon: CreditCard },
    { path: "shipping", label: "Shipping", icon: Truck },
    { path: "analytics", label: "Analytics", icon: BarChart3 },
    { path: "pixels", label: "Pixels", icon: Megaphone },
    { path: "history", label: "History", icon: History },
];
