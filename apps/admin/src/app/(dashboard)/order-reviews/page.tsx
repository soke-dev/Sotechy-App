import { ErrorNote } from "@/components/ui";
import { load } from "@/lib/api";
import { OrderReviews, type OrderCase } from "./order-reviews";

export default async function OrderReviewsPage() {
  const cases = await load<OrderCase[]>("/admin/order-cases");
  if (!cases.data) return <ErrorNote error={cases.error ?? "Couldn't load order reviews"} />;
  return <OrderReviews cases={cases.data} />;
}
