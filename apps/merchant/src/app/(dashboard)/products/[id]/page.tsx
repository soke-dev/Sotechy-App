import { notFound } from "next/navigation";
import { ApiError } from "@sotechy/shared";
import { ProductForm } from "@/components/product-form";
import { api } from "@/lib/api";
import { isStandardCategory } from "@/lib/categories";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, zones, products] = await Promise.all([
    api.merchantProduct(id).catch((err) => {
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    }),
    api.deliveryZones(),
    api.merchantProducts(),
  ]);
  return <ProductForm product={product} zones={zones} ownCategories={[...new Set(products.map((p) => p.category).filter((c) => !isStandardCategory(c)))]} />;
}
