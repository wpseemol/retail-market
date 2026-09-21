import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/home/TopBar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import StoreProvider from "@/components/providers/StoreProvider";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import AuthHydrator from "@/components/providers/AuthHydrator";
import { createPageMetadata, siteConfig } from "@/config/site";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
    display: "swap",
});

export const metadata: Metadata = {
    ...createPageMetadata({ path: "/" }),
    title: {
        default: siteConfig.title,
        template: `%s | ${siteConfig.name}`,
    },
    applicationName: siteConfig.name,
    category: "ecommerce",
    icons: {
        icon: siteConfig.logo.dark,
        apple: siteConfig.logo.dark,
    },
};

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

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang={siteConfig.language}
            className={`${poppins.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <body className={`${poppins.className} min-h-full flex flex-col font-sans`}>
                <ThemeProvider>
                    <StoreProvider>
                        <AuthHydrator />
                        <TopBar />
                        <Header />
                        {children}
                        <Footer />
                    </StoreProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
