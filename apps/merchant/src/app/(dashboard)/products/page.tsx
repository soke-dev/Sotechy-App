import { api } from "@/lib/api";
import { ProductsView } from "./products-view";

export default async function ProductsPage() {
  return <ProductsView products={await api.merchantProducts()} />;
}
