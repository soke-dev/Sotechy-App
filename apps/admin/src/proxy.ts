import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "sotechy_admin_session";
const API = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
/** The session is renewed at most once an hour while the dashboard is used, and ends after a week unused */
const RENEW_AFTER_SECONDS = 60 * 60;
const KEEP_SECONDS = 60 * 60 * 24 * 7;

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

// Optimistic check only: the API verifies the token and role on every request.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  const isLogin = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/forgot";
  if (!token) return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));

  // On the sign-in page with a session: straight in if it's still good, otherwise forget it and sign in
  if (isLogin) {
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

  if (age(token) < RENEW_AFTER_SECONDS) return NextResponse.next();
  const fresh = await renew(token);
  if (fresh === "rejected") {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(COOKIE);
    return res;
  }
  const res = NextResponse.next();
  if (fresh) keep(res, fresh);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|images/).*)"],
};
