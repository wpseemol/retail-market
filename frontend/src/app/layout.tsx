import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/home/TopBar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import StoreProvider from "@/components/providers/StoreProvider";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import AuthHydrator from "@/components/providers/AuthHydrator";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import { AnalyticsPixels } from "@/components/providers/AnalyticsPixels";
import { VisitBeacon } from "@/components/providers/VisitBeacon";
import { SiteChromeHydrator } from "@/components/providers/SiteChromeHydrator";
import { absoluteUrl, siteConfig } from "@/config/site";
import { getSiteSettings } from "@/lib/siteSettings";
import { getCategories } from "@/lib/categories";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
    display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    const name = settings.site_name || siteConfig.name;
    const title = settings.site_title || siteConfig.title;
    const description =
        settings.site_description || siteConfig.description;
    const ogTitle = settings.og_title || title;
    const ogDescription = settings.og_description || description;
    const twitterTitle = settings.twitter_title || ogTitle;
    const twitterDescription =
        settings.twitter_description || ogDescription;
    const ogImage =
        settings.og_image?.path || absoluteUrl(siteConfig.logo.og);
    const keywords = settings.keywords
        ? settings.keywords.split(",").map((k) => k.trim()).filter(Boolean)
        : [...siteConfig.keywords];
    const twitterHandle =
        settings.twitter_handle || siteConfig.social.twitter;

    return {
        title: {
            default: title,
            template: `%s | ${name}`,
        },
        description,
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
            locale: siteConfig.locale,
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
        robots: {
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
    const settings = await getSiteSettings();
    const categories = await getCategories();
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
            lang={siteConfig.language}
            className={`${poppins.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <body
                className={`${poppins.className} min-h-full flex flex-col font-sans`}
            >
                <AnalyticsPixels settings={settings} />
                <VisitBeacon />
                <ThemeProvider>
                    <StoreProvider>
                        <AuthSessionProvider>
                            <AuthHydrator />
                            <SiteChromeHydrator payload={chromePayload} />
                            <TopBar />
                            <Header categories={categories} />
                            {children}
                            <Footer />
                        </AuthSessionProvider>
                    </StoreProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
