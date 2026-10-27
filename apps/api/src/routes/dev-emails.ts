// Local-only preview of every email with sample data: open /dev/emails on the local API.
import { Hono } from "hono";
import { assetUrl } from "../emails/layout";
import { SAMPLES } from "../emails/samples";

/** Image links point at the address the preview was opened from, so they load on any network */
const localAssets = (html: string, url: string) => html.replaceAll(assetUrl(""), `${new URL(url).origin}/email-assets/`);

const page = (body: string) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sotechy emails</title>
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#f3ede6;color:#1a1410}main{max-width:1180px;margin:0 auto;padding:24px 16px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px;color:#8c8178;text-transform:uppercase;letter-spacing:1px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}.card{background:#fff;border-radius:18px;overflow:hidden}
.card header{padding:10px 14px;font-weight:600;display:flex;justify-content:space-between;gap:8px}.card header span{color:#8c8178;font-weight:400;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
iframe{border:0;width:100%;height:560px;display:block;background:#faf6f1}a{color:#d9770a}</style></head><body><main>${body}</main></body></html>`;

export const devEmailRoutes = new Hono()
  .get("/", (c) => {
    const groups = ["Customers", "Merchants"] as const;
    const body = groups
      .map((g) => {
        const cards = Object.entries(SAMPLES)
          .filter(([, [who]]) => who === g)
          .map(([name, [, make]]) => {
            const email = make();
            return email
              ? `<div class="card"><header><a href="/dev/emails/${name}">${name}</a><span title="${email.subject}">${email.subject}</span></header><iframe loading="lazy" src="/dev/emails/${name}"></iframe></div>`
              : "";
          })
          .join("");
        return `<h2>${g}</h2><div class="grid">${cards}</div>`;
      })
      .join("");
    return c.html(page(`<h1>Sotechy emails</h1><p>Every email with sample data. Click a name to open it full size.</p>${body}`));
  })
  .get("/:name", (c) => {
    const sample = SAMPLES[c.req.param("name")];
    const email = sample?.[1]();
    return email ? c.html(localAssets(email.html, c.req.url)) : c.notFound();
  })
  .get("/:name/text", (c) => {
    const email = SAMPLES[c.req.param("name")]?.[1]();
    return email ? c.text(`Subject: ${email.subject}\n\n${email.text}`) : c.notFound();
  });
