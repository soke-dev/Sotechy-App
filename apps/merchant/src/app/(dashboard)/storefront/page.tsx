import { api, getStoreSession } from "@/lib/api";
import { storefrontFacts } from "@/lib/storefront-facts";
import { StorefrontEditor } from "./storefront-editor";

export default async function StorefrontPage() {
  const { store } = await getStoreSession();
  const [products, facts] = await Promise.all([api.merchantProducts(), storefrontFacts(store.slug)]);
  return <StorefrontEditor products={products} facts={facts} />;
}
