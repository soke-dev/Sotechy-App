"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, errorMessage, TOKEN_COOKIE } from "@/lib/api";

export type LoginState = { step: "password"; error?: string } | { step: "code"; challengeId: string; email: string; error?: string };

/** Step 1: the right email and password email a 6-digit code. Step 2: the code signs in. */
export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (prev.step === "password") {
    const email = String(formData.get("email") ?? "").trim();
    try {
      const { challengeId } = await api.staffLogin({ email, password: String(formData.get("password") ?? "") });
      return { step: "code", challengeId, email };
    } catch (err) {
      return { step: "password", error: errorMessage(err) };
    }
  }
  let token: string;
  try {
    token = (await api.staffVerify({ challengeId: prev.challengeId, code: String(formData.get("code") ?? "").trim() })).token;
  } catch (err) {
    return { ...prev, error: errorMessage(err) };
  }
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Kept for a week; proxy.ts renews it while the dashboard is used
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/");
}

export type ResetState = { step: "email"; error?: string } | { step: "code"; email: string; error?: string };

/** Forgotten password: email a code, then the code and a new password. Afterwards, sign in as usual. */
export async function resetPassword(prev: ResetState, formData: FormData): Promise<ResetState> {
  if (prev.step === "email") {
    const email = String(formData.get("email") ?? "").trim();
    try {
      await api.forgotPassword(email);
      return { step: "code", email };
    } catch (err) {
      return { step: "email", error: errorMessage(err) };
    }
  }
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("confirm") ?? "")) return { ...prev, error: "The passwords don't match" };
  try {
    await api.resetPassword({ email: prev.email, code: String(formData.get("code") ?? "").trim(), password });
  } catch (err) {
    return { ...prev, error: errorMessage(err) };
  }
  redirect("/login?reset=1");
}
