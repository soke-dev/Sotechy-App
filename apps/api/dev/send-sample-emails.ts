// Sends every email design, with sample data, to one inbox so they can be checked in a real email app.
//   pnpm --filter @sotechy/api exec tsx --env-file=.env dev/send-sample-emails.ts you@example.com
// Images load from PUBLIC_API_URL (defaults to the live API), so it must be serving /email-assets.
process.env.PUBLIC_API_URL ??= "https://api-production-a623.up.railway.app";
process.env.DATABASE_URL ??= "postgres://unused";
process.env.JWT_SECRET ??= "unused-for-sample-emails-only";

const to = process.argv[2];
if (!to) throw new Error("Pass the inbox to send to");

const { SAMPLES } = await import("../src/emails/samples");
const { sendEmail } = await import("../src/lib/email");

for (const [name, [, make]] of Object.entries(SAMPLES)) {
  const email = make();
  if (!email) continue;
  await sendEmail({ ...email, to, subject: `[Sample] ${email.subject}` });
  console.log("sent", name);
  await new Promise((r) => setTimeout(r, 700)); // Resend allows about 2 a second
}
