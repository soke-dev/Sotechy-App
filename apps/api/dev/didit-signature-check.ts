// Quick check of Didit webhook signatures: npx tsx dev/didit-signature-check.ts (from apps/api)
process.env.DATABASE_URL ??= "postgres://unused";
process.env.JWT_SECRET ??= "unused-secret-for-this-check";
process.env.DIDIT_WEBHOOK_SECRET = "test-secret";

const { createHmac } = await import("node:crypto");
const { webhookIsGenuine } = await import("../src/services/didit");

const sign = (s: string) => createHmac("sha256", "test-secret").update(s, "utf8").digest("hex");
const now = String(Math.floor(Date.now() / 1000));
// Didit's canonical form: sorted keys at every level, compact, Unicode kept
const body = '{"status":"Approved","session_id":"abc","decision":{"liveness_checks":[{"status":"Approved","score":97}],"id_verifications":[{"full_name":"Adaèze Okafor"}]}}';
const canonical = '{"decision":{"id_verifications":[{"full_name":"Adaèze Okafor"}],"liveness_checks":[{"score":97,"status":"Approved"}]},"session_id":"abc","status":"Approved"}';
const headers = (h: Record<string, string>) => (name: string) => h[name];

const cases: [string, boolean, boolean][] = [
  ["V2 signature", webhookIsGenuine(body, headers({ "x-timestamp": now, "x-signature-v2": sign(canonical) })), true],
  ["raw-body signature", webhookIsGenuine(body, headers({ "x-timestamp": now, "x-signature": sign(body) })), true],
  ["previous secret header", webhookIsGenuine(body, headers({ "x-timestamp": now, "x-signature-v2-previous": sign(canonical) })), true],
  ["wrong signature", webhookIsGenuine(body, headers({ "x-timestamp": now, "x-signature-v2": sign("tampered") })), false],
  ["no signature", webhookIsGenuine(body, headers({ "x-timestamp": now })), false],
  ["old timestamp", webhookIsGenuine(body, headers({ "x-timestamp": String(Number(now) - 600), "x-signature-v2": sign(canonical) })), false],
  ["changed body", webhookIsGenuine(body.replace("Approved", "Declined"), headers({ "x-timestamp": now, "x-signature": sign(body) })), false],
];
let failed = 0;
for (const [name, got, want] of cases) {
  console.log(`${got === want ? "PASS" : "FAIL"} ${name}`);
  if (got !== want) failed++;
}
process.exit(failed ? 1 : 0);
