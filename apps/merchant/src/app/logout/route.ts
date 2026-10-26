import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE } from "@/lib/api";

/** Clears an expired or rejected session (pages can't change cookies while rendering) */
export function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.delete(TOKEN_COOKIE);
  return res;
}
