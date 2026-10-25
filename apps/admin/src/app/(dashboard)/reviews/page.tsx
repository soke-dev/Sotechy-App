import { Star } from "lucide-react";
import { formatDate } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import type { ReviewRow } from "@/lib/types";
import { setReviewPublished } from "../actions";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function ReviewsPage() {
  const { data, error } = await load<ReviewRow[]>("/admin/reviews");
  const rows = data ?? [];
  const published = rows.filter((r) => r.isPublished);
  const average = published.length ? (published.reduce((n, r) => n + r.rating, 0) / published.length).toFixed(1) : "—";
  return (
    <>
      <PageHeader
        icon={Star}
        title="Reviews"
        description={`Customer reviews shown in the app · ${published.length} live, average ${average}. Hide anything abusive or off-topic (managers).`}
      />
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={rows}
          columns={[
            { header: "When", cell: (r) => formatDate(r.createdAt) },
            { header: "Product", cell: (r) => r.productName },
            { header: "Rating", cell: (r) => <span className="whitespace-nowrap text-amber-500">{stars(r.rating)}</span> },
            {
              header: "Review",
              cell: (r) => (
                <div className="max-w-md">
                  {r.title && <p className="font-medium">{r.title}</p>}
                  <p className="line-clamp-3 text-muted">{r.body}</p>
                </div>
              ),
            },
            {
              header: "Customer",
              cell: (r) => (
                <div>
                  <p>{r.customerName ?? "—"}</p>
                  <p className="text-xs text-muted">{r.customerEmail}</p>
                  {r.verified && <p className="text-xs text-green-700">Verified purchase</p>}
                </div>
              ),
            },
            {
              header: "Status",
              cell: (r) => (
                <ActionForm action={setReviewPublished} submitLabel={r.isPublished ? "Hide" : "Show"}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="isPublished" value={String(!r.isPublished)} />
                  <span className={`text-sm ${r.isPublished ? "text-green-700" : "text-muted"}`}>{r.isPublished ? "Live" : "Hidden"}</span>
                </ActionForm>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
