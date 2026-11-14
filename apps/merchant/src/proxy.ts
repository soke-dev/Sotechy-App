import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "sotechy_merchant_token";
const OPEN = ["/login", "/signup", "/logout", "/forgot", "/terms", "/join"];
const API = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
/** The session is renewed at most once a day while the dashboard is used, and ends after 30 days unused */
const RENEW_AFTER_SECONDS = 60 * 60 * 24;
const KEEP_SECONDS = 60 * 60 * 24 * 30;

/** Seconds since the token was issued, read without checking it (the API checks it) */
function age(token: string) {
  try {
    const { iat } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return Math.floor(Date.now() / 1000) - Number(iat);
  } catch {
    return Infinity;
  }
}

/** A fresh token from the API; "rejected" when the session is over; null when the API couldn't be reached */
async function renew(token: string): Promise<string | "rejected" | null> {
  try {
    const res = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (res.status === 401 || res.status === 403) return "rejected";
    if (!res.ok) return null;
    return ((await res.json()) as { token: string }).token;
  } catch {
    return null;
  }
}

const keep = (res: NextResponse, token: string) =>
  res.cookies.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: KEEP_SECONDS });

// Optimistic check only: the API verifies the token on every request.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  const path = request.nextUrl.pathname;
  // The phone link from an ID check's QR code works without signing in
  const open = OPEN.includes(path) || path.startsWith("/verify-phone/");
  if (!token) return open ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));

  // On the sign-in page with a session: straight in if it's still good, otherwise forget it and sign in
  if (path === "/login") {
    const fresh = await renew(token);
    if (fresh === "rejected") {
      const res = NextResponse.next();
      res.cookies.delete(COOKIE);
      return res;
    }
    const res = NextResponse.redirect(new URL("/", request.url));
    if (fresh) keep(res, fresh);
    return res;
  }
  if (open || age(token) < RENEW_AFTER_SECONDS) return NextResponse.next();

  const fresh = await renew(token);
  if (fresh === "rejected") return NextResponse.redirect(new URL("/logout", request.url));
  const res = NextResponse.next();
  if (fresh) keep(res, fresh);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/|demo/|images/|illos/).*)"],
};
