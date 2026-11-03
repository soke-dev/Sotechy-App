"use server";

// Sotechy's own ID check: sending it (signed in, or from the phone through a one-time link) and making
// the "continue on your phone" link and its QR code.
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { errorMessage, TOKEN_COOKIE } from "./api";

const API = () => (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
type Result<T> = { ok: T } | { error: string };

async function call<T>(path: string, init: RequestInit & { auth?: boolean }): Promise<Result<T>> {
  const token = init.auth ? (await cookies()).get(TOKEN_COOKIE)?.value : undefined;
  try {
    const res = await fetch(`${API()}${path}`, { ...init, headers: { ...(token && { Authorization: `Bearer ${token}` }), ...init.headers }, cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { error: json?.error ?? "Something went wrong. Please try again." };
    return { ok: json as T };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

/** Sends the check from the signed-in dashboard (multipart: idType, idPhoto, selfie, video) */
export async function submitIdCheck(form: FormData) {
  return call<{ id: string }>("/merchant/verification/manual", { method: "POST", body: form, auth: true });
}

/** A one-time link for the owner's phone, with its QR code (as an SVG) */
export async function makePhoneLink(origin: string) {
  const r = await call<{ token: string; expiresAt: string }>("/merchant/verification/handoff", { method: "POST", auth: true });
  if ("error" in r) return r;
  // The site's own address, so the link opens the same dashboard the owner is on
  const base = /^https?:\/\/[a-z0-9.:-]+$/i.test(origin) ? origin : "https://merchant.sotechy.shop";
  const url = `${base}/verify-phone/${r.ok.token}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#17120e", light: "#ffffff" }, errorCorrectionLevel: "M" });
  return { ok: { url, svg, expiresAt: r.ok.expiresAt } };
}

export interface HandoffInfo {
  storeName: string;
  ownerName: string | null;
  status: string;
  check: { idType: string; status: string; redoItems: string[]; note: string | null } | null;
}

/** What the phone link is for (no sign-in) */
export async function loadHandoff(token: string) {
  return call<HandoffInfo>(`/id-handoff/${encodeURIComponent(token)}`, { method: "GET" });
}

/** Sends the check from the phone, through the one-time link */
export async function submitHandoff(token: string, form: FormData) {
  return call<{ id: string }>(`/id-handoff/${encodeURIComponent(token)}`, { method: "POST", body: form });
}
