import type { Bank, PayoutAccount, PayoutPlan, PayoutRow } from "./payouts";
import type {
  Address,
  AddressInput,
  AddressSuggestion,
  AuthResponse,
  CatalogProduct,
  Category,
  ExchangeRate,
  DeliveryZone,
  DeliveryZoneInput,
  KycStatus,
  MarketStore,
  MarketStoreDetail,
  MerchantApplicationInput,
  MerchantCustomer,
  MerchantOrder,
  MerchantProduct,
  MerchantProductInput,
  MerchantSession,
  MerchantSummary,
  StorefrontSettings,
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
  /** Give up on a request after this long (default 20 seconds; uploads may want longer) */
  timeoutMs?: number;
}

/** Thin fetch wrapper shared by the mobile app, admin dashboard and landing page. */
export function createApiClient({ baseUrl, getToken, fetch: fetchImpl = fetch, timeoutMs = 20_000 }: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken?.();
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    // A request that hangs (wrong address, bad network) fails after a while instead of spinning forever.
    // Thrown as a TypeError, like any other network failure, so apps show "can't reach Sotechy".
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    init.signal?.addEventListener("abort", () => controller.abort());
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers, signal: controller.signal });
    } catch (err) {
      if (controller.signal.aborted && !init.signal?.aborted) throw new TypeError("Network request timed out");
      throw err;
    } finally {
      clearTimeout(timer);
    }
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
    register: (input: { email: string; password: string; fullName?: string; username?: string; phone?: string; whatsappPhone?: string; referralCode?: string }) =>
      send<AuthResponse>("POST", "/auth/register", input),
    login: (input: { email: string; password: string }) => send<AuthResponse>("POST", "/auth/login", input),
    googleSignIn: (idToken: string) => send<AuthResponse>("POST", "/auth/google", { idToken }),
    /** Admin dashboard: right email + password email a code, then the code signs in */
    staffLogin: (input: { email: string; password: string }) => send<{ challengeId: string }>("POST", "/auth/staff/login", input),
    staffVerify: (input: { challengeId: string; code: string }) => send<AuthResponse>("POST", "/auth/staff/verify", input),
    /** Push notifications for this phone (Expo push token) */
    registerPushDevice: (input: { token: string; platform: "android" | "ios" }) => send<{ ok: true }>("POST", "/me/push-devices", input),
    unregisterPushDevice: (token: string) => send<{ ok: true }>("DELETE", "/me/push-devices", { token }),
    /** Emails a 6-digit code if the account exists (the answer is the same either way) */
    forgotPassword: (email: string) => send<{ ok: true }>("POST", "/auth/password/forgot", { email }),
    resetPassword: (input: { email: string; code: string; password: string }) => send<AuthResponse>("POST", "/auth/password/reset", input),
    me: () => get<User>("/auth/me"),
    updateProfile: (input: { fullName?: string; username?: string; phone?: string | null; whatsappPhone?: string | null; avatarStyle?: string | null }) =>
      send<User>("PATCH", "/auth/me", input),
    checkUsername: (name: string) => get<{ username: string; available: boolean; reason: string | null }>(`/auth/username/${encodeURIComponent(name)}`),

    // Merchant dashboard: the signed-in account's own store
    merchantMe: () => get<MerchantSession>("/merchant/me"),
    openStore: (input: { name: string; slug?: string; sellerKind: "registered" | "individual"; phone: string; whatsappPhone?: string | null; username?: string; referralCode?: string }) =>
      send<MerchantSession>("POST", "/merchant/store", input),
    updateStore: (input: { name?: string; contactPhone?: string; contactWhatsapp?: string | null }) => send<MerchantStore>("PATCH", "/merchant/store", input),
    // The store's own business
    merchantProducts: () => get<MerchantProduct[]>("/merchant/products"),
    merchantProduct: (id: string) => get<MerchantProduct>(`/merchant/products/${encodeURIComponent(id)}`),
    createProduct: (input: MerchantProductInput) => send<MerchantProduct>("POST", "/merchant/products", input),
    updateProduct: (id: string, input: MerchantProductInput) => send<MerchantProduct>("PUT", `/merchant/products/${encodeURIComponent(id)}`, input),
    deliveryZones: () => get<DeliveryZone[]>("/merchant/delivery-zones"),
    createDeliveryZone: (input: DeliveryZoneInput) => send<DeliveryZone>("POST", "/merchant/delivery-zones", input),
    updateDeliveryZone: (id: string, input: DeliveryZoneInput) => send<DeliveryZone>("PUT", `/merchant/delivery-zones/${encodeURIComponent(id)}`, input),
    deleteDeliveryZone: (id: string) => send<{ deleted: true }>("DELETE", `/merchant/delivery-zones/${encodeURIComponent(id)}`),
    merchantOrders: () => get<MerchantOrder[]>("/merchant/orders"),
    merchantOrder: (id: string) => get<MerchantOrder>(`/merchant/orders/${encodeURIComponent(id)}`),
    merchantOrderAction: (id: string, action: "accept" | "ship" | "deliver" | "decline", note?: string) =>
      send<MerchantOrder>("POST", `/merchant/orders/${encodeURIComponent(id)}/${action}`, note ? { note } : {}),
    merchantCustomers: () => get<MerchantCustomer[]>("/merchant/customers"),
    merchantSummary: () => get<MerchantSummary>("/merchant/summary"),
    saveStorefront: (input: { tagline?: string | null; logoUrl?: string | null; coverUrl?: string | null; storefront?: StorefrontSettings }) =>
      send<MerchantStore>("PATCH", "/merchant/storefront", input),
    saveApplication: (input: MerchantApplicationInput) => send<MerchantStore>("PUT", "/merchant/application", input),
    checkStoreHandle: (handle: string) => get<{ handle: string; available: boolean; reason: string | null }>(`/merchant/handle/${encodeURIComponent(handle)}`),
    /** Starts the owner's ID + liveness check; open the returned URL */
    startIdCheck: () => send<{ url: string }>("POST", "/merchant/verification"),
    idCheckStatus: () => get<{ status: KycStatus; updatedAt: string | null; available: boolean }>("/merchant/verification"),

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
    /** Marketplace stores Sotechy has approved, and one store's page */
    stores: () => get<MarketStore[]>("/store/stores"),
    /** Banks a store can be paid into, its payout account, and its payouts */
    banks: () => get<Bank[]>("/merchant/banks"),
    savePayoutAccount: (input: { bankCode: string; accountNumber: string }) => send<PayoutAccount>("PUT", "/merchant/payout-account", input),
    merchantPayouts: () => get<{ payouts: PayoutRow[]; plan: PayoutPlan; feeRate: number; finalAfterHours: number }>("/merchant/payouts"),
    /** Address suggestions while typing (Nigeria only); empty when lookups aren't set up */
    addressSuggestions: (q: string) => get<AddressSuggestion[]>(`/geo/address?q=${encodeURIComponent(q)}`),
    store: (slug: string) => get<MarketStoreDetail>(`/store/stores/${encodeURIComponent(slug)}`),
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
