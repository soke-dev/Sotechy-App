import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { products } from "@/lib/mock";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  return <ProductForm product={product} />;
}
