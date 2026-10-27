import type {
  Address,
  AddressInput,
  AuthResponse,
  CatalogProduct,
  Category,
  ExchangeRate,
  MerchantSession,
  MerchantStore,
  Order,
  OrderDetail,
  OrderSummary,
  PlaceOrderInput,
  ProductDetail,
  ProductFacets,
  ProductQuery,
  ProductReviews,
  PromoCheck,
  StoreConfig,
  User,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof fetch;
}

/** Thin fetch wrapper shared by the mobile app, admin dashboard and landing page. */
export function createApiClient({ baseUrl, getToken, fetch: fetchImpl = fetch }: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken?.();
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`, body?.details);
    }
    return body as T;
  }

  const get = <T>(path: string) => request<T>(path);
  const send = <T>(method: string, path: string, data?: unknown) =>
    request<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });

  return {
    request,
    get,
    post: <T>(path: string, data?: unknown) => send<T>("POST", path, data),
    patch: <T>(path: string, data?: unknown) => send<T>("PATCH", path, data),
    put: <T>(path: string, data?: unknown) => send<T>("PUT", path, data),
    delete: <T>(path: string) => send<T>("DELETE", path),

    // Auth
    register: (input: { email: string; password: string; fullName?: string; username?: string; phone?: string; whatsappPhone?: string }) =>
      send<AuthResponse>("POST", "/auth/register", input),
    login: (input: { email: string; password: string }) => send<AuthResponse>("POST", "/auth/login", input),
    googleSignIn: (idToken: string) => send<AuthResponse>("POST", "/auth/google", { idToken }),
    /** Emails a 6-digit code if the account exists (the answer is the same either way) */
    forgotPassword: (email: string) => send<{ ok: true }>("POST", "/auth/password/forgot", { email }),
    resetPassword: (input: { email: string; code: string; password: string }) => send<AuthResponse>("POST", "/auth/password/reset", input),
    me: () => get<User>("/auth/me"),
    updateProfile: (input: { fullName?: string; username?: string; phone?: string | null; whatsappPhone?: string | null; avatarStyle?: string | null }) =>
      send<User>("PATCH", "/auth/me", input),
    checkUsername: (name: string) => get<{ username: string; available: boolean; reason: string | null }>(`/auth/username/${encodeURIComponent(name)}`),

    // Merchant dashboard: the signed-in account's own store
    merchantMe: () => get<MerchantSession>("/merchant/me"),
    openStore: (input: { name: string; sellerKind: "registered" | "individual"; phone: string; whatsappPhone?: string | null; username?: string }) =>
      send<MerchantSession>("POST", "/merchant/store", input),
    updateStore: (input: { name?: string; contactPhone?: string; contactWhatsapp?: string | null }) => send<MerchantStore>("PATCH", "/merchant/store", input),

    // Saved addresses
    addresses: () => get<Address[]>("/me/addresses"),
    addAddress: (input: AddressInput) => send<Address>("POST", "/me/addresses", input),
    updateAddress: (id: string, input: Partial<AddressInput>) => send<Address>("PATCH", `/me/addresses/${id}`, input),
    deleteAddress: (id: string) => send<null>("DELETE", `/me/addresses/${id}`),

    // Storefront
    storeConfig: () => get<StoreConfig>("/store/config"),
    exchangeRate: () => get<ExchangeRate>("/store/fx"),
    checkPromo: (input: { code: string; subtotal: number }) => send<PromoCheck>("POST", "/store/promo/check", input),
    categories: () => get<Category[]>("/store/categories"),
    products: ({ brands, ...params }: ProductQuery = {}) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
      if (brands?.length) qs.set("brand", brands.join(","));
      return get<CatalogProduct[]>(`/store/products${qs.size ? `?${qs}` : ""}`);
    },
    productFacets: (params: { q?: string; category?: string } = {}) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
      return get<ProductFacets>(`/store/facets${qs.size ? `?${qs}` : ""}`);
    },
    product: (idOrSlug: string) => get<ProductDetail>(`/store/products/${encodeURIComponent(idOrSlug)}`),
    productReviews: (idOrSlug: string) => get<ProductReviews>(`/store/products/${encodeURIComponent(idOrSlug)}/reviews`),
    submitReview: (input: { productId: string; rating: number; title?: string | null; body: string }) => send<{ id: string }>("POST", "/me/reviews", input),

    // Customer
    placeOrder: (input: PlaceOrderInput) => send<Order>("POST", "/orders", input),
    myOrders: () => get<OrderSummary[]>("/orders"),
    order: (id: string) => get<OrderDetail>(`/orders/${id}`),
    cancelOrder: (id: string) => send<Order>("POST", `/orders/${id}/cancel`),
    startOnlinePayment: (orderId: string) =>
      send<{ checkoutUrl: string }>("POST", `/payments/online/initialize`, { orderId }),
    wishlist: () => get<CatalogProduct[]>("/me/wishlist"),
    toggleWishlist: (productId: string) => send<{ saved: boolean }>("POST", `/me/wishlist/${productId}`),
    createSupportTicket: (input: { subject: string; message: string; orderId?: string }) =>
      send<{ id: string }>("POST", "/me/support", input),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
