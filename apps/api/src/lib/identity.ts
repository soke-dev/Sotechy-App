// Usernames, phone numbers and store names: shared rules for sign-up, profiles and stores.
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { tickerIdeas } from "@sotechy/shared";
import { badRequest, conflict } from "./errors";

/** Names nobody can take: Sotechy's own, and words that could confuse people */
const RESERVED = new Set([
  "sotechy", "admin", "administrator", "support", "help", "staff", "team", "official", "merchant", "merchants",
  "store", "stores", "shop", "wallet", "system", "root", "moneymoves", "money.moves", "security", "billing",
]);

export const normaliseUsername = (name: string) => name.trim().toLowerCase().replace(/^@/, "");

/** Words that would make an account look like it speaks for Sotechy; only staff may use them */
const OFFICIAL = /sotechy|s0techy|sotechi/;

/**
 * Why a username can't be used, or null if it's fine (availability is checked separately).
 * `staff`: Sotechy's own team may take names with "sotechy" in them.
 */
export function usernameRule(name: string, opts: { staff?: boolean } = {}): string | null {
  const n = normaliseUsername(name);
  if (n.length < 3) return "At least 3 characters";
  if (n.length > 20) return "20 characters at most";
  if (!/^[a-z0-9._]+$/.test(n)) return "Only letters, numbers, dots and underscores";
  if (/^[._]|[._]$/.test(n)) return "Can't start or end with a dot or underscore";
  if (/[._]{2}/.test(n)) return "No two dots or underscores in a row";
  if (RESERVED.has(n)) return `@${n} is reserved`;
  if (!opts.staff && OFFICIAL.test(n.replace(/[._]/g, ""))) return "Names with \"sotechy\" in them are kept for the Sotechy team";
  return null;
}

/** Checks a username is valid and not taken by someone else; returns it normalised */
export async function claimUsername(name: string, userId?: string, opts: { staff?: boolean } = {}) {
  const n = normaliseUsername(name);
  const problem = usernameRule(n, opts);
  if (problem) throw badRequest(problem);
  const [owner] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, n));
  if (owner && owner.id !== userId) throw conflict(`@${n} is taken`);
  return n;
}

/**
 * Nigerian numbers in one form: "0803 555 0142", "803 555 0142", "+234 803…" → "+2348035550142".
 * Returns null when it isn't a valid Nigerian mobile number (10 digits after +234).
 */
export function normaliseNgPhone(input: string): string | null {
  if (/[^\d\s+()-]/.test(input)) return null;
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "");
  return /^[789]\d{9}$/.test(local) ? `+234${local}` : null;
}

/** Optional phone fields: empty clears, anything else must be a Nigerian mobile number */
export function phoneField(value: string | null | undefined, label: string) {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const n = normaliseNgPhone(value);
  if (!n) throw badRequest(`${label} must be a Nigerian mobile number, like 0803 555 0142`);
  return n;
}

/** Store usernames that would clash with pages or look official */
const RESERVED_STORES = new Set(["admin", "api", "app", "help", "support", "login", "signup", "terms", "privacy", "store", "stores", "shop", "merchant", "merchants", "www", "mail", "official"]);

/**
 * Why a store username (its link, sotechy.shop/xena-gadgets) can't be used, or null if it's fine.
 * Lowercase letters, numbers and single hyphens, 3 to 30 long.
 */
export function storeHandleRule(handle: string, opts: { staff?: boolean } = {}): string | null {
  const h = handle.trim().toLowerCase().replace(/^@/, "");
  if (h.length < 3) return "At least 3 characters";
  if (h.length > 30) return "30 characters at most";
  if (!/^[a-z0-9-]+$/.test(h)) return "Only letters, numbers and hyphens";
  if (/^-|-$/.test(h)) return "Can't start or end with a hyphen";
  if (/--/.test(h)) return "No two hyphens in a row";
  if (RESERVED_STORES.has(h)) return `@${h} is reserved`;
  if (!opts.staff && OFFICIAL.test(h.replace(/-/g, ""))) return "Names with \"sotechy\" in them are kept for the Sotechy team";
  return null;
}

/** "Xena Gadgets & Co." → "xena-gadgets-co" */
export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "store";

/** "Xena Gadgets" → "XENA", "JB Phones" → "JBPHO": 3–5 capital letters for the store token */
export function tickerFrom(name: string) {
  const idea = tickerIdeas(name)[0];
  if (idea) return idea;
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const t = first.length >= 3 ? first : words.join("");
  return (t.length >= 3 ? t : `${t}STORE`).slice(0, 5);
}

/** A referral code is the referrer's @username. Returns their account id, or a 400 for an unknown code. */
export async function referrerFor(code: string | undefined, userId?: string) {
  if (!code?.trim()) return undefined;
  const n = normaliseUsername(code);
  const [referrer] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, n));
  if (!referrer) throw badRequest(`We couldn't find the referral code "${code.trim()}". Check it, or leave it empty.`);
  if (referrer.id === userId) throw badRequest("You can't use your own referral code");
  return referrer.id;
}

/** Whose name a bank account is in: the business (its trading or registered name), the owner, or neither */
export function accountNameMatch(accountName: string, businessNames: (string | null | undefined)[], ownerName: string): "business" | "owner" | null {
  const clean = (s: string) =>
    s
      .toUpperCase()
      .replace(/\b(LTD|LIMITED|ENTERPRISES?|VENTURES?|NIG|NIGERIA|GLOBAL|SERVICES?)\b|[^A-Z ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const name = clean(accountName);
  if (!name) return null;
  if (businessNames.some((b) => b && clean(b) === name)) return "business";
  const words = name.split(" ");
  const owner = clean(ownerName).split(" ").filter(Boolean);
  // Every part of the owner's name appears in the account name (banks often add a middle name)
  if (owner.length >= 2 && owner.every((part) => words.includes(part))) return "owner";
  return null;
}
