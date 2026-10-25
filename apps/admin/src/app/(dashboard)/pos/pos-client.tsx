"use client";

import { useState, useTransition } from "react";
import { formatNaira, type Branch, type PaymentMethodCode, type PaymentMethodConfig } from "@sotechy/shared";
import { buttonClass, Card, Field, inputClass, secondaryButtonClass } from "@/components/ui";
import type { PosSearchRow } from "@/lib/types";
import { recordSale } from "../actions";

interface Line {
  variantId: string;
  label: string;
  price: number;
  quantity: number;
}

export function PosClient({
  branches,
  defaultBranchId,
  products,
  paymentMethods,
}: {
  branches: Branch[];
  defaultBranchId: string | null;
  products: PosSearchRow[];
  paymentMethods: PaymentMethodConfig[];
}) {
  const [branchId, setBranchId] = useState(defaultBranchId ?? branches[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<PaymentMethodCode>(paymentMethods[0]?.code ?? "cash");
  const [reference, setReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [result, setResult] = useState<{ error?: string; message?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const matches = products
    .filter((p) => `${p.productName} ${p.variantName} ${p.sku}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 20);
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  function add(p: PosSearchRow) {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === p.variantId);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { variantId: p.variantId, label: `${p.productName} — ${p.variantName}`, price: p.price, quantity: 1 }];
    });
  }

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = await recordSale({
        branchId,
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        paymentMethod: method,
        paymentReference: reference || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      });
      setResult(res);
      if (!res.error) {
        setLines([]);
        setReference("");
        setCustomerName("");
        setCustomerPhone("");
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Find product">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU" className={`${inputClass} mb-3 w-full`} />
        <ul className="divide-y divide-neutral-100 text-sm">
          {matches.map((p) => (
            <li key={p.variantId} className="flex items-center justify-between gap-2 py-2">
              <div>
                <p>{p.productName} — {p.variantName}</p>
                <p className="text-xs text-neutral-500">
                  {p.sku} · {formatNaira(p.price)}
                  {p.quantity != null && ` · ${p.quantity - (p.reserved ?? 0)} available here`}
                </p>
              </div>
              <button onClick={() => add(p)} className={secondaryButtonClass}>Add</button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Sale">
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Field label="Branch">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputClass}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Payment">
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodCode)} className={inputClass}>
              {paymentMethods.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Customer name (optional)"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} /></Field>
          <Field label="Customer phone (optional)"><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputClass} /></Field>
          {method === "pos_terminal" && (
            <Field label="Terminal reference"><input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} /></Field>
          )}
        </div>
        {(method === "bank_transfer" || method === "crypto") && (
          <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
            Transfers and crypto are saved as pending. Stock is held until a manager confirms the money arrived.
          </p>
        )}
        <ul className="mb-3 divide-y divide-neutral-100 text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="flex items-center justify-between gap-2 py-2">
              <span className="flex-1">{l.label}</span>
              <input
                type="number"
                min={1}
                value={l.quantity}
                onChange={(e) => setLines((prev) => prev.map((x) => (x === l ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x)))}
                className={`${inputClass} w-16`}
              />
              <span className="w-28 text-right">{formatNaira(l.price * l.quantity)}</span>
              <button onClick={() => setLines((prev) => prev.filter((x) => x !== l))} className="text-red-600">✕</button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{formatNaira(total)}</span>
          <button disabled={pending || lines.length === 0 || !branchId} onClick={submit} className={buttonClass}>
            {pending ? "Recording…" : "Record sale"}
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-500">Final total is calculated by the server (eligible promotions apply).</p>
        {result?.error && <p className="mt-2 text-sm text-red-600">{result.error}</p>}
        {result?.message && <p className="mt-2 text-sm text-green-700">{result.message}</p>}
      </Card>
    </div>
  );
}
