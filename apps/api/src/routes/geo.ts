// Address suggestions while typing, from Geoapify (OpenStreetMap data), limited to Nigeria. The key stays
// here; results are cached and each account gets a fair number of lookups so the free plan lasts.
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AddressSuggestion } from "@sotechy/shared";
import { env } from "../env";
import { requireAuth, type AppEnv } from "../lib/auth";
import { HttpError } from "../lib/errors";

const CACHE_MS = 24 * 3_600_000;
const cache = new Map<string, { at: number; results: AddressSuggestion[] }>();
// Lookups per account per hour
const PER_HOUR = 120;
const used = new Map<string, { since: number; count: number }>();

interface GeoapifyResult {
  formatted?: string;
  address_line1?: string;
  housenumber?: string;
  street?: string;
  name?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
}

/** Geoapify's answer in our shape: the street line, city and state the address forms need */
function toSuggestion(r: GeoapifyResult): AddressSuggestion | null {
  const city = r.city ?? r.town ?? r.village ?? r.county ?? "";
  const street = [r.housenumber, r.street].filter(Boolean).join(" ");
  const line1 = street || r.name || r.address_line1 || "";
  const label = (r.formatted ?? [line1, city, r.state].filter(Boolean).join(", ")).replace(/, Nigeria$/, "");
  if (!label) return null;
  return { label, line1: [line1, r.suburb && !line1.includes(r.suburb) ? r.suburb : null].filter(Boolean).join(", "), city, state: (r.state ?? "").replace(/ State$/, ""), postcode: r.postcode ?? null };
}

export const geoRoutes = new Hono<AppEnv>().get("/address", requireAuth, zValidator("query", z.object({ q: z.string().trim().min(3).max(120) })), async (c) => {
  // Without a key the forms just don't show suggestions
  if (!env.GEOAPIFY_API_KEY) return c.json([] as AddressSuggestion[]);
  const q = c.req.valid("query").q.toLowerCase().replace(/\s+/g, " ");

  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < CACHE_MS) return c.json(hit.results);

  const who = c.get("user").id;
  const mine = used.get(who);
  const fresh = !mine || Date.now() - mine.since > 3_600_000;
  if (!fresh && mine.count >= PER_HOUR) throw new HttpError(429, "Too many address searches. Type your address in instead.");
  used.set(who, fresh ? { since: Date.now(), count: 1 } : { ...mine, count: mine.count + 1 });

  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.search = new URLSearchParams({ text: q, filter: "countrycode:ng", format: "json", limit: "5", lang: "en", apiKey: env.GEOAPIFY_API_KEY }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(6_000) }).catch(() => null);
  if (!res?.ok) {
    console.warn("Geoapify lookup failed:", res?.status ?? "no response");
    return c.json([] as AddressSuggestion[]);
  }
  const body = (await res.json()) as { results?: GeoapifyResult[] };
  const seen = new Set<string>();
  const results = (body.results ?? [])
    .map(toSuggestion)
    .filter((s): s is AddressSuggestion => !!s && !seen.has(s.label) && !!seen.add(s.label));

  if (cache.size > 5_000) cache.clear();
  cache.set(q, { at: Date.now(), results });
  return c.json(results);
});
