import type { ReactNode } from "react";
import { WhySell } from "./why-sell";

/** A page heading with "Why sell on Sotechy?" beside it on computers (phones show it by the logo) */
export function AuthHeading({ children, whySell = true }: { children: ReactNode; whySell?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-3xl font-extrabold">{children}</h2>
      {whySell && (
        <span className="mt-1 hidden lg:block">
          <WhySell tone="light" />
        </span>
      )}
    </div>
  );
}
