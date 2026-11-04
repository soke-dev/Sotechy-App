import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

// Same typefaces as the customer app
const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin"], weight: ["600", "700", "800"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
// Small spaced labels on the sign-in and sign-up screens
const mono = DM_Mono({ variable: "--font-mono-label", subsets: ["latin"], weight: ["500"] });

// Phones zoom into small text boxes when you type; this keeps the page still (pinch-zoom still works on Android)
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export const metadata: Metadata = {
  title: "Sotechy for Merchants",
  description: "Sell on Sotechy: orders, products, payouts and your store token.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme is set by the script below before React loads, so React mustn't complain about it
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
