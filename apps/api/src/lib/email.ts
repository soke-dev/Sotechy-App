// Email through Resend (https://resend.com/docs/api-reference/emails/send-email).
// Without RESEND_API_KEY (local dev) emails are printed to the console instead.
import { env } from "../env";

export interface Email {
  to: string;
  subject: string;
  /** Short plain-text version; also used as the preview line */
  text: string;
  html: string;
}

export async function sendEmail(email: Email): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(`\n[email not sent: no RESEND_API_KEY] to ${email.to}: ${email.subject}\n${email.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) throw new Error(`Resend refused the email (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

/** For emails nobody should wait on (welcome, notices): failures are logged, never thrown */
export function sendEmailLater(email: Email) {
  sendEmail(email).catch((err) => console.error("Email failed:", err instanceof Error ? err.message : err));
}
