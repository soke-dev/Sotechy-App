import { api } from "@/lib/api";
import { OrdersView } from "./orders-view";

export default async function OrdersPage() {
  return <OrdersView orders={await api.merchantOrders()} />;
}
