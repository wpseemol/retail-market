import {
    BarChart3,
    CreditCard,
    DatabaseBackup,
    Globe,
    History,
    KeyRound,
    LayoutGrid,
    LayoutTemplate,
    Mail,
    Megaphone,
    Menu,
    MessageCircle,
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

export type SettingsTabGroup = {
    id: string;
    label: string;
    tabs: SettingsTab[];
};

/** Flat list (routes / redirects). Prefer SETTINGS_TAB_GROUPS for the nav UI. */
export const SETTINGS_TABS: SettingsTab[] = [
    { path: "identity", label: "Identity", icon: Globe },
    { path: "header", label: "Header", icon: Menu },
    { path: "footer", label: "Footer", icon: PanelBottom },
    { path: "home", label: "Home", icon: LayoutTemplate },
    { path: "shop", label: "Shop", icon: LayoutGrid },
    { path: "social", label: "Social", icon: Share2 },
    { path: "social-login", label: "Social login", icon: KeyRound },
    { path: "sms", label: "SMS gateway", icon: MessageSquareText },
    { path: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { path: "email", label: "Email provider", icon: Mail },
    { path: "payment", label: "Payment", icon: CreditCard },
    { path: "shipping", label: "Shipping", icon: Truck },
    { path: "analytics", label: "Analytics", icon: BarChart3 },
    { path: "pixels", label: "Pixels", icon: Megaphone },
    { path: "history", label: "History", icon: History },
    { path: "backups", label: "Backups", icon: DatabaseBackup },
];

/** Grouped like Social login cards — Storefront / Integrations / Tracking / System. */
export const SETTINGS_TAB_GROUPS: SettingsTabGroup[] = [
    {
        id: "storefront",
        label: "Storefront",
        tabs: [
            { path: "identity", label: "Identity", icon: Globe },
            { path: "header", label: "Header", icon: Menu },
            { path: "footer", label: "Footer", icon: PanelBottom },
            { path: "home", label: "Home", icon: LayoutTemplate },
            { path: "shop", label: "Shop", icon: LayoutGrid },
            { path: "social", label: "Social", icon: Share2 },
        ],
    },
    {
        id: "integrations",
        label: "Integrations",
        tabs: [
            { path: "social-login", label: "Social login", icon: KeyRound },
            { path: "sms", label: "SMS gateway", icon: MessageSquareText },
            { path: "whatsapp", label: "WhatsApp", icon: MessageCircle },
            { path: "email", label: "Email provider", icon: Mail },
            { path: "payment", label: "Payment", icon: CreditCard },
            { path: "shipping", label: "Shipping", icon: Truck },
        ],
    },
    {
        id: "tracking",
        label: "Tracking",
        tabs: [
            { path: "analytics", label: "Analytics", icon: BarChart3 },
            { path: "pixels", label: "Pixels", icon: Megaphone },
        ],
    },
    {
        id: "system",
        label: "System",
        tabs: [
            { path: "history", label: "History", icon: History },
            { path: "backups", label: "Backups", icon: DatabaseBackup },
        ],
    },
];
