import { NextResponse, type NextRequest } from "next/server";

const OPEN = ["/login", "/signup", "/logout", "/forgot", "/terms", "/join"];

// Optimistic check only: the API verifies the token on every request.
export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has("sotechy_merchant_token");
  const path = request.nextUrl.pathname;
  // The phone link from an ID check's QR code works without signing in
  const open = OPEN.includes(path) || path.startsWith("/verify-phone/");
  if (!hasToken && !open) return NextResponse.redirect(new URL("/login", request.url));
  if (hasToken && path === "/login") return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/|demo/|images/|illos/).*)"],
};
