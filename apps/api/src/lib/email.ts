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

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Sotechy's simple email layout: cream page, white card, orange accent */
export function layout(opts: { heading: string; paragraphs: string[]; code?: string; footer?: string }) {
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#4a4039">${escape(t)}</p>`;
  return `<!doctype html><html><body style="margin:0;background:#faf6f1;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f1;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:20px;font-weight:800;color:#f7931e">SoTechy</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#1a1410">${escape(opts.heading)}</h1>
${opts.paragraphs.map(p).join("")}
${opts.code ? `<p style="margin:20px 0;font-size:34px;font-weight:800;letter-spacing:8px;color:#1a1410">${escape(opts.code)}</p>` : ""}
<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#9a8f86">${escape(opts.footer ?? "Sotechy Shop · Benin City, Nigeria")}</p>
</td></tr></table></td></tr></table></body></html>`;
}
