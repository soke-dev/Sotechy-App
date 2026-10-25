import { and, eq } from "drizzle-orm";
import { db, schema, type Tx } from "../db/client";
import { audit } from "../lib/audit";
import type { AuthUser } from "../lib/auth";
import { badRequest } from "../lib/errors";

const { inventory, stockMovements } = schema;

async function lockOrCreate(tx: Tx, variantId: string, branchId: string) {
  await tx.insert(inventory).values({ variantId, branchId }).onConflictDoNothing();
  const [row] = await tx
    .select()
    .from(inventory)
    .where(and(eq(inventory.variantId, variantId), eq(inventory.branchId, branchId)))
    .for("update");
  return row;
}

/** Restock, count correction or customer return at one branch. `delta` is signed. */
export async function adjustStock(
  actor: AuthUser,
  input: { variantId: string; branchId: string; delta: number; type: "restock" | "adjustment" | "return"; note?: string },
) {
  if (!Number.isInteger(input.delta) || input.delta === 0) throw badRequest("Quantity change must be a non-zero whole number");
  if (input.type === "restock" && input.delta < 0) throw badRequest("Restock quantity must be positive");

  return db.transaction(async (tx) => {
    const inv = await lockOrCreate(tx, input.variantId, input.branchId);
    const next = inv.quantity + input.delta;
    if (next < inv.reserved) throw badRequest(`Cannot go below ${inv.reserved} units reserved by unpaid orders`);

    const [updated] = await tx.update(inventory).set({ quantity: next }).where(eq(inventory.id, inv.id)).returning();
    await tx.insert(stockMovements).values({
      variantId: input.variantId,
      branchId: input.branchId,
      movementType: input.type,
      quantity: input.delta,
      note: input.note ?? null,
      performedBy: actor.id,
    });
    await audit(tx, {
      actorId: actor.id,
      action: `stock.${input.type}`,
      entityType: "inventory",
      entityId: inv.id,
      details: { delta: input.delta, from: inv.quantity, to: next, note: input.note },
    });
    return updated;
  });
}

export async function transferStock(
  actor: AuthUser,
  input: { variantId: string; fromBranchId: string; toBranchId: string; quantity: number; note?: string },
) {
  if (input.fromBranchId === input.toBranchId) throw badRequest("Choose two different branches");
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw badRequest("Quantity must be a positive whole number");

  return db.transaction(async (tx) => {
    // Lock both rows in a stable order to avoid deadlocks.
    const [firstId, secondId] = [input.fromBranchId, input.toBranchId].sort();
    const first = await lockOrCreate(tx, input.variantId, firstId);
    const second = await lockOrCreate(tx, input.variantId, secondId);
    const from = first.branchId === input.fromBranchId ? first : second;
    const to = from === first ? second : first;

    if (from.quantity - from.reserved < input.quantity) throw badRequest("Not enough available stock at the source branch");

    await tx.update(inventory).set({ quantity: from.quantity - input.quantity }).where(eq(inventory.id, from.id));
    await tx.update(inventory).set({ quantity: to.quantity + input.quantity }).where(eq(inventory.id, to.id));
    await tx.insert(stockMovements).values([
      { variantId: input.variantId, branchId: from.branchId, movementType: "transfer_out", quantity: -input.quantity, note: input.note ?? null, performedBy: actor.id },
      { variantId: input.variantId, branchId: to.branchId, movementType: "transfer_in", quantity: input.quantity, note: input.note ?? null, performedBy: actor.id },
    ]);
    await audit(tx, {
      actorId: actor.id,
      action: "stock.transfer",
      entityType: "product_variant",
      entityId: input.variantId,
      details: { from: input.fromBranchId, to: input.toBranchId, quantity: input.quantity },
    });
    return { ok: true };
  });
}
