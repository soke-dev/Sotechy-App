import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

// Same type as the merchant dashboard and the customer app
const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin"], weight: ["600", "700", "800"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Phones zoom into small text boxes when you type; this keeps the page still (pinch-zoom still works on Android)
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export const metadata: Metadata = {
  title: "Sotechy Admin",
  description: "Sotechy Shop admin dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
