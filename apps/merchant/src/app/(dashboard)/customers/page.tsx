import { api } from "@/lib/api";
import { CustomersView } from "./customers-view";

export default async function CustomersPage() {
  const [orders, customers] = await Promise.all([api.merchantOrders(), api.merchantCustomers()]);
  return <CustomersView orders={orders} following={customers.filter((c) => c.following && c.username).map((c) => c.username!)} />;
}
