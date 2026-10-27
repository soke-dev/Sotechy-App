import type { MerchantReview } from "@sotechy/shared";
import { api } from "@/lib/api";
import { ReviewsView } from "./reviews-view";

export default async function ReviewsPage() {
  return <ReviewsView reviews={await api.get<MerchantReview[]>("/merchant/reviews")} />;
}
