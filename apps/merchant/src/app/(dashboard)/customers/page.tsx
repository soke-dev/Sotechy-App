import { api } from "@/lib/api";
import { CustomersView } from "./customers-view";

export default async function CustomersPage() {
  return <CustomersView orders={await api.merchantOrders()} />;
}
