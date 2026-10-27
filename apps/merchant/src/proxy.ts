import { NextResponse, type NextRequest } from "next/server";

const OPEN = ["/login", "/signup", "/logout", "/forgot"];

// Optimistic check only: the API verifies the token on every request.
export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has("sotechy_merchant_token");
  const path = request.nextUrl.pathname;
  if (!hasToken && !OPEN.includes(path)) return NextResponse.redirect(new URL("/login", request.url));
  if (hasToken && path === "/login") return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/|demo/|images/|illos/).*)"],
};
