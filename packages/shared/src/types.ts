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
  /** Google Maps link to the exact spot (optional) */
  mapUrl?: string | null;
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
  /** The store's public answer */
  storeReply?: string | null;
  storeRepliedAt?: string | null;
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
  /** Naira value of tokens the customer paid with (already taken off the total) */
  tokensValue: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethodCode;
  cryptoAsset: string | null;
  reservationExpiresAt: string | null;
  /** When the customer said they got it */
  customerConfirmedAt?: string | null;
  /** When the customer said it didn't arrive (Sotechy follows up) */
  customerIssueAt?: string | null;
  /** Where a pickup order is collected (a store's approved pickup location, or an approved change) */
  pickupLocation?: string | null;
  /** The pickup point's Google Maps link, when the store added one */
  pickupMapUrl?: string | null;
  /** Sent to the pickup point: its tracking (waybill) number and the driver's phone, from the store */
  handoverTracking?: string | null;
  handoverPhone?: string | null;
  /** Products in it the customer has already reviewed (one review each) */
  reviewedProductIds?: string[];
  /** Tokens put towards it (held until it's paid), and the selling store's ticker */
  tokensUsed?: { tokenId: number; ticker: string; amount: number }[] | null;
  storeTicker?: string | null;
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
  /** A store's own code (null for Sotechy's), and the store's name in admin */
  merchantId?: string | null;
  storeName?: string | null;
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
  status: "pending" | "approved" | "suspended" | "declined";
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
  /** Sotechy's note: what to change (sent back for changes) or why it was declined */
  reviewNote?: string | null;
  reviewNoteAt?: string | null;
  featuredUntil?: string | null;
  /** Where payouts go, checked with the bank */
  payoutBankCode?: string | null;
  payoutBankName?: string | null;
  payoutAccountNumber?: string | null;
  payoutAccountName?: string | null;
  payoutAccountMatch?: "business" | "owner" | null;
  payoutVerifiedAt?: string | null;
  /** When Sotechy approved the store's token (its ticker is fixed from then on) */
  tokenApprovedAt?: string | null;
  createdAt: string;
}

export type KycStatus = "not_started" | "in_progress" | "in_review" | "approved" | "declined" | "resubmit" | "expired";

/** The owner, or a team member's role ("admin", "orders", "catalogue", "finance" or "viewer") */
export type StoreRole = "owner" | "admin" | "orders" | "catalogue" | "finance" | "viewer";

export interface MerchantSession {
  user: User;
  store: MerchantStore | null;
  /** How this account runs the store; null without one */
  role?: StoreRole | null;
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
  /** Sotechy's fee on each store sale, as a fraction (e.g. 0.03), as admin sets it */
  marketplaceFee?: number;
  /** The app's ways to pay, as Admin → Settings has them (stablecoin on Money Moves; bank transfer on Money Moves or Bachs) */
  stablecoin?: boolean;
  bankTransfer?: boolean;
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
  /** Live pop-ups for Home, newest first */
  popups?: Popup[];
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
export type BannerLink = "none" | "category" | "product" | "deals" | "url" | "store" | "stores" | "wallet";
export type BannerLayout = "art" | "image";

export interface Banner {
  id: string;
  eyebrow: string | null;
  /** Optional on image-only banners */
  title: string | null;
  subtitle: string | null;
  /** No button when empty */
  ctaLabel: string | null;
  imageUrl: string | null;
  style: BannerStyle;
  /** "image": the picture is the whole banner */
  layout: BannerLayout;
  /** A store's own banner (bought with a feature) */
  merchantId?: string | null;
  /** category → slug, product → slug, store → store slug, url → https link; stores and wallet need nothing */
  linkType: BannerLink;
  linkValue: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

/** A pop-up over Home, made in Admin → App pop-ups */
export interface Popup {
  id: string;
  /** "image": one picture with the buttons under it; "art": colours, title, words and a picture */
  layout: BannerLayout;
  style: BannerStyle;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  linkType: BannerLink;
  linkValue: string | null;
  /** A second button that only closes it; none when empty */
  dismissLabel: string | null;
  /** Once closed on a phone it doesn't come back */
  showOnce: boolean;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface PlaceOrderInput {
  /** `offerId`: a price agreed with the store (one item) */
  items: { variantId: string; quantity: number; offerId?: string }[];
  fulfilmentType: FulfilmentType;
  branchId: string;
  deliveryAddress?: DeliveryAddress;
  paymentMethod: PaymentMethodCode;
  cryptoAsset?: string;
  promoCode?: string;
  idempotencyKey: string;
  /** A marketplace store's pickup point (one of its delivery areas), for pickup orders */
  pickupZoneId?: string;
  /** Which of that area's pickup points, by name */
  pickupPlace?: string;
  /** Tokens to pay with: the store's own and/or $SOTECHY */
  tokens?: { ticker: string; amount: number }[];
}

/** The marketplace store an item comes from (it ships from the store's own branch) */
export interface CartSeller {
  slug: string;
  name: string;
  branchId: string;
}

export interface CartLine {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  /** null or missing: Sotechy's own stock */
  store?: CartSeller | null;
  /** A price agreed with the store for this item (quantity stays 1) */
  offerId?: string | null;
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
  /** The store's brand colour, used for its header */
  hero?: string | null;
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
  /** How many reviews the rating is from */
  ratingCount?: number;
  /** States the store's approved delivery areas cover, and its cheapest door delivery */
  deliveryStates: string[];
  deliveryFrom: number | null;
}

/** An address suggested while typing */
export interface AddressSuggestion {
  /** The whole address, for showing in the list */
  label: string;
  /** House number and street (or place name) */
  line1: string;
  city: string;
  state: string;
  postcode: string | null;
}

/** One of a store's approved delivery areas, as shoppers see it */
export interface StoreDeliveryArea {
  id: string;
  state: string;
  /** Cities or areas in the state; empty means the whole state */
  areas: string[];
  homeFee: number;
  pickupFee: number | null;
  /** The pickup point's name, and where it is */
  pickupPoint: string | null;
  pickupAddress?: string | null;
  /** All the area's pickup points (the first is pickupPoint) */
  pickupPlaces?: { name: string; address: string; mapUrl?: string | null; fee?: number | null }[];
  days: string;
  freeOver: number | null;
}

export interface MarketStoreDetail extends MarketStore {
  branchId: string | null;
  /** Where customers can collect pickup orders */
  pickupPoints: string[];
  deliveryAreas: StoreDeliveryArea[];
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
  /** Where the customer collects a pickup order */
  pickupPoint?: string;
  /** How it got to the pickup point: tracking (waybill) number and the driver's phone */
  handover?: { tracking: string | null; phone: string | null };
  /** Money the store owes back for a cancelled order it was paid for */
  payback?: { amount: number; settled: boolean; claimedAt: string | null; reference: string | null };
  paybackAccount?: { bankName: string; accountName: string; accountNumber: string };
  /** The store asked to use another pickup location for this order */
  pickupChange?: { point: string; status: "pending" | "approved" | "declined" };
  items: { name: string; image: string | null; qty: number; price: number; option?: string }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paidWithTokens: number;
  createdAt: string;
  acceptBy?: string;
  history: { at: string; label: string; note?: string }[];
  /** When the customer said they got it */
  customerConfirmedAt?: string | null;
  /** On a single order: how the store is paid for it */
  payoutTerms?: { plan: import("./payouts").PayoutPlan; feeRate: number; finalAfterHours: number };
  /** On a single order: its payments to the store so far */
  payouts?: { stage: "first" | "final"; amount: number; status: import("./payouts").PayoutStatus; dueAt: string; paidAt: string | null }[];
}

export interface DeliveryZone {
  id: string;
  state: string;
  /** Empty = the whole state */
  areas: string[];
  homeFee: number;
  /** `point` is the place's name; `address` is where it is */
  pickup?: { fee: number; point: string; address?: string | null; places?: { name: string; address: string; mapUrl?: string | null; fee?: number | null }[] };
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
  /** Follows the store in the app */
  following?: boolean;
}

export interface MerchantSummary {
  salesByDay: { day: string; amount: number; orders: number }[];
  completedOrders: number;
  waiting: number;
  inProgress: number;
  /** Price offers waiting for the store's answer */
  offersWaiting: number;
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
  /** Google Maps link to the business (optional) */
  businessMapUrl?: string | null;
  documents?: Record<string, string>;
  people?: { name: string; role: string; share: number }[];
  bank?: { bankName: string; accountNumber: string } | null;
  /** What the business does and who it sells to, for Sotechy's review */
  description?: string | null;
  /** The business online: its website and social pages */
  website?: string | null;
  socials?: { instagram?: string | null; x?: string | null; facebook?: string | null; tiktok?: string | null } | null;
  /** The ticker the store chose for its token (until Sotechy approves the store, it can change it) */
  ticker?: string | null;
  /** Set once the store has picked its ticker itself */
  tickerChosen?: boolean;
  submit?: boolean;
}

export type OfferStatus = "waiting_store" | "waiting_customer" | "agreed" | "declined" | "expired" | "used";

/** A price offer and its back-and-forth */
export interface OfferView {
  id: string;
  status: OfferStatus;
  listPrice: number;
  /** The amount on the table now */
  lastAmount: number;
  agreedPrice: number | null;
  /** The agreed price is held until then */
  agreedUntil: string | null;
  /** How long an agreed price is held */
  hours: number;
  createdAt: string;
  updatedAt: string;
  product: { id: string; slug: string; name: string; image: string | null; variantId: string; variantName: string };
  store: { slug: string; name: string; logoUrl: string | null; branchId: string | null };
  /** Shown to the store only */
  customer: { name: string; username: string } | null;
  messages: { id: string; from: "customer" | "store"; kind: "offer" | "counter" | "accept" | "decline"; amount: number | null; text: string | null; createdAt: string }[];
}

/** One token in the customer's wallet: what they hold and what's on the way from undelivered orders */
export interface WalletBalance {
  tokenId: number;
  ticker: string;
  store: string;
  slug: string | null;
  logoUrl: string | null;
  /** Free to use */
  amount: number;
  /** Put towards an order that isn't paid yet; back in `amount` if that order is cancelled or expires */
  held?: number;
  pending: number;
  /** Earned in all, ever (less what refunds took back) */
  earned?: number;
}

export interface WalletActivity {
  id: string;
  kind: "earned" | "bonus" | "review" | "walk_in" | "spent" | "returned" | "sent" | "received" | "refunded";
  ticker: string;
  store: string;
  /** Negative when tokens left the wallet */
  amount: number;
  /** The other person's @username, for sends */
  who: string | null;
  order: string | null;
  at: string;
  /** Where it's recorded on Monad, once written */
  txUrl: string | null;
}

export interface WalletView {
  address: string;
  addressUrl: string;
  contractUrl: string | null;
  balances: WalletBalance[];
  /** Every token earned in all, across stores */
  totalEarned?: number;
  activity: WalletActivity[];
}

/** A delivered order's receipt: the full details, and its fingerprint on chain */
export interface OrderReceipt {
  id: number;
  content: Record<string, unknown>;
  fingerprint: string;
  txUrl: string | null;
  nftUrl: string | null;
}

/** A message a followed store sent */
export interface StoreNoticeView {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  storeSlug: string;
  storeName: string;
  storeLogo: string | null;
  /** The product it points to */
  productSlug: string | null;
}

/** A review of one of the store's products, as the store sees it */
export interface MerchantReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
  product: string;
  productImage: string | null;
  customer: string | null;
}

/** A message the store sent its followers */
export interface MerchantNotice {
  id: string;
  title: string;
  body: string;
  productId: string | null;
  sentTo: number;
  createdAt: string;
}

/** The merchant bell: what needs the store, and what happened lately */
export interface MerchantAttention {
  needs: { key: string; count: number; title: string; hint: string; href: string; illo: string }[];
  recent: { id: string; title: string; hint: string; href: string; illo: string; at: string }[];
}

/** Something the customer was told: an order step, an offer, a support reply, tokens or account security */
export interface AppNotification {
  id: string;
  kind: "order" | "offer" | "support" | "tokens" | "security" | string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

/** One of a customer's support conversations, for the list */
export interface SupportChatSummary {
  id: string;
  open: boolean;
  lastMessage: string;
  lastFromStaff: boolean;
  lastMessageAt: string;
  createdAt: string;
}

/** A customer's live chat with Sotechy */
export interface SupportChat {
  ticketId: string | null;
  messages: { id: string; fromStaff: boolean; body: string; imageUrl?: string | null; createdAt: string }[];
}
