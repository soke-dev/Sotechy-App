"use server";

// Server actions for every dashboard mutation. Each calls the Sotechy API with the
// signed-in staff member's token; the API enforces roles and business rules.
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { OrderStatus, PaymentMethodCode } from "@sotechy/shared";
import type { ActionResult } from "@/lib/action-result";
import { api, errorMessage, TOKEN_COOKIE } from "@/lib/api";

type Prev = ActionResult | null;

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === undefined ? undefined : Number(v);
};
const bool = (f: FormData, k: string) => f.get(k) === "on";
const lines = (f: FormData, k: string) => (str(f, k) ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

/** "Key: Value" per line → object */
function specs(f: FormData, k: string) {
  return Object.fromEntries(
    lines(f, k)
      .filter((l) => l.includes(":"))
      .map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()])
      .filter(([key, value]) => key && value),
  );
}

async function run(fn: () => Promise<unknown>, paths: string[], message = "Saved"): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    return { error: errorMessage(err) };
  }
  for (const p of paths) revalidatePath(p);
  return { message };
}

export async function logout() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/login");
}

// --- Products & categories ------------------------------------------------
function productFields(f: FormData) {
  return {
    name: str(f, "name")!,
    categoryId: str(f, "categoryId") ?? null,
    brand: str(f, "brand") ?? null,
    model: str(f, "model") ?? null,
    description: str(f, "description") ?? null,
    specifications: specs(f, "specifications"),
    highlights: lines(f, "highlights"),
    inTheBox: lines(f, "inTheBox"),
    images: lines(f, "images"),
    condition: (str(f, "condition") ?? "new") as "new" | "used" | "refurbished",
    warrantyMonths: num(f, "warrantyMonths") ?? null,
    returnPolicy: str(f, "returnPolicy") ?? null,
    lowStockThreshold: num(f, "lowStockThreshold") ?? 3,
    allowDelivery: bool(f, "allowDelivery"),
    allowPickup: bool(f, "allowPickup"),
    isPublished: bool(f, "isPublished"),
    isFeatured: bool(f, "isFeatured"),
  };
}

export async function createProduct(_: Prev, f: FormData): Promise<ActionResult> {
  let id: string;
  try {
    const product = await api.post<{ id: string }>("/admin/products", {
      ...productFields(f),
      variant: {
        sku: str(f, "sku"),
        name: str(f, "variantName") ?? "Standard",
        price: num(f, "price"),
        compareAtPrice: num(f, "compareAtPrice") ?? null,
        costPrice: num(f, "costPrice") ?? null,
      },
    });
    id = product.id;
  } catch (err) {
    return { error: errorMessage(err) };
  }
  revalidatePath("/products");
  redirect(`/products/${id}`);
}

export async function updateProduct(_: Prev, f: FormData) {
  const id = str(f, "id")!;
  return run(() => api.patch(`/admin/products/${id}`, productFields(f)), [`/products/${id}`, "/products"]);
}

export async function addVariant(_: Prev, f: FormData) {
  const productId = str(f, "productId")!;
  return run(
    () =>
      api.post(`/admin/products/${productId}/variants`, {
        sku: str(f, "sku"),
        name: str(f, "name") ?? "Standard",
        price: num(f, "price"),
        compareAtPrice: num(f, "compareAtPrice") ?? null,
        costPrice: num(f, "costPrice") ?? null,
      }),
    [`/products/${productId}`],
    "Variant added",
  );
}

export async function updateVariant(_: Prev, f: FormData) {
  const id = str(f, "id")!;
  return run(
    () =>
      api.patch(`/admin/variants/${id}`, {
        price: num(f, "price"),
        compareAtPrice: num(f, "compareAtPrice") ?? null,
        costPrice: num(f, "costPrice") ?? null,
        isActive: bool(f, "isActive"),
      }),
    [`/products/${str(f, "productId")}`],
  );
}

export async function createCategory(_: Prev, f: FormData) {
  return run(
    () =>
      api.post("/admin/categories", {
        name: str(f, "name"),
        parentId: str(f, "parentId") ?? null,
        sortOrder: num(f, "sortOrder") ?? 0,
        imageUrl: str(f, "imageUrl") ?? null,
      }),
    ["/categories"],
    "Category added",
  );
}

export async function toggleCategory(_: Prev, f: FormData) {
  return run(() => api.patch(`/admin/categories/${str(f, "id")}`, { isActive: str(f, "isActive") === "true" }), ["/categories"]);
}

// --- Inventory ----------------------------------------------------------------
export async function adjustStock(_: Prev, f: FormData) {
  return run(
    () =>
      api.post("/admin/inventory/adjust", {
        variantId: str(f, "variantId"),
        branchId: str(f, "branchId"),
        delta: num(f, "delta"),
        type: str(f, "type") ?? "adjustment",
        note: str(f, "note"),
      }),
    ["/inventory", "/products"],
    "Stock updated",
  );
}

export async function transferStock(_: Prev, f: FormData) {
  return run(
    () =>
      api.post("/admin/inventory/transfer", {
        variantId: str(f, "variantId"),
        fromBranchId: str(f, "fromBranchId"),
        toBranchId: str(f, "toBranchId"),
        quantity: num(f, "quantity"),
        note: str(f, "note"),
      }),
    ["/inventory"],
    "Transfer recorded",
  );
}

// --- Orders, payments, refunds -------------------------------------------------
export async function updateOrderStatus(_: Prev, f: FormData) {
  const id = str(f, "id")!;
  return run(
    () => api.post(`/admin/orders/${id}/status`, { status: str(f, "status") as OrderStatus, note: str(f, "note") }),
    [`/orders/${id}`, "/orders"],
    "Status updated",
  );
}

export async function cancelOrder(_: Prev, f: FormData) {
  const id = str(f, "id")!;
  return run(() => api.post(`/admin/orders/${id}/cancel`, { note: str(f, "note") }), [`/orders/${id}`, "/orders"], "Order cancelled");
}

export async function verifyPayment(_: Prev, f: FormData) {
  const orderId = str(f, "orderId");
  return run(
    () => api.post(`/admin/payments/${str(f, "paymentId")}/verify`, { reference: str(f, "reference"), note: str(f, "note") }),
    ["/payments", "/orders", orderId ? `/orders/${orderId}` : "/orders"],
    "Payment confirmed",
  );
}

export async function updateRefund(_: Prev, f: FormData) {
  return run(() => api.patch(`/admin/refunds/${str(f, "id")}`, { status: str(f, "status") }), ["/payments"]);
}

/** Walk-in sale from the POS screen. */
export async function recordSale(input: {
  branchId: string;
  items: { variantId: string; quantity: number }[];
  paymentMethod: PaymentMethodCode;
  paymentReference?: string;
  customerName?: string;
  customerPhone?: string;
}): Promise<ActionResult & { orderNumber?: string }> {
  try {
    const order = await api.post<{ orderNumber: string; status: string }>("/admin/pos/sales", input);
    revalidatePath("/orders");
    revalidatePath("/inventory");
    return {
      orderNumber: order.orderNumber,
      message:
        order.status === "pending_payment"
          ? `Sale ${order.orderNumber} recorded — awaiting payment verification by a manager`
          : `Sale ${order.orderNumber} completed`,
    };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

// --- People ----------------------------------------------------------------------
export async function createStaff(_: Prev, f: FormData) {
  return run(
    () =>
      api.post("/admin/staff", {
        email: str(f, "email"),
        password: str(f, "password"),
        fullName: str(f, "fullName"),
        role: str(f, "role"),
        branchId: str(f, "branchId") ?? null,
      }),
    ["/staff"],
    "Account created",
  );
}

export async function updateUser(_: Prev, f: FormData) {
  return run(
    () =>
      api.patch(`/admin/users/${str(f, "id")}`, {
        role: str(f, "role"),
        branchId: str(f, "branchId") ?? null,
        isActive: str(f, "isActive") !== "false",
      }),
    ["/staff", "/customers"],
  );
}

// --- Branches, promotions, settings ----------------------------------------------
export async function createBranch(_: Prev, f: FormData) {
  return run(
    () =>
      api.post("/admin/branches", {
        name: str(f, "name"),
        code: str(f, "code"),
        address: str(f, "address"),
        city: str(f, "city"),
        state: str(f, "state"),
        phone: str(f, "phone") ?? null,
        openingHours: str(f, "openingHours") ?? null,
      }),
    ["/branches"],
    "Branch added",
  );
}

export async function createPromotion(_: Prev, f: FormData) {
  return run(
    () =>
      api.post("/admin/promotions", {
        name: str(f, "name"),
        code: str(f, "code") ?? null,
        discountType: str(f, "discountType") ?? "percentage",
        value: num(f, "value"),
        maxDiscountAmount: num(f, "maxDiscountAmount") ?? null,
        minOrderAmount: num(f, "minOrderAmount") ?? null,
        paymentMethod: str(f, "paymentMethod") ?? null,
        cryptoAsset: str(f, "cryptoAsset") ?? null,
        startsAt: str(f, "startsAt") ?? null,
        endsAt: str(f, "endsAt") ?? null,
        usageLimit: num(f, "usageLimit") ?? null,
        isActive: bool(f, "isActive"),
      }),
    ["/promotions"],
    "Promotion created",
  );
}

export async function togglePromotion(_: Prev, f: FormData) {
  return run(() => api.patch(`/admin/promotions/${str(f, "id")}`, { isActive: str(f, "isActive") === "true" }), ["/promotions"]);
}

export async function updatePaymentMethod(_: Prev, f: FormData) {
  return run(
    () =>
      api.patch(`/admin/settings/payment-methods/${str(f, "code")}`, {
        isEnabled: bool(f, "isEnabled"),
        online: bool(f, "online"),
        inStore: bool(f, "inStore"),
        instructions: str(f, "instructions") ?? null,
      }),
    ["/settings"],
  );
}

export async function updateCryptoAsset(_: Prev, f: FormData) {
  return run(
    () => api.patch(`/admin/settings/crypto-assets/${str(f, "id")}`, { receivingAddress: str(f, "receivingAddress") ?? null, isEnabled: bool(f, "isEnabled") }),
    ["/settings"],
  );
}

export async function saveSetting(_: Prev, f: FormData) {
  const key = str(f, "key")!;
  const value: Record<string, unknown> = {};
  for (const [k, v] of f.entries()) {
    if (k === "key" || k.startsWith("$") || typeof v !== "string") continue;
    const trimmed = v.trim();
    value[k] = trimmed === "" ? null : f.get(`$num_${k}`) ? Number(trimmed) : trimmed;
  }
  return run(() => api.put(`/admin/settings/${key}`, value), ["/settings"]);
}

// --- Suppliers & support ------------------------------------------------------------
export async function createSupplier(_: Prev, f: FormData) {
  return run(
    () =>
      api.post("/admin/suppliers", {
        name: str(f, "name"),
        contactName: str(f, "contactName"),
        phone: str(f, "phone"),
        email: str(f, "email"),
        address: str(f, "address"),
      }),
    ["/suppliers"],
    "Supplier added",
  );
}

export async function createPurchaseOrder(_: Prev, f: FormData) {
  return run(
    () =>
      api.post("/admin/purchase-orders", {
        supplierId: str(f, "supplierId") ?? null,
        branchId: str(f, "branchId"),
        items: [{ variantId: str(f, "variantId"), quantity: num(f, "quantity"), unitCost: num(f, "unitCost") }],
      }),
    ["/suppliers"],
    "Purchase order created",
  );
}

export async function receivePurchaseOrder(_: Prev, f: FormData) {
  return run(() => api.post(`/admin/purchase-orders/${str(f, "id")}/receive`), ["/suppliers", "/inventory"], "Stock received");
}

export async function setReviewPublished(_: Prev, f: FormData) {
  return run(() => api.patch(`/admin/reviews/${str(f, "id")}`, { isPublished: str(f, "isPublished") === "true" }), ["/reviews"]);
}

export async function updateTicket(_: Prev, f: FormData) {
  return run(() => api.patch(`/admin/support/${str(f, "id")}`, { status: str(f, "status") }), ["/support"]);
}
