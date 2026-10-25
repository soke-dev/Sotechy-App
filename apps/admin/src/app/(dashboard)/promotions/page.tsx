import { formatDate, formatNaira, PAYMENT_METHOD_LABELS, type Promotion } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { createPromotion, togglePromotion } from "../actions";

export default async function PromotionsPage() {
  const { data, error } = await load<Promotion[]>("/admin/promotions");
  return (
    <>
      <PageHeader
        title="Promotions"
        description="Leave the code empty to apply automatically when eligible (e.g. up to 10% off when paying with $MOVE)"
      />
      <Card title="New promotion (managers)" className="mb-4">
        <ActionForm action={createPromotion} submitLabel="Create">
          <Field label="Name"><input name="name" required className={inputClass} /></Field>
          <Field label="Code (optional)"><input name="code" className={inputClass} /></Field>
          <Field label="Type">
            <select name="discountType" className={inputClass}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount (₦)</option>
            </select>
          </Field>
          <Field label="Value"><input name="value" type="number" step="0.01" required className={`${inputClass} w-24`} /></Field>
          <Field label="Max discount (₦)"><input name="maxDiscountAmount" type="number" className={`${inputClass} w-28`} /></Field>
          <Field label="Min order (₦)"><input name="minOrderAmount" type="number" className={`${inputClass} w-28`} /></Field>
          <Field label="Payment method">
            <select name="paymentMethod" className={inputClass}>
              <option value="">Any</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Crypto asset"><input name="cryptoAsset" placeholder="MOVE" className={`${inputClass} w-24`} /></Field>
          <Field label="Starts"><input name="startsAt" type="datetime-local" className={inputClass} /></Field>
          <Field label="Ends"><input name="endsAt" type="datetime-local" className={inputClass} /></Field>
          <Field label="Usage limit"><input name="usageLimit" type="number" className={`${inputClass} w-24`} /></Field>
          <label className="text-sm"><input type="checkbox" name="isActive" /> Active</label>
        </ActionForm>
      </Card>
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "Name", cell: (p) => p.name },
            { header: "Code", cell: (p) => p.code ?? "Automatic" },
            { header: "Discount", cell: (p) => (p.discountType === "percentage" ? `${p.value}%` : formatNaira(p.value)) + (p.maxDiscountAmount ? ` (max ${formatNaira(p.maxDiscountAmount)})` : "") },
            { header: "Eligibility", cell: (p) => [p.paymentMethod && PAYMENT_METHOD_LABELS[p.paymentMethod], p.cryptoAsset, p.minOrderAmount && `min ${formatNaira(p.minOrderAmount)}`].filter(Boolean).join(" · ") || "All orders" },
            { header: "Window", cell: (p) => `${formatDate(p.startsAt)} → ${formatDate(p.endsAt)}` },
            { header: "Used", cell: (p) => `${p.usageCount}${p.usageLimit ? ` / ${p.usageLimit}` : ""}` },
            {
              header: "Active",
              cell: (p) => (
                <ActionForm action={togglePromotion} submitLabel={p.isActive ? "Turn off" : "Turn on"}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="isActive" value={String(!p.isActive)} />
                  <span className="text-sm">{p.isActive ? "On" : "Off"}</span>
                </ActionForm>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
