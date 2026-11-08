import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Hind_Siliguri } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "lenis/dist/lenis.css";
import "./globals.css";
import TopBar from "@/components/home/TopBar";
import ScrollToTopButton from "@/components/home/ScrollToTopButton";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import StoreProvider from "@/components/providers/StoreProvider";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import AuthHydrator from "@/components/providers/AuthHydrator";
import WishlistHydrator from "@/components/providers/WishlistHydrator";
import CartHydrator from "@/components/providers/CartHydrator";
import ConnectionBanner from "@/components/providers/ConnectionBanner";
import OfflineCache from "@/components/providers/OfflineCache";
import DisableMotion from "@/components/providers/DisableMotion";
import SmoothScroll from "@/components/providers/SmoothScroll";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import { AnalyticsPixels } from "@/components/providers/AnalyticsPixels";
import { VisitBeacon } from "@/components/providers/VisitBeacon";
import { SiteChromeHydrator } from "@/components/providers/SiteChromeHydrator";
import {
    absoluteUrl,
    HOME_SEO_DESCRIPTION,
    HOME_SEO_TITLE,
    siteConfig,
} from "@/config/site";
import { getSiteSettings } from "@/lib/siteSettings";
import { getCategories } from "@/lib/categories";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { getLocale } from "@/i18n/server";
import { LOCALE_TAGS } from "@/i18n/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSeoDefaults, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { preferSeoTitle } from "@/lib/seoTitle";
import {
    parseTheme,
    THEME_COOKIE_KEY,
    THEME_INIT_SCRIPT,
} from "@/lib/theme";
import {
    CART_UI_COOKIE_KEY,
    parseCartUiCookie,
    type CartUiSnapshot,
} from "@/lib/cartUiCookie";
import { readGuestCart } from "@/lib/guestCartCookie";
import { auth } from "@/auth";
import BootProgress, { BOOT_BAR_ID } from "@/components/providers/BootProgress";
import NavigationProgress from "@/components/providers/NavigationProgress";

// Geist has no Bengali glyphs; the browser falls back to this per character.
const hindSiliguri = Hind_Siliguri({
    variable: "--font-bengali",
    subsets: ["bengali"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    const locale = await getLocale();
    const name = settings.site_name || siteConfig.name;
    const title = preferSeoTitle(settings.site_title, HOME_SEO_TITLE);
    const description =
        settings.site_description?.trim() || HOME_SEO_DESCRIPTION;
    const homeTitle = preferSeoTitle(
        settings.seo.pages.home.title || settings.site_title,
        HOME_SEO_TITLE,
    );
    const homeDescription =
        settings.seo.pages.home.description?.trim() ||
        description;
    const ogTitle = preferSeoTitle(settings.og_title, homeTitle);
    const ogDescription = settings.og_description?.trim() || homeDescription;
    const twitterTitle = preferSeoTitle(settings.twitter_title, ogTitle);
    const twitterDescription =
        settings.twitter_description?.trim() || ogDescription;
    const ogImage =
        settings.og_image?.path || absoluteUrl(siteConfig.logo.og);
    const keywords = settings.keywords
        ? settings.keywords.split(",").map((k) => k.trim()).filter(Boolean)
        : [...siteConfig.keywords];
    const twitterHandle =
        settings.twitter_handle || siteConfig.social.twitter;
    const { seo } = settings;

    return {
        title: {
            default: homeTitle,
            template: seo.title_template || `%s | ${name}`,
        },
        description: homeDescription,
        verification: {
            ...(seo.google_site_verification ? { google: seo.google_site_verification } : {}),
            ...(seo.bing_site_verification
                ? { other: { "msvalidate.01": seo.bing_site_verification } }
                : {}),
        },
        keywords,
        authors: [{ name }],
        creator: name,
        publisher: name,
        applicationName: name,
        category: "ecommerce",
        metadataBase: new URL(siteConfig.url),
        alternates: {
            canonical: absoluteUrl("/"),
        },
        openGraph: {
            type: "website",
            locale: LOCALE_TAGS[locale].og,
            url: absoluteUrl("/"),
            siteName: name,
            title: ogTitle,
            description: ogDescription,
            images: [
                {
                    url: ogImage,
                    width: siteConfig.logo.width,
                    height: siteConfig.logo.height,
                    alt: `${name} — share image`,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: twitterTitle,
            description: twitterDescription,
            images: [ogImage],
            creator: twitterHandle,
        },
        icons: {
            icon: settings.favicon?.path || siteConfig.logo.dark,
            apple: settings.favicon?.path || siteConfig.logo.dark,
        },
        robots: seo.noindex_site
            ? { index: false, follow: false, googleBot: { index: false, follow: false } }
            : {
                  index: true,
                  follow: true,
                  googleBot: {
                      index: true,
                      follow: true,
                      "max-image-preview": "large",
                      "max-snippet": -1,
                      "max-video-preview": -1,
                  },
              },
    };
}

export const viewport: Viewport = {
    themeColor: [
        {
            media: "(prefers-color-scheme: light)",
            color: siteConfig.themeColor.light,
        },
        {
            media: "(prefers-color-scheme: dark)",
            color: siteConfig.themeColor.dark,
        },
    ],
    colorScheme: "light dark",
};

export default async function RootLayout({
    children,
}: LayoutProps<"/">) {
    const [settings, categories, locale, seoDefaults, cookieStore, session, guestLines] =
        await Promise.all([
            getSiteSettings(),
            getCategories(),
            getLocale(),
            getSeoDefaults(),
            cookies(),
            auth(),
            readGuestCart().catch(() => []),
        ]);
    // Cookie lets SSR paint dark immediately (no light→dark flash on reload).
    const theme = parseTheme(cookieStore.get(THEME_COOKIE_KEY)?.value);
    const authUser =
        session?.backendUser &&
        session.error !== "RefreshTokenError" &&
        session.backendUser.role === "customer"
            ? session.backendUser
            : null;
    // Header cart badge/total: prefer the small UI cookie; else guest line count.
    let cartUi: CartUiSnapshot | null = parseCartUiCookie(
        cookieStore.get(CART_UI_COOKIE_KEY)?.value,
    );
    if (!cartUi && !authUser) {
        const guestCount = guestLines.reduce((sum, line) => sum + line.quantity, 0);
        if (guestCount > 0) cartUi = { count: guestCount, subtotal: 0 };
    }
    const chromePayload = {
        siteName: settings.site_name,
        topbarEmail: settings.chrome?.topbar_email ?? null,
        topbarPhone: settings.chrome?.topbar_phone ?? null,
        footerBlurb: settings.chrome?.footer_blurb ?? null,
        footerPhone: settings.chrome?.footer_phone ?? null,
        footerCallout: settings.chrome?.footer_callout ?? null,
        social: settings.chrome?.social,
        nav: {
            header: settings.nav?.header ?? [],
            footer_find: settings.nav?.footer_find ?? [],
            footer_care: settings.nav?.footer_care ?? [],
            footer_sell: settings.nav?.footer_sell ?? [],
        },
        homeSections: settings.home_sections ?? [],
    };

    return (
        <html
            lang={locale}
            className={`${GeistSans.variable} ${hindSiliguri.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`}
            style={{ colorScheme: theme }}
            suppressHydrationWarning
        >
            <head>
                {/* Blocking — applies theme before first paint when cookie is missing. */}
                <script
                    id="niyenin-theme-init"
                    dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
                />
            </head>
            <body className="min-h-full flex flex-col font-sans bg-bg-base text-text-primary">
                {/* SSR reload bar (real DOM + CSS). No <script> — React 19 safe. */}
                <div
                    id={BOOT_BAR_ID}
                    className="rm-boot-bar"
                    role="progressbar"
                    aria-label="Loading"
                    aria-hidden
                />
                <BootProgress />
                <NavigationProgress />
                <JsonLd
                    id="site-jsonld"
                    data={[
                        organizationJsonLd(seoDefaults),
                        websiteJsonLd(seoDefaults, LOCALE_TAGS[locale].intl),
                    ]}
                />
                <AnalyticsPixels settings={settings} />
                <VisitBeacon />
                <DisableMotion />
                <SmoothScroll />
                <ThemeProvider>
                    <LocaleProvider locale={locale}>
                        <StoreProvider
                            siteChrome={chromePayload}
                            authUser={authUser}
                            authReady
                            cartUi={cartUi}
                        >
                            <AuthSessionProvider session={session}>
                                <ConnectionBanner />
                                <OfflineCache />
                                <AuthHydrator />
                                <WishlistHydrator />
                                <CartHydrator />
                                <SiteChromeHydrator payload={chromePayload} />
                                <TopBar />
                                <Header categories={categories} />
                                {children}
                                <Footer />
                                <ScrollToTopButton />
                            </AuthSessionProvider>
                        </StoreProvider>
                    </LocaleProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
