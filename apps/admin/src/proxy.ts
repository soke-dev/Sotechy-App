import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: the API verifies the token and role on every request.
export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has("sotechy_admin_session");
  // Sessions need the emailed code, so the cookie is new; older sign-ins simply sign in again
  const isLogin = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/forgot";
  if (!hasToken && !isLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (hasToken && isLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|images/).*)"],
};
