import { notFound } from "next/navigation";
import { ApiError } from "@sotechy/shared";
import { api } from "@/lib/api";
import { OrderView } from "./order-view";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await api.merchantOrder(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  return <OrderView order={order} />;
}
