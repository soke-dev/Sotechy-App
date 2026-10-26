"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { googleSignIn, testGoogleSignIn } from "@/lib/session-actions";
import { btn } from "./ui";
import { FormError } from "./account-fields";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

interface GoogleId {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * "Continue with Google". With NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID set it's Google's own button; without it
 * (local testing) it signs in a fixed test account so the rest of the flow can be tried.
 */
export function GoogleButton() {
  const holder = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!CLIENT_ID) return;
    const draw = () => {
      const g = (window as unknown as { google?: GoogleId }).google;
      if (!g || !holder.current) return;
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: ({ credential }) => start(async () => setError((await googleSignIn(credential))?.error ?? null)),
      });
      g.accounts.id.renderButton(holder.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: holder.current.offsetWidth || 320 });
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-gis]");
    if (existing) return void (window.google ? draw() : existing.addEventListener("load", draw));
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.dataset.gis = "1";
    s.addEventListener("load", draw);
    document.head.appendChild(s);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {CLIENT_ID ? (
        <div ref={holder} className={`flex min-h-11 w-full justify-center ${pending ? "pointer-events-none opacity-60" : ""}`} />
      ) : (
        <button type="button" disabled={pending} onClick={() => start(async () => setError((await testGoogleSignIn())?.error ?? null))} className={`${btn.outline} w-full`}>
          <GoogleMark /> {pending ? "Signing in…" : "Continue with Google"}
        </button>
      )}
      <FormError message={error} />
    </div>
  );
}

declare global {
  interface Window {
    google?: unknown;
  }
}
