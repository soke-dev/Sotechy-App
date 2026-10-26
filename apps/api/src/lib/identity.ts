// Usernames and phone numbers: shared rules for sign-up and profile updates.

/** Names nobody can take: Sotechy's own, and words that could confuse people */
const RESERVED = new Set([
  "sotechy", "admin", "administrator", "support", "help", "staff", "team", "official", "merchant", "merchants",
  "store", "stores", "shop", "wallet", "system", "root", "moneymoves", "money.moves", "security", "billing",
]);

export const normaliseUsername = (name: string) => name.trim().toLowerCase().replace(/^@/, "");

/** Why a username can't be used, or null if it's fine (availability is checked separately) */
export function usernameRule(name: string): string | null {
  const n = normaliseUsername(name);
  if (n.length < 3) return "At least 3 characters";
  if (n.length > 20) return "20 characters at most";
  if (!/^[a-z0-9._]+$/.test(n)) return "Only letters, numbers, dots and underscores";
  if (/^[._]|[._]$/.test(n)) return "Can't start or end with a dot or underscore";
  if (/[._]{2}/.test(n)) return "No two dots or underscores in a row";
  if (RESERVED.has(n)) return `@${n} is reserved`;
  return null;
}

/**
 * Nigerian numbers in one form: "0803 555 0142", "803 555 0142", "+234 803…" → "+2348035550142".
 * Returns null when it isn't a valid Nigerian mobile number (10 digits after +234).
 */
export function normaliseNgPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "");
  return /^[789]\d{9}$/.test(local) ? `+234${local}` : null;
}
