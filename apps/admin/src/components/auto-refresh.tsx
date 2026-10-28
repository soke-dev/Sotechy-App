"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { loadAdminPulse } from "@/app/(dashboard)/actions";

/** Live admin: every few seconds asks the API whether anything changed (orders, offers, payouts, stores,
 *  areas, chats, reviews, sign-ups) and re-renders the open page from the server when it did. */
export function LivePulse({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  const last = useRef<string | null>(null);
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const v = await loadAdminPulse();
      if (!v) return;
      if (last.current && v !== last.current) router.refresh();
      last.current = v;
    };
    void check();
    const t = setInterval(check, seconds * 1000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", check);
    };
  }, [router, seconds]);
  return null;
}
