import type { ReactNode } from "react";
import { VerifiedOnly } from "@/components/verified-only";

export default function Layout({ children }: { children: ReactNode }) {
  return <VerifiedOnly what="feature your store">{children}</VerifiedOnly>;
}
