import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin"], weight: ["600", "700", "800"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Sotechy — We're building something new",
  description: "The new Sotechy is almost here: verified stores, delivery or pickup, and store tokens on every order. Follow along on X or email hello@sotechy.shop.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
