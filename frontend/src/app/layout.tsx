import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/home/TopBar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Retail Market",
    description:
        "Retail market frontend built with React, Next.js, and Tailwind CSS v4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <body className="min-h-full flex flex-col">
                <ThemeProvider>
                    <TopBar />
                    <Header />
                    {children}
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}
