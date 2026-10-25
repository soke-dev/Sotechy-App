import type {
  AuthResponse,
  CatalogProduct,
  Category,
  Order,
  OrderDetail,
  PlaceOrderInput,
  ProductDetail,
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
    register: (input: { email: string; password: string; fullName?: string; phone?: string }) =>
      send<AuthResponse>("POST", "/auth/register", input),
    login: (input: { email: string; password: string }) => send<AuthResponse>("POST", "/auth/login", input),
    me: () => get<User>("/auth/me"),

    // Storefront
    storeConfig: () => get<StoreConfig>("/store/config"),
    categories: () => get<Category[]>("/store/categories"),
    products: (params: { q?: string; category?: string; sort?: string; featured?: boolean } = {}) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
      return get<CatalogProduct[]>(`/store/products${qs.size ? `?${qs}` : ""}`);
    },
    product: (idOrSlug: string) => get<ProductDetail>(`/store/products/${encodeURIComponent(idOrSlug)}`),

    // Customer
    placeOrder: (input: PlaceOrderInput) => send<Order>("POST", "/orders", input),
    myOrders: () => get<Order[]>("/orders"),
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
