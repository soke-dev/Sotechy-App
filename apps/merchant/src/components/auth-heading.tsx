import type { ReactNode } from "react";

/** The big heading above a sign-in or sign-up form ("Why sell on Sotechy?" sits above it, in the frame) */
export function AuthHeading({ children }: { children: ReactNode }) {
  return <h2 className="display text-[40px] text-ink lg:text-[56px]">{children}</h2>;
}
