import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { PaymentMethodCode } from "@sotechy/shared";
import { schema, type Tx } from "../db/client";
import { badRequest } from "../lib/errors";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Picks the best eligible promotion. Codeless promotions (e.g. the $MOVE offer) apply automatically. */
export async function findPromotion(
  tx: Tx,
  opts: { subtotal: number; paymentMethod: PaymentMethodCode; cryptoAsset?: string | null; code?: string | null; merchantId?: string | null },
) {
  const p = schema.promotions;
  const now = new Date();
  const rows = await tx
    .select()
    .from(p)
    .where(
      and(
        eq(p.isActive, true),
        // Codes are matched ignoring case and surrounding spaces
        opts.code ? eq(sql`upper(${p.code})`, opts.code.trim().toUpperCase()) : isNull(p.code),
        or(isNull(p.startsAt), lte(p.startsAt, now)),
        or(isNull(p.endsAt), gt(p.endsAt, now)),
      ),
    );

  let best: (typeof rows)[number] | null = null;
  let bestDiscount = 0;
  for (const promo of rows) {
    // A store's own code only works on that store's orders
    if (promo.merchantId && promo.merchantId !== (opts.merchantId ?? null)) continue;
    if (promo.paymentMethod && promo.paymentMethod !== opts.paymentMethod) continue;
    if (promo.cryptoAsset && promo.cryptoAsset !== opts.cryptoAsset) continue;
    if (promo.minOrderAmount != null && opts.subtotal < promo.minOrderAmount) continue;
    if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) continue;

    let discount = promo.discountType === "percentage" ? (opts.subtotal * promo.value) / 100 : promo.value;
    if (promo.maxDiscountAmount != null) discount = Math.min(discount, promo.maxDiscountAmount);
    discount = Math.min(round2(discount), opts.subtotal);
    if (discount > bestDiscount) {
      best = promo;
      bestDiscount = discount;
    }
  }

  if (opts.code && !best) throw badRequest("Promo code is not valid for this order");
  return { promotion: best, discount: bestDiscount };
}
