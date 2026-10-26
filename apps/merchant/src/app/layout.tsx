import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

// Same typefaces as the customer app
const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin"], weight: ["600", "700", "800"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Sotechy for Merchants",
  description: "Sell on Sotechy: orders, products, payouts and your store token.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
