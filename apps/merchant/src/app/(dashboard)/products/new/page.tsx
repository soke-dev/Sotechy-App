import { ProductForm } from "@/components/product-form";
import { api } from "@/lib/api";
import { isStandardCategory } from "@/lib/categories";

export default async function NewProductPage() {
  const [zones, products] = await Promise.all([api.deliveryZones(), api.merchantProducts()]);
  return <ProductForm zones={zones} ownCategories={[...new Set(products.map((p) => p.category).filter((c) => !isStandardCategory(c)))]} />;
}
