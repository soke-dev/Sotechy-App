// Email through Resend (https://resend.com/docs/api-reference/emails/send-email).
// Without RESEND_API_KEY, or outside production unless EMAIL_SEND_IN_DEV=true, emails are printed to the console instead.
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
  // Local runs and tests send nothing real unless asked to
  if (env.NODE_ENV !== "production" && env.EMAIL_SEND_IN_DEV !== "true") {
    console.log(`\n[email not sent: local] to ${email.to}: ${email.subject}\n${email.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) {
    const why = `Resend refused the email (${res.status}): ${(await res.text()).slice(0, 300)}`;
    if (env.NODE_ENV === "production") throw new Error(why);
    // Locally, test addresses (like admin@local.test) are refused; print it so codes can still be used
    console.log(`\n[email not sent: ${why}] to ${email.to}: ${email.subject}\n${email.text}\n`);
  } else {
    // Logged in production too (address partly hidden), so a missing email can be traced
    const to = email.to.replace(/^(.{2}).*(@.*)$/, "$1…$2");
    console.log(`[email sent] to ${to}: ${email.subject}`);
  }
}

/** For emails nobody should wait on (welcome, notices): failures are logged, never thrown */
export function sendEmailLater(email: Email) {
  sendEmail(email).catch((err) => console.error("Email failed:", err instanceof Error ? err.message : err));
}
