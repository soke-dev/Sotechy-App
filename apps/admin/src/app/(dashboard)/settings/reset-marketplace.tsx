"use client";

// Settings → Danger zone: download a backup, then delete every store and everything tied to stores.
import { Download, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, ErrorNote } from "@/components/ui";
import { resetMarketplace } from "../actions";

export interface ResetPreview {
  stores: number;
  products: number;
  orders: number;
  payments: number;
  refunds: number;
  payouts: number;
  offers: number;
  walkIns: number;
  tokenRecords: number;
  reserveRecords: number;
  receipts: number;
  chainQueue: number;
  purchaseOrders: number;
  ownerAccounts: number;
  phrase: string;
}

const LINES: [keyof ResetPreview, string][] = [
  ["stores", "Stores, including Sotechy's own"],
  ["products", "Products (Sotechy's catalogue too), with their options, stock and reviews"],
  ["orders", "Orders"],
  ["payments", "Payments"],
  ["refunds", "Refunds"],
  ["payouts", "Store payouts"],
  ["offers", "Price offers"],
  ["walkIns", "Walk-in sales"],
  ["tokenRecords", "Token records (every customer's balance, $SOTECHY too)"],
  ["reserveRecords", "Token reserve records"],
  ["receipts", "Receipts"],
  ["chainQueue", "Blockchain writes still waiting"],
  ["purchaseOrders", "Restocking orders"],
  ["ownerAccounts", "Store owners' accounts (never admins)"],
];

export function ResetMarketplace({ preview }: { preview: ResetPreview }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [backedUp, setBackedUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, number> | null>(null);
  const [pending, start] = useTransition();
  const ready = typed.trim() === preview.phrase && backedUp && !pending;

  return (
    <Card title="Danger zone: reset the marketplace" className="border-bad/40 xl:col-span-2">
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex gap-3 rounded-xl bg-bad-soft px-4 py-3 text-bad">
          <TriangleAlert size={20} className="mt-0.5 shrink-0" />
          <p>
            This permanently deletes every store and everything tied to stores. It can&apos;t be undone from here. Categories, Sotechy&apos;s banners and pop-ups, settings, customers and support chats
            stay. Anything already written on Monad or Base stays on the blockchain.
          </p>
        </div>

        <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {LINES.map(([key, label]) => (
            <li key={key} className="flex justify-between gap-3 border-b border-line py-1">
              <span className="text-ink-2">{label}</span>
              <span className="font-semibold tabular-nums">{Number(preview[key]).toLocaleString()}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <p className="font-semibold">1. Download a backup first</p>
          <a
            href="/settings/backup"
            onClick={() => setBackedUp(true)}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 font-semibold hover:bg-surface-alt"
          >
            <Download size={16} /> Download full backup
          </a>
          <p className="text-xs text-muted">Every table, every row, in one file. Keep it somewhere safe.</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-semibold">
            2. Type <span className="rounded bg-surface-alt px-1.5 py-0.5 font-mono">{preview.phrase}</span> to confirm
          </p>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={preview.phrase} className="h-11 max-w-sm rounded-xl border border-line bg-surface px-3 font-mono" />
        </div>

        <ErrorNote error={error} />
        {done ? (
          <p className="rounded-xl bg-good-soft px-4 py-3 font-semibold text-good">
            Done: {Number(done.stores ?? 0).toLocaleString()} stores, {Number(done.products ?? 0).toLocaleString()} products and {Number(done.orders ?? 0).toLocaleString()} orders deleted.
          </p>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await resetMarketplace(typed);
                if ("error" in r) setError(r.error);
                else {
                  setDone(r.deleted);
                  router.refresh();
                }
              })
            }
            className="inline-flex h-11 w-fit items-center rounded-full bg-bad px-5 font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Deleting…" : "Delete all stores and their data"}
          </button>
        )}
        {!backedUp && !done && <p className="text-xs text-muted">The delete button turns on after you download the backup and type the phrase.</p>}
      </div>
    </Card>
  );
}
