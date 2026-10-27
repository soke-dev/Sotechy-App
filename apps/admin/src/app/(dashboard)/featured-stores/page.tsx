import { ErrorNote } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminStore } from "../merchants/store-types";
import { FeaturedView, type AdminFeaturing } from "./featured-view";

export default async function FeaturedStoresPage() {
  const [featuring, stores] = await Promise.all([load<AdminFeaturing>("/admin/featuring"), load<AdminStore[]>("/admin/merchants")]);
  if (!featuring.data) return <ErrorNote error={featuring.error ?? "Couldn't load featured stores"} />;
  return <FeaturedView data={featuring.data} stores={(stores.data ?? []).filter((s) => s.status === "approved")} />;
}
