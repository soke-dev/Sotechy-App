// Older links to a store's item: every store's products now open the shared product page.
import { Redirect, useLocalSearchParams } from "expo-router";

export default function StoreItemRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/product/[id]", params: { id: id ?? "" } }} />;
}
