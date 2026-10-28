// What a marketplace store charges for an order, from its approved delivery areas: door delivery to the
// customer's state (and city, when the area lists cities), or collection at one of its pickup points.
import { and, eq, inArray } from "drizzle-orm";
import { areaDeliveryFee, deliveryAreaFor, type StoreDeliveryArea } from "@sotechy/shared";
import { schema, type Tx } from "../db/client";
import { badRequest } from "../lib/errors";

/** A store's approved, active areas, as shoppers see them */
export async function liveAreas(tx: Pick<Tx, "select">, merchantId: string): Promise<StoreDeliveryArea[]> {
  const z = schema.deliveryZones;
  const rows = await tx
    .select()
    .from(z)
    .where(and(eq(z.merchantId, merchantId), eq(z.review, "approved"), eq(z.isActive, true)));
  return rows.map((r) => ({
    id: r.id,
    state: r.state,
    areas: r.areas,
    homeFee: r.homeFee,
    pickupFee: r.pickupFee,
    pickupPoint: r.pickupPoint,
    pickupAddress: r.pickupAddress,
    pickupPlaces: r.pickupPlaces?.length ? r.pickupPlaces : r.pickupPoint ? [{ name: r.pickupPoint, address: r.pickupAddress ?? "" }] : [],
    days: r.days,
    freeOver: r.freeOver,
  }));
}

export async function storeDeliveryCharge(
  tx: Tx,
  merchantId: string,
  input: { fulfilment: "delivery" | "pickup"; state?: string; city?: string; pickupZoneId?: string; pickupPlace?: string; variantIds: string[]; subtotal: number },
): Promise<{ fee: number; zoneId: string | null; spot?: string | null }> {
  const areas = await liveAreas(tx, merchantId);
  const [store] = await tx.select({ name: schema.merchants.name }).from(schema.merchants).where(eq(schema.merchants.id, merchantId));

  if (input.fulfilment === "pickup") {
    // Only approved pickup locations: one waiting for Sotechy's approval can't be used yet
    const points = areas.filter((a) => a.pickupPoint);
    if (!points.length) throw badRequest(`${store?.name ?? "This store"} doesn't have a pickup location yet`);
    const point = points.find((a) => a.id === input.pickupZoneId);
    if (!point) throw badRequest("Choose where you'll collect your order");
    // Which of the area's pickup points (the first when none is named)
    const places = point.pickupPlaces ?? [];
    const place = input.pickupPlace ? places.find((p) => p.name === input.pickupPlace) : places[0];
    if (input.pickupPlace && !place) throw badRequest("That pickup point isn't available. Choose another.");
    // The point's own price, or the area's pickup price
    return { fee: place?.fee ?? point.pickupFee ?? 0, zoneId: point.id, spot: place ? [place.name, place.address].filter(Boolean).join(", ") : null };
  }

  const where = `${input.city ?? ""}, ${input.state ?? ""}`.replace(/^, |, $/g, "");
  const area = deliveryAreaFor(areas, input.state ?? "", input.city ?? "");
  if (!area) throw badRequest(`${store?.name ?? "This store"} doesn't deliver to ${where} yet`);

  // Each product names the areas it's delivered to
  const items = await tx
    .select({ name: schema.products.name, zones: schema.products.deliveryZoneIds })
    .from(schema.productVariants)
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(inArray(schema.productVariants.id, input.variantIds));
  const missing = items.find((p) => !(p.zones ?? []).includes(area.id));
  if (missing) throw badRequest(`${missing.name} isn't delivered to ${where}`);

  return { fee: areaDeliveryFee(area, input.subtotal), zoneId: area.id };
}
