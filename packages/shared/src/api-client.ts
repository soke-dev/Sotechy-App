import type { Bank, PayoutAccount, PayoutPlan, PayoutRow } from "./payouts";
import type {
  Address,
  OfferView,
  OrderReceipt,
  WalletView,
  StoreNoticeView,
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
  SupportChat,
  SupportChatSummary,
  AppNotification,
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
    /** Changes the password (send the current one), or sets one for a Google-only account */
    changePassword: (input: { current?: string; next: string }) => send<{ ok: true }>("POST", "/auth/password/change", input),
    updateProfile: (input: {
      fullName?: string;
      username?: string;
      phone?: string | null;
      whatsappPhone?: string | null;
      avatarStyle?: string | null;
      pushPrefs?: Partial<Record<"order" | "offer" | "store" | "tokens" | "support", boolean>>;
    }) =>
      send<User>("PATCH", "/auth/me", input),
    checkUsername: (name: string) => get<{ username: string; available: boolean; reason: string | null }>(`/auth/username/${encodeURIComponent(name)}`),

    // Merchant dashboard: the signed-in account's own store
    merchantMe: () => get<MerchantSession>("/merchant/me"),
    openStore: (input: { name: string; slug?: string; sellerKind: "registered" | "individual"; phone: string; whatsappPhone?: string | null; username?: string; referralCode?: string }) =>
      send<MerchantSession>("POST", "/merchant/store", input),
    updateStore: (input: { name?: string; contactPhone?: string; contactWhatsapp?: string | null; contactEmail?: string }) => send<MerchantStore>("PATCH", "/merchant/store", input),
    // The store's own business
    merchantProducts: () => get<MerchantProduct[]>("/merchant/products"),
    merchantProduct: (id: string) => get<MerchantProduct>(`/merchant/products/${encodeURIComponent(id)}`),
    createProduct: (input: MerchantProductInput) => send<MerchantProduct>("POST", "/merchant/products", input),
    updateProduct: (id: string, input: MerchantProductInput) => send<MerchantProduct>("PUT", `/merchant/products/${encodeURIComponent(id)}`, input),
    /** A draft copy with no stock */
    duplicateProduct: (id: string) => send<MerchantProduct>("POST", `/merchant/products/${encodeURIComponent(id)}/duplicate`),
    /** Make live, hide, mark out of stock, or delete several products at once */
    productActions: (ids: string[], action: "live" | "hidden" | "out_of_stock" | "delete") =>
      send<{ done: number; deleted: number; archived: number }>("POST", "/merchant/products/actions", { ids, action }),
    deliveryZones: () => get<DeliveryZone[]>("/merchant/delivery-zones"),
    createDeliveryZone: (input: DeliveryZoneInput) => send<DeliveryZone>("POST", "/merchant/delivery-zones", input),
    updateDeliveryZone: (id: string, input: DeliveryZoneInput) => send<DeliveryZone>("PUT", `/merchant/delivery-zones/${encodeURIComponent(id)}`, input),
    deleteDeliveryZone: (id: string) => send<{ deleted: true }>("DELETE", `/merchant/delivery-zones/${encodeURIComponent(id)}`),
    merchantOrders: () => get<MerchantOrder[]>("/merchant/orders"),
    merchantOrder: (id: string) => get<MerchantOrder>(`/merchant/orders/${encodeURIComponent(id)}`),
    merchantOrderAction: (
      id: string,
      action: "accept" | "ship" | "deliver" | "decline" | "pickup-change" | "payback-sent",
      note?: string,
      handover?: { tracking?: string; driverPhone?: string },
    ) => send<MerchantOrder>("POST", `/merchant/orders/${encodeURIComponent(id)}/${action}`, { ...(note ? { note } : {}), ...handover }),
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
    checkPromo: (input: { code: string; subtotal: number; store?: string }) => send<PromoCheck>("POST", "/store/promo/check", input),
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
    /** Stores this account follows, following and unfollowing, and their messages */
    follows: () => get<string[]>("/me/follows"),
    follow: (slug: string) => send<{ following: boolean }>("POST", `/me/follows/${encodeURIComponent(slug)}`),
    unfollow: (slug: string) => send<{ following: boolean }>("DELETE", `/me/follows/${encodeURIComponent(slug)}`),
    storeNotices: () => get<StoreNoticeView[]>("/me/store-notices"),
    /** Orders, offers, support, tokens and security notifications */
    notifications: () => get<AppNotification[]>("/me/notifications"),
    markNotificationsRead: () => send<{ ok: true }>("POST", "/me/notifications/read"),
    /** Stores saved with the heart */
    favouriteStores: () => get<string[]>("/me/favourite-stores"),
    favouriteStore: (slug: string) => send<{ favourite: boolean }>("POST", `/me/favourite-stores/${encodeURIComponent(slug)}`),
    unfavouriteStore: (slug: string) => send<{ favourite: boolean }>("DELETE", `/me/favourite-stores/${encodeURIComponent(slug)}`),
    /** Token balances, activity and the wallet's Monad address; sending tokens by @username */
    wallet: () => get<WalletView>("/me/wallet"),
    /** Who an @username is, before sending them tokens */
    walletRecipient: (to: string) =>
      get<{ username: string | null; name: string | null; avatarStyle: string | null; seed: string; isYou: boolean }>(`/me/wallet/recipient?to=${encodeURIComponent(to)}`),
    sendTokens: (input: { to: string; ticker: string; amount: number }) => send<{ id: string; to: string | null; ticker: string; amount: number }>("POST", "/me/wallet/send", input),
    orderReceipt: (orderId: string) => get<OrderReceipt>(`/me/orders/${orderId}/receipt`),
    /** The customer's price offers */
    offers: () => get<OfferView[]>("/offers"),
    offer: (id: string) => get<OfferView>(`/offers/${id}`),
    makeOffer: (input: { variantId: string; amount: number; text?: string | null }) => send<OfferView>("POST", "/offers", input),
    answerOffer: (id: string, input: { action: "accept" | "decline" | "counter"; amount?: number; text?: string | null }) => send<OfferView>("POST", `/offers/${id}/answer`, input),
    /** Banks a store can be paid into, its payout account, and its payouts */
    banks: () => get<Bank[]>("/merchant/banks"),
    savePayoutAccount: (input: { bankCode: string; accountNumber: string }) => send<PayoutAccount>("PUT", "/merchant/payout-account", input),
    merchantPayouts: () => get<{ payouts: PayoutRow[]; plan: PayoutPlan; feeRate: number; finalAfterHours: number }>("/merchant/payouts"),
    /** Address suggestions while typing (Nigeria only); empty when lookups aren't set up */
    addressSuggestions: (q: string) => get<AddressSuggestion[]>(`/geo/address?q=${encodeURIComponent(q)}`),
    store: (slug: string) => get<MarketStoreDetail>(`/store/stores/${encodeURIComponent(slug)}`),
    productReviews: (idOrSlug: string) => get<ProductReviews>(`/store/products/${encodeURIComponent(idOrSlug)}/reviews`),
    /** A photo makes a review earn the full bonus; `bonus` is what this review just earned */
    submitReview: (input: { productId: string; rating: number; title?: string | null; body: string; photos?: string[] }) =>
      send<{ id: string; bonus: { tokenId: number; amount: number } | null }>("POST", "/me/reviews", input),

    // Customer
    placeOrder: (input: PlaceOrderInput) => send<Order>("POST", "/orders", input),
    myOrders: () => get<OrderSummary[]>("/orders"),
    order: (id: string) => get<OrderDetail>(`/orders/${id}`),
    cancelOrder: (id: string) => send<Order>("POST", `/orders/${id}/cancel`),
    /** Changes the tokens put towards an unpaid order */
    /** Sends the details Sotechy asked for to send a refund */
    sendRefundDetails: (orderId: string, refundId: string, details: import("./types").RefundDetails) =>
      send<OrderDetail>("POST", `/orders/${orderId}/refunds/${refundId}/details`, details),
    setOrderTokens: (id: string, tokens: { ticker: string; amount: number }[]) => send<OrderDetail>("POST", `/orders/${id}/tokens`, { tokens }),
    /** The customer collected a pickup order that was waiting for them */
    confirmPickedUp: (id: string) => send<OrderDetail>("POST", `/orders/${id}/picked-up`),
    /** The customer got their order */
    confirmReceived: (id: string) => send<OrderDetail>("POST", `/orders/${id}/received`),
    /** The store marked it delivered, but it didn't reach the customer */
    reportNotReceived: (id: string, note?: string) => send<OrderDetail>("POST", `/orders/${id}/not-received`, { note }),
    /** Asks Money Moves whether the order's payment is in (settling it if so) and returns the order's status */
    checkOnlinePayment: (orderId: string) => send<{ status: string }>("POST", `/payments/online/check`, { orderId }),
    startOnlinePayment: (orderId: string, method: "stablecoin" | "bank" = "stablecoin") =>
      send<{ checkoutUrl: string }>("POST", `/payments/online/initialize`, { orderId, method }),
    wishlist: () => get<CatalogProduct[]>("/me/wishlist"),
    toggleWishlist: (productId: string) => send<{ saved: boolean }>("POST", `/me/wishlist/${productId}`),
    /** When anything of the customer's last changed; live screens reload when it moves */
    pulse: () => get<{ v: string }>("/me/pulse"),
    /** Live chat with Sotechy: the open conversation, and sending to it */
    supportChat: () => get<SupportChat>("/me/support/chat"),
    sendSupportChat: (message: string, orderId?: string, imageUrl?: string) => send<SupportChat>("POST", "/me/support/chat", { message, orderId, imageUrl }),
    supportChats: () => get<SupportChatSummary[]>("/me/support/chats"),
    supportChatById: (id: string) => get<SupportChat & { open: boolean }>(`/me/support/chats/${id}`),
    newSupportChat: () => send<SupportChat>("POST", "/me/support/chat/new"),
    createSupportTicket: (input: { subject: string; message: string; orderId?: string }) =>
      send<{ id: string }>("POST", "/me/support", input),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
