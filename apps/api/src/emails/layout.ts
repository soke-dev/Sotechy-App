// Sotechy's email look: cream page, white card, the illustrated hero from the app, warm orange accents.
// Email apps need tables and inline styles (and PNG, not SVG), so everything here is written that way.
// Art lives in apps/api/public/email (made by apps/merchant/scripts/email-art.tsx) and is served at /email-assets.
import { formatNaira } from "@sotechy/shared";
import { env, publicApiUrl } from "../env";

export type Hero =
  | "welcome" | "code" | "paid" | "processing" | "ready" | "dispatched" | "delivered" | "cancelled" | "refunded"
  | "offer" | "offer-accepted" | "store-notice" | "store-opened" | "new-order" | "payout" | "verified" | "featured";
export type Icon = "pin" | "bike" | "store" | "phone" | "coin" | "receipt" | "box" | "tag" | "bank" | "chat" | "card" | "wallet" | "heart" | "shield" | "sparkle" | "doc";

export interface LineItem {
  name: string;
  detail?: string;
  quantity: number;
  /** Line total in naira */
  amount: number;
  image?: string | null;
}

export type Block =
  | { kind: "text"; text: string }
  | { kind: "code"; code: string; caption: string }
  | { kind: "button"; label: string; url: string }
  | { kind: "tracker"; steps: string[]; at: number }
  | { kind: "items"; items: LineItem[]; totals: { label: string; amount: number; strong?: boolean }[] }
  | { kind: "rows"; rows: { icon: Icon; label: string; value: string }[] }
  | { kind: "note"; text: string; tone?: "brand" | "good" | "warn" | "bad"; icon?: Icon }
  | { kind: "checklist"; items: { done: boolean; text: string }[] }
  | { kind: "price"; was: number; now: number; caption: string };

export interface EmailContent {
  /** Grey preview line shown after the subject in the inbox */
  preheader: string;
  hero: Hero;
  eyebrow?: string;
  heading: string;
  blocks: Block[];
  /** Why they got it, shown in the footer */
  reason: string;
}

const C = {
  page: "#FAF6F1",
  card: "#FFFFFF",
  soft: "#FFF4E3",
  line: "#EFE6DC",
  ink: "#1A1410",
  ink2: "#4A4039",
  muted: "#8C8178",
  brand: "#F7931E",
  brandStrong: "#D9770A",
  good: "#1F9D55",
  goodSoft: "#E6F6EC",
  warnSoft: "#FFF4D6",
  bad: "#C2410C",
  badSoft: "#FDECE4",
};
const FONT = "'DM Sans', 'Segoe UI', Helvetica, Arial, sans-serif";
const DISPLAY = "'Bricolage Grotesque', 'Segoe UI', Helvetica, Arial, sans-serif";

export const assetUrl = (file: string) => `${publicApiUrl || `http://localhost:${env.PORT}`}/email-assets/${file}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** **bold** in copy */
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.ink}">$1</strong>`);

function block(b: Block): string {
  switch (b.kind) {
    case "text":
      return `<p style="margin:0 0 14px;font:400 15px/1.6 ${FONT};color:${C.ink2}">${rich(b.text)}</p>`;

    case "code":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td align="center" style="background:${C.soft};border-radius:18px;padding:22px 12px">
        <div style="font:800 36px/1 ${DISPLAY};letter-spacing:10px;color:${C.ink};padding-left:10px">${esc(b.code)}</div>
        <div style="margin-top:10px;font:500 13px/1.4 ${FONT};color:${C.muted}">${esc(b.caption)}</div>
      </td></tr></table>`;

    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px"><tr><td style="background:${C.ink};border-radius:999px">
        <a href="${esc(b.url)}" style="display:inline-block;padding:14px 28px;font:700 15px/1 ${FONT};color:#ffffff;text-decoration:none">${esc(b.label)} &rarr;</a>
      </td></tr></table>`;

    case "tracker": {
      const cells = b.steps
        .map((step, i) => {
          const done = i <= b.at;
          const dot = done
            ? `<div style="width:26px;height:26px;border-radius:13px;background:${C.brand};color:#fff;font:800 13px/26px ${FONT};text-align:center;margin:0 auto">${i < b.at ? "&#10003;" : i + 1}</div>`
            : `<div style="width:22px;height:22px;border-radius:13px;border:2px solid ${C.line};background:#fff;color:${C.muted};font:700 12px/22px ${FONT};text-align:center;margin:0 auto">${i + 1}</div>`;
          return `<td align="center" valign="top" width="${Math.floor(100 / b.steps.length)}%" style="padding:0 2px">${dot}
            <div style="margin-top:8px;font:${i === b.at ? 700 : 500} 12px/1.3 ${FONT};color:${done ? C.ink : C.muted}">${esc(step)}</div></td>`;
        })
        .join("");
      const pct = Math.round((b.at / Math.max(1, b.steps.length - 1)) * 100);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;background:${C.soft};border-radius:18px"><tr><td style="padding:18px 10px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 12% 0">
          <div style="height:4px;background:${C.line};border-radius:2px"><div style="height:4px;width:${pct}%;background:${C.brand};border-radius:2px"></div></div>
        </td></tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:-15px"><tr>${cells}</tr></table>
      </td></tr></table>`;
    }

    case "items": {
      const rows = b.items
        .map(
          (it) => `<tr>
          <td width="56" valign="top" style="padding:12px 0">${
            it.image
              ? `<img src="${esc(it.image)}" width="48" height="48" alt="" style="display:block;border-radius:12px;object-fit:cover;background:${C.soft}">`
              : `<div style="width:48px;height:48px;border-radius:12px;background:${C.soft};text-align:center"><img src="${assetUrl("icon-box.png")}" width="28" height="28" alt="" style="margin-top:10px"></div>`
          }</td>
          <td valign="top" style="padding:12px 8px 12px 4px;font:600 14px/1.4 ${FONT};color:${C.ink}">${esc(it.name)}
            <div style="font:400 13px/1.4 ${FONT};color:${C.muted}">${it.detail ? `${esc(it.detail)} &middot; ` : ""}Qty ${it.quantity}</div></td>
          <td valign="top" align="right" style="padding:12px 0;font:700 14px/1.4 ${FONT};color:${C.ink};white-space:nowrap">${formatNaira(it.amount)}</td>
        </tr>`,
        )
        .join(`<tr><td colspan="3" style="border-top:1px solid ${C.line};font-size:0;line-height:0">&nbsp;</td></tr>`);
      const totals = b.totals
        .map(
          (t) => `<tr><td style="padding:${t.strong ? "10px 0 0" : "3px 0"};font:${t.strong ? `800 16px` : `400 14px`}/1.4 ${t.strong ? DISPLAY : FONT};color:${t.strong ? C.ink : C.ink2}">${esc(t.label)}</td>
          <td align="right" style="padding:${t.strong ? "10px 0 0" : "3px 0"};font:${t.strong ? `800 16px` : `500 14px`}/1.4 ${t.strong ? DISPLAY : FONT};color:${t.amount < 0 ? C.good : C.ink}">${t.amount < 0 ? `&minus;${formatNaira(-t.amount)}` : formatNaira(t.amount)}</td></tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px">${rows}</table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:1px solid ${C.line};padding-top:10px">${totals}</table>`;
    }

    case "rows":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid ${C.line};border-radius:18px">${b.rows
        .map(
          (r, i) => `<tr><td width="52" valign="top" style="padding:14px 0 14px 16px;${i ? `border-top:1px solid ${C.line}` : ""}"><img src="${assetUrl(`icon-${r.icon}.png`)}" width="30" height="30" alt=""></td>
          <td style="padding:14px 16px 14px 6px;${i ? `border-top:1px solid ${C.line}` : ""}"><div style="font:600 12px/1.3 ${FONT};color:${C.muted};text-transform:uppercase;letter-spacing:.6px">${esc(r.label)}</div>
          <div style="margin-top:3px;font:500 14px/1.5 ${FONT};color:${C.ink}">${rich(r.value)}</div></td></tr>`,
        )
        .join("")}</table>`;

    case "note": {
      const tone = { brand: [C.soft, C.ink2], good: [C.goodSoft, "#14532D"], warn: [C.warnSoft, "#713F12"], bad: [C.badSoft, C.bad] }[b.tone ?? "brand"];
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr><td style="background:${tone[0]};border-radius:16px;padding:14px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>${b.icon ? `<td valign="top" width="34"><img src="${assetUrl(`icon-${b.icon}.png`)}" width="24" height="24" alt=""></td>` : ""}
        <td style="font:500 14px/1.5 ${FONT};color:${tone[1]}">${rich(b.text)}</td></tr></table>
      </td></tr></table>`;
    }

    case "checklist":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">${b.items
        .map(
          (it) => `<tr><td width="34" valign="top" style="padding:7px 0">${
            it.done
              ? `<div style="width:22px;height:22px;border-radius:11px;background:${C.good};color:#fff;font:800 12px/22px ${FONT};text-align:center">&#10003;</div>`
              : `<div style="width:18px;height:18px;border-radius:11px;border:2px solid ${C.line}"></div>`
          }</td><td style="padding:7px 0;font:${it.done ? 400 : 600} 14px/1.5 ${FONT};color:${it.done ? C.muted : C.ink};${it.done ? "text-decoration:line-through" : ""}">${rich(it.text)}</td></tr>`,
        )
        .join("")}</table>`;

    case "price":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px"><tr><td align="center" style="background:${C.soft};border-radius:18px;padding:20px 12px">
        <div style="font:500 15px/1 ${FONT};color:${C.muted};text-decoration:line-through">${formatNaira(b.was)}</div>
        <div style="margin-top:8px;font:800 34px/1 ${DISPLAY};color:${C.ink}">${formatNaira(b.now)}</div>
        <div style="margin-top:10px;font:600 13px/1.4 ${FONT};color:${C.brandStrong}">${esc(b.caption)}</div>
      </td></tr></table>`;
  }
}

/** Plain-text version for email apps that don't show HTML (and for spam filters) */
function blockText(b: Block): string {
  switch (b.kind) {
    case "text":
    case "note":
      return b.text.replace(/\*\*/g, "");
    case "code":
      return `${b.code}\n${b.caption}`;
    case "button":
      return `${b.label}: ${b.url}`;
    case "tracker":
      return b.steps.map((s, i) => `${i <= b.at ? "[x]" : "[ ]"} ${s}`).join("  ");
    case "items":
      return [...b.items.map((i) => `${i.quantity} x ${i.name}  ${formatNaira(i.amount)}`), ...b.totals.map((t) => `${t.label}: ${formatNaira(t.amount)}`)].join("\n");
    case "rows":
      return b.rows.map((r) => `${r.label}: ${r.value.replace(/\*\*/g, "")}`).join("\n");
    case "checklist":
      return b.items.map((i) => `${i.done ? "[x]" : "[ ]"} ${i.text.replace(/\*\*/g, "")}`).join("\n");
    case "price":
      return `${formatNaira(b.now)} (was ${formatNaira(b.was)}). ${b.caption}`;
  }
}

export function renderEmail(e: EmailContent): { html: string; text: string } {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<title>${esc(e.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:28px 14px 36px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 6px 18px"><img src="${assetUrl("logo.png")}" width="104" height="52" alt="SoTechy" style="display:block"></td></tr>
    <tr><td style="background:${C.card};border-radius:28px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="background:${C.soft};padding:8px 0 0"><img src="${assetUrl(`hero-${e.hero}.png`)}" width="280" height="150" alt="" style="display:block;width:280px;max-width:80%;height:auto"></td></tr>
        <tr><td style="padding:28px 28px 12px">
          ${e.eyebrow ? `<div style="margin:0 0 8px;font:700 12px/1 ${FONT};letter-spacing:1.4px;text-transform:uppercase;color:${C.brandStrong}">${esc(e.eyebrow)}</div>` : ""}
          <h1 style="margin:0 0 14px;font:800 26px/1.2 ${DISPLAY};color:${C.ink}">${esc(e.heading)}</h1>
          ${e.blocks.map(block).join("\n")}
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:22px 18px 0;font:400 12px/1.6 ${FONT};color:${C.muted};text-align:center">
      ${esc(e.reason)}<br>Sotechy Shop &middot; Benin City, Nigeria &middot; <a href="https://www.sotechy.shop" style="color:${C.muted}">sotechy.shop</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
  const text = [e.heading, "", ...e.blocks.map(blockText).filter(Boolean).flatMap((t) => [t, ""]), "--", e.reason, "Sotechy Shop · sotechy.shop"].join("\n");
  return { html, text };
}
