"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { api, errorMessage, TOKEN_COOKIE } from "@/lib/api";

export async function login(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  let token: string;
  try {
    const res = await api.login({ email, password });
    if (res.user.role === "customer") return { error: "This account does not have staff access" };
    token = res.token;
  } catch (err) {
    return { error: errorMessage(err) };
  }
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/");
}
