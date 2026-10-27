import { api } from "@/lib/api";
import { StorefrontEditor } from "./storefront-editor";

export default async function StorefrontPage() {
  return <StorefrontEditor products={await api.merchantProducts()} />;
}
