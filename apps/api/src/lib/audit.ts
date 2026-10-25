import { schema, type Db, type Tx } from "../db/client";

export async function audit(
  tx: Db | Tx,
  entry: { actorId: string | null; action: string; entityType: string; entityId?: string | null; details?: Record<string, unknown> },
) {
  await tx.insert(schema.auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    details: entry.details ?? {},
  });
}
