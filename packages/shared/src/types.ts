// Shapes returned by the Sotechy API (apps/api). Money values are NGN numbers.

export type Role = "customer" | "staff" | "manager" | "admin";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "ready_for_pickup"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "payment_failed"
  | "refunded";

export type FulfilmentType = "delivery" | "pickup";
export type SalesChannel = "online" | "in_store";
export type PaymentMethodCode = "bank_transfer" | "online" | "crypto" | "cash" | "pos_terminal";
export type PaymentStatus = "pending" | "confirmed" | "failed" | "expired" | "refunded";
export type RefundStatus = "requested" | "approved" | "rejected" | "processed";
export type ProductCondition = "new" | "used" | "refurbished";
export type StockMovementType =
  | "restock"
  | "sale"
  | "transfer_in"
  | "transfer_out"
  | "adjustment"
  | "return";

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  openingHours: string | null;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** One card in a product grid. */
export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  model: string | null;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  minPrice: number;
  compareAtPrice: number | null;
  totalAvailable: number;
  isFeatured: boolean;
  isPublished: boolean;
  isDemo: boolean;
  createdAt: string;
  /** Average star rating (null when there are no reviews) */
  ratingAverage?: number | null;
  ratingCount?: number;
  /** The marketplace store selling it; null for Sotechy's own products */
  storeName?: string | null;
  storeSlug?: string | null;
  negotiable?: boolean;
}

export interface Product {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  specifications: Record<string, string>;
  images: string[];
  condition: ProductCondition;
  warrantyMonths: number | null;
  returnPolicy: string | null;
  lowStockThreshold: number;
  allowDelivery: boolean;
  allowPickup: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isDemo: boolean;
  createdAt: string;
  /** Short selling points */
  highlights?: string[];
  /** What comes in the box */
  inTheBox?: string[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
}

export interface BranchStock {
  variantId: string;
  branchId: string;
  branchName: string;
  quantity: number;
  reserved: number;
}

export interface ProductDetail extends Product {
  variants: ProductVariant[];
  stock: BranchStock[];
  /** The marketplace store selling it (its branch is where it ships from); null for Sotechy */
  store?: { id: string; name: string; slug: string; ticker: string; logoUrl: string | null; branchId: string | null } | null;
  storeCategory?: string | null;
  negotiable?: boolean;
  offerHours?: number | null;
  ratingAverage?: number | null;
  ratingCount?: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  avatarStyle?: string | null;
  rating: number;
  title: string | null;
  body: string;
  /** reviewer bought this product */
  verified: boolean;
  createdAt: string;
}

export interface ProductReviews {
  /** distribution[0] = number of 1-star reviews … distribution[4] = 5-star */
  summary: { average: number; count: number; distribution: number[] };
  reviews: Review[];
}

/** Dollar exchange rate from Money Moves: `rate` naira = 1 US dollar. */
export interface ExchangeRate {
  base: "USD";
  quote: "NGN";
  rate: number;
  /** "placeholder" until the live Money Moves rate is connected */
  source: "moneymoves" | "manual" | "placeholder";
  updatedAt: string;
}

/** Result of checking a promo code at checkout (the order re-checks it). */
export interface PromoCheck {
  code: string;
  name: string;
  discount: number;
}

export type ProductSort = "newest" | "price_asc" | "price_desc" | "rating";

/** Storefront product filters. Every filter combines with the others; brands match any of the list. */
export interface ProductQuery {
  q?: string;
  category?: string;
  sort?: ProductSort | string;
  featured?: boolean;
  /** Discounted items or Sotechy picks */
  deals?: boolean;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  /** One marketplace store's slug, or "sotechy" for Sotechy's own products */
  store?: string;
}

/** Filter options available for a search / category. */
export interface ProductFacets {
  total: number;
  brands: { name: string; count: number }[];
  price: { min: number; max: number };
}

export interface DeliveryAddress {
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** First product photo, for thumbnails */
  imageUrl?: string | null;
  productId?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string | null;
  channel: SalesChannel;
  branchId: string | null;
  fulfilmentType: FulfilmentType;
  deliveryAddress: DeliveryAddress | null;
  status: OrderStatus;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethodCode;
  cryptoAsset: string | null;
  reservationExpiresAt: string | null;
  createdAt: string;
}

/** An order as listed in "My orders", with its items for thumbnails. */
export interface OrderSummary extends Order {
  items: OrderItem[];
}

export interface Address {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  isDefault: boolean;
}

export interface AddressInput {
  label?: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  isDefault?: boolean;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethodCode;
  provider: string | null;
  providerReference: string | null;
  amount: number;
  currency: string;
  cryptoAsset: string | null;
  cryptoNetwork: string | null;
  txHash: string | null;
  status: PaymentStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

export interface OrderStatusChange {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  payments: Payment[];
  history: OrderStatusChange[];
  branch: Branch | null;
  paymentInstructions: PaymentInstructions | null;
}

export interface PaymentInstructions {
  method: PaymentMethodCode;
  text: string | null;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  cryptoAsset?: string | null;
  cryptoNetwork?: string | null;
  receivingAddress?: string | null;
}

export interface Promotion {
  id: string;
  name: string;
  code: string | null;
  discountType: "percentage" | "fixed";
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  paymentMethod: PaymentMethodCode | null;
  cryptoAsset: string | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  /** Public @handle, lowercase; null until chosen */
  username: string | null;
  /** Call number, +234… */
  phone: string | null;
  /** WhatsApp number when different from `phone`, +234… */
  whatsappPhone: string | null;
  /** Account that referred them, if they used a referral code */
  referredById?: string | null;
  role: Role;
  branchId: string | null;
  avatarUrl?: string | null;
  /** Chosen illustrated avatar (m1–m3, f1–f3); null = generated */
  avatarStyle?: string | null;
  createdAt: string;
}

/** A merchant's store, as its owner sees it */
export interface MerchantStore {
  id: string;
  name: string;
  slug: string;
  /** Token symbol without the $ */
  ticker: string;
  ownerId: string | null;
  sellerKind: "registered" | "individual";
  /** pending = test mode until Sotechy verifies the store */
  status: "pending" | "approved" | "suspended";
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  /** The owner's ID + liveness check (Didit) */
  kycStatus: KycStatus;
  tagline?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  storefront?: StorefrontSettings | null;
  sells?: string[];
  application?: Omit<MerchantApplicationInput, "sellerKind" | "sells" | "submit"> | null;
  submittedAt?: string | null;
  featuredUntil?: string | null;
  createdAt: string;
}

export type KycStatus = "not_started" | "in_progress" | "in_review" | "approved" | "declined" | "resubmit" | "expired";

export interface MerchantSession {
  user: User;
  store: MerchantStore | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaymentMethodConfig {
  code: PaymentMethodCode;
  label: string;
  isEnabled: boolean;
  online: boolean;
  inStore: boolean;
  instructions: string | null;
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  network: string;
  receivingAddress: string | null;
  isEnabled: boolean;
}

export interface StoreConfig {
  branches: Branch[];
  paymentMethods: PaymentMethodConfig[];
  cryptoAssets: CryptoAsset[];
  promotions: Promotion[];
  delivery: { flatFee: number; freeOver: number | null; note: string | null };
  support: { phone: string | null; email: string | null; whatsapp: string | null };
  /** App switches set in Admin → App switches */
  features: AppFeatures;
  /** Home carousel slides from Admin → Banners (empty = the app's built-in ones) */
  banners: Banner[];
}

/** On/off switches for the customer app, controlled from the admin dashboard. */
export interface AppFeatures {
  /** Customers can place orders (off = browse only) */
  ordering: boolean;
  delivery: boolean;
  pickup: boolean;
  promoCodes: boolean;
  reviews: boolean;
  liveChat: boolean;
  whatsapp: boolean;
  usdPrices: boolean;
  signups: boolean;
  googleSignIn: boolean;
  /** "Only 3 left" badges */
  lowStockBadges: boolean;
  /** Shows a full-screen notice instead of the app */
  maintenance: boolean;
  maintenanceMessage: string;
  /** Strip at the top of the home screen */
  announcement: string;
  announcementOn: boolean;
}

export const DEFAULT_FEATURES: AppFeatures = {
  ordering: true,
  delivery: true,
  pickup: true,
  promoCodes: true,
  reviews: true,
  liveChat: true,
  whatsapp: true,
  usdPrices: true,
  signups: true,
  googleSignIn: true,
  lowStockBadges: true,
  maintenance: false,
  maintenanceMessage: "We're making improvements and will be back shortly.",
  announcement: "",
  announcementOn: false,
};

export type BannerStyle = "dark" | "orange" | "light";
export type BannerLink = "none" | "category" | "product" | "deals" | "url";

export interface Banner {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  imageUrl: string | null;
  style: BannerStyle;
  /** category → slug, product → slug, url → https link */
  linkType: BannerLink;
  linkValue: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface PlaceOrderInput {
  items: { variantId: string; quantity: number }[];
  fulfilmentType: FulfilmentType;
  branchId: string;
  deliveryAddress?: DeliveryAddress;
  paymentMethod: PaymentMethodCode;
  cryptoAsset?: string;
  promoCode?: string;
  idempotencyKey: string;
}

export interface CartLine {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Marketplace stores
// ---------------------------------------------------------------------------
export interface StorefrontSettings {
  themeId: string;
  accent?: string | null;
  header: "cover" | "band";
  layout: "grid" | "large";
  announcement?: string | null;
}

/** A store as shoppers see it in the app */
export interface MarketStore {
  id: string;
  name: string;
  slug: string;
  ticker: string;
  tagline: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  storefront: StorefrontSettings | null;
  sells: string[];
  featuredUntil: string | null;
  productCount?: number;
  ratingAverage?: number | null;
}

export interface MarketStoreDetail extends MarketStore {
  branchId: string | null;
  categories: string[];
  products: CatalogProduct[];
}

export type OfferHours = 6 | 12 | 24;

/** A store's product as its dashboard shows it */
export interface MerchantProduct {
  id: string;
  name: string;
  brand: string | null;
  image: string | null;
  images: string[];
  category: string;
  condition: "new" | "used" | "refurbished";
  description: string | null;
  warrantyMonths: number | null;
  inTheBox: string[];
  highlights: string[];
  specifications: Record<string, string>;
  price: number;
  compareAt: number | null;
  stock: number;
  options: { name: string; stock: number }[];
  status: "live" | "draft" | "hidden";
  sold: number;
  negotiable: { floor: number | null; hours: OfferHours } | null;
  deliveryZoneIds: string[];
  pickup: boolean;
  createdAt: string;
}

export interface MerchantProductInput {
  name: string;
  brand?: string | null;
  category: string;
  condition: "new" | "used" | "refurbished";
  description?: string | null;
  warrantyMonths?: number | null;
  inTheBox: string[];
  highlights: string[];
  specifications: Record<string, string>;
  images: string[];
  price: number;
  compareAt?: number | null;
  stock: number;
  options: { name: string; stock: number }[];
  status: "live" | "draft" | "hidden";
  negotiable: boolean;
  offerFloor?: number | null;
  offerHours?: OfferHours | null;
  deliveryZoneIds: string[];
  pickup: boolean;
}

export type MerchantOrderStatus = "new" | "accepted" | "shipped" | "delivered" | "completed" | "declined" | "payback";

export interface MerchantOrder {
  id: string;
  number: string;
  status: MerchantOrderStatus;
  customer: { name: string; username: string; phone: string; address: string };
  fulfilment: "delivery" | "pickup";
  items: { name: string; image: string | null; qty: number; price: number; option?: string }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paidWithTokens: number;
  createdAt: string;
  acceptBy?: string;
  history: { at: string; label: string; note?: string }[];
}

export interface DeliveryZone {
  id: string;
  state: string;
  /** Empty = the whole state */
  areas: string[];
  homeFee: number;
  pickup?: { fee: number; point: string };
  days: string;
  freeOver?: number;
  active: boolean;
  review: "pending" | "approved" | "declined";
  reviewNote?: string;
}

export type DeliveryZoneInput = Omit<DeliveryZone, "id" | "review" | "reviewNote">;

export interface MerchantCustomer {
  userId: string;
  name: string | null;
  username: string | null;
  phone: string | null;
  orders: number;
  spent: number;
  lastOrderAt: string;
  firstOrderAt: string;
}

export interface MerchantSummary {
  salesByDay: { day: string; amount: number; orders: number }[];
  completedOrders: number;
  waiting: number;
  inProgress: number;
}

export interface MerchantApplicationInput {
  sellerKind: "registered" | "individual";
  sells: string[];
  structure?: "BN" | "LTD" | "PLC" | "IT" | null;
  registeredName?: string | null;
  registrationNumber?: string | null;
  registeredOn?: string | null;
  tin?: string | null;
  businessAddress?: string | null;
  documents?: Record<string, string>;
  people?: { name: string; role: string; share: number }[];
  bank?: { bankName: string; accountNumber: string } | null;
  submit?: boolean;
}
