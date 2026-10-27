"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@sotechy/shared";
import { api, errorMessage, TOKEN_COOKIE } from "./api";

export type FormState = { error: string } | null;

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
/** "0803 555 0142" and "+2348035550142" are the same number */
const sameNumber = (a: string, b: string) => a.replace(/\D/g, "").slice(-10) === b.replace(/\D/g, "").slice(-10);

async function keepSession(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** After signing in: the dashboard, or the last sign-up step for accounts with no store yet */
async function goOn(): Promise<never> {
  const { store } = await api.merchantMe();
  redirect(store ? "/" : "/signup?step=store");
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  try {
    const res = await api.login({ email: field(form, "email"), password: String(form.get("password") ?? "") });
    await keepSession(res.token);
  } catch (err) {
    return { error: errorMessage(err) };
  }
  return goOn();
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  try {
    const res = await api.register({
      email: field(form, "email"),
      password,
      fullName: [field(form, "firstName"), field(form, "lastName")].filter(Boolean).join(" "),
      username: field(form, "username") || undefined,
    });
    await keepSession(res.token);
  } catch (err) {
    return { error: errorMessage(err) };
  }
  redirect("/signup?step=store");
}

/** Google Identity Services hands the browser an ID token; the API checks it with Google */
export async function googleSignIn(idToken: string): Promise<FormState> {
  try {
    await keepSession((await api.googleSignIn(idToken)).token);
  } catch (err) {
    return { error: errorMessage(err) };
  }
  return goOn();
}

export type ResetState = { error: string; email?: string } | { sent: string } | null;

/** Step 1 of a forgotten password: email a code, step 2: the code and a new password */
export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const email = field(form, "email").toLowerCase();
  const code = field(form, "code");
  try {
    if (!code) {
      await api.forgotPassword(email);
      return { sent: email };
    }
    const res = await api.resetPassword({ email, code, password: String(form.get("password") ?? "") });
    await keepSession(res.token);
  } catch (err) {
    return { error: errorMessage(err), email: code ? email : undefined };
  }
  return goOn();
}

/** Local testing only, before a Google web client ID is set: a fixed test account stands in for Google */
export async function testGoogleSignIn(): Promise<FormState> {
  if (process.env.NODE_ENV === "production") return { error: "Google sign-in isn't set up yet" };
  const email = "google.merchant@example.com";
  const password = "google-test-123";
  try {
    const res = await api.login({ email, password }).catch(async (err) => {
      if (err instanceof ApiError && err.status === 401) return api.register({ email, password, fullName: "Google Tester" });
      throw err;
    });
    await keepSession(res.token);
  } catch (err) {
    return { error: errorMessage(err) };
  }
  return goOn();
}

export async function openStore(_: FormState, form: FormData): Promise<FormState> {
  const phone = field(form, "phone");
  const same = form.get("sameNumber") === "on";
  try {
    await api.openStore({
      name: field(form, "storeName"),
      sellerKind: field(form, "sellerKind") === "individual" ? "individual" : "registered",
      phone,
      whatsappPhone: same || sameNumber(field(form, "whatsapp"), phone) ? null : field(form, "whatsapp") || null,
      username: field(form, "username") || undefined,
    });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  redirect("/onboarding");
}

export async function signOut() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/login");
}

/** Is this @username free? (asked from the browser while someone types) */
export async function checkUsername(name: string) {
  try {
    return await api.checkUsername(name);
  } catch {
    return null;
  }
}

export type SaveState = { error: string } | { saved: true } | null;

export async function saveStoreDetails(_: SaveState, form: FormData): Promise<SaveState> {
  const phone = field(form, "contactPhone");
  const whatsapp = field(form, "contactWhatsapp");
  try {
    await api.updateStore({ name: field(form, "name"), contactPhone: phone, contactWhatsapp: !whatsapp || sameNumber(whatsapp, phone) ? null : whatsapp });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

/** The owner's own account: the same name, @username and numbers they have in the Sotechy app */
export async function saveProfile(_: SaveState, form: FormData): Promise<SaveState> {
  const phone = field(form, "phone");
  const whatsapp = field(form, "whatsappPhone");
  const username = field(form, "username").replace(/^@/, "").toLowerCase();
  try {
    await api.updateProfile({
      fullName: field(form, "fullName"),
      ...(username && { username }),
      phone: phone || null,
      whatsappPhone: !whatsapp || sameNumber(whatsapp, phone) ? null : whatsapp,
    });
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

/** Starts the owner's ID + liveness check with Didit; the browser then goes to the returned page */
export async function startIdCheck(): Promise<{ url: string } | { error: string }> {
  try {
    return await api.startIdCheck();
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function idCheckStatus() {
  try {
    return await api.idCheckStatus();
  } catch {
    return null;
  }
}
