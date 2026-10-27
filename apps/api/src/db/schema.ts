// Postgres schema (Railway). Column names are snake_case in the database via `casing: "snake_case"`.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const money = () => numeric({ precision: 14, scale: 2, mode: "number" });
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const roleEnum = pgEnum("role", ["customer", "staff", "manager", "admin"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "processing",
  "ready_for_pickup",
  "dispatched",
  "delivered",
  "cancelled",
  "payment_failed",
  "refunded",
]);
export const fulfilmentTypeEnum = pgEnum("fulfilment_type", ["delivery", "pickup"]);
export const salesChannelEnum = pgEnum("sales_channel", ["online", "in_store"]);
export const paymentMethodEnum = pgEnum("payment_method", ["bank_transfer", "online", "crypto", "cash", "pos_terminal"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "confirmed", "failed", "expired", "refunded"]);
export const refundStatusEnum = pgEnum("refund_status", ["requested", "approved", "rejected", "processed"]);
export const productConditionEnum = pgEnum("product_condition", ["new", "used", "refurbished"]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "restock",
  "sale",
  "transfer_in",
  "transfer_out",
  "adjustment",
  "return",
]);
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "ordered", "received", "cancelled"]);
export const merchantStatusEnum = pgEnum("merchant_status", ["pending", "approved", "suspended"]);
export const sellerKindEnum = pgEnum("seller_kind", ["registered", "individual"]);
/** The owner's identity check (ID document + liveness, through Didit) */
export const kycStatusEnum = pgEnum("kyc_status", ["not_started", "in_progress", "in_review", "approved", "declined", "resubmit", "expired"]);

export interface StorefrontSettings {
  themeId: string;
  accent?: string | null;
  header: "cover" | "band";
  layout: "grid" | "large";
  announcement?: string | null;
}

export interface MerchantApplication {
  structure?: "BN" | "LTD" | "PLC" | "IT" | null;
  registeredName?: string | null;
  registrationNumber?: string | null;
  registeredOn?: string | null;
  tin?: string | null;
  businessAddress?: string | null;
  /** Uploaded documents by name, e.g. { "CAC certificate": "/media/…" } */
  documents?: Record<string, string>;
  people?: { name: string; role: string; share: number }[];
  bank?: { bankName: string; accountNumber: string } | null;
  /** What the business does and who it sells to */
  description?: string | null;
  /** The business online: its website and social pages */
  website?: string | null;
  socials?: { instagram?: string | null; x?: string | null; facebook?: string | null; tiktok?: string | null } | null;
  /** The store picked its own ticker */
  tickerChosen?: boolean;
}

/** What Didit found, kept for admin review (no document images or full ID numbers) */
export interface KycResult {
  diditStatus: string;
  documentType?: string | null;
  documentStatus?: string | null;
  issuingCountry?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  documentNumberEnding?: string | null;
  livenessStatus?: string | null;
  livenessScore?: number | null;
  faceMatchStatus?: string | null;
  faceMatchScore?: number | null;
  warnings?: string[];
}
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "pending", "resolved", "closed"]);

// ---------------------------------------------------------------------------
// Branches & users
// ---------------------------------------------------------------------------
export const branches = pgTable("branches", {
  id: uuid().primaryKey().defaultRandom(),
  /** Set for a marketplace store's own shop; null for Sotechy's branches */
  merchantId: uuid(),
  name: text().notNull(),
  code: text().notNull().unique(),
  address: text().notNull(),
  city: text().notNull(),
  state: text().notNull(),
  phone: text(),
  openingHours: text(),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  passwordHash: text(), // null for accounts that only use Google sign-in
  googleId: text().unique(),
  avatarUrl: text(),
  /** Chosen illustrated avatar (m1–m3, f1–f3); null = generated from the user id */
  avatarStyle: text(),
  fullName: text(),
  /** Public @handle: how people send each other tokens and how stores see a customer. Lowercase. */
  username: text().unique(),
  /** Number for calls, as +234… */
  phone: text(),
  /** WhatsApp number when it differs from `phone`, as +234… */
  whatsappPhone: text(),
  /** Who invited them (they entered that person's referral code, which is their @username) */
  referredById: uuid(),
  role: roleEnum().notNull().default("customer"),
  branchId: uuid().references(() => branches.id, { onDelete: "set null" }), // staff home branch
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Phones that get push notifications for an account (Expo push tokens) */
export const pushDevices = pgTable("push_devices", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** ExponentPushToken[…]; a phone moves to whoever signs in on it last */
  token: text().notNull().unique(),
  platform: text().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Admin sign-in: after the right password, a 6-digit code is emailed. Only a hash of the code is kept. */
export const loginCodes = pgTable("login_codes", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  attempts: integer().notNull().default(0),
  createdAt: createdAt(),
});

/** Emailed 6-digit codes for resetting a password. Only a hash of the code is kept. */
export const passwordResets = pgTable("password_resets", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  /** Wrong guesses so far; the code stops working after 5 */
  attempts: integer().notNull().default(0),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Marketplace: a store is owned by an ordinary account, so one sign-in works in the app and the dashboard
// ---------------------------------------------------------------------------
export const merchants = pgTable("merchants", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  /** Store address in the app, lowercase, e.g. "xena-gadgets" */
  slug: text().notNull().unique(),
  /** The store token's symbol without the $, e.g. "XENA" */
  ticker: text().notNull().unique(),
  /** One store per account for now */
  ownerId: uuid().unique().references(() => users.id, { onDelete: "set null" }),
  sellerKind: sellerKindEnum().notNull().default("registered"),
  /** pending = test mode until Sotechy verifies the store */
  status: merchantStatusEnum().notNull().default("pending"),
  contactEmail: text(),
  /** Number for order calls, as +234… */
  contactPhone: text(),
  /** WhatsApp number for order alerts when it differs from contactPhone, as +234… */
  contactWhatsapp: text(),
  commissionRate: numeric({ precision: 5, scale: 2, mode: "number" }),
  /** Storefront look, shown in the app */
  tagline: text(),
  logoUrl: text(),
  coverUrl: text(),
  storefront: jsonb().$type<StorefrontSettings>(),
  /** What the store sells (up to 3), from the setup list or the merchant's own words */
  sells: text().array().notNull().default(sql`'{}'::text[]`),
  /** Business details and documents from setup, for Sotechy's review */
  application: jsonb().$type<MerchantApplication>(),
  /** When the merchant submitted setup for review */
  submittedAt: timestamp({ withTimezone: true }),
  /** Shown first on the app's home and in search until then */
  featuredUntil: timestamp({ withTimezone: true }),
  /** Owner's ID + liveness check through Didit; admin still approves the store itself */
  kycStatus: kycStatusEnum().notNull().default("not_started"),
  kycSessionId: text().unique(),
  kycResult: jsonb().$type<KycResult>(),
  kycUpdatedAt: timestamp({ withTimezone: true }),
  /** Where payouts go, checked with the bank through Flutterwave */
  payoutBankCode: text(),
  payoutBankName: text(),
  payoutAccountNumber: text(),
  payoutAccountName: text(),
  /** Whose name the account is in: "business", "owner", or null when it matches neither */
  payoutAccountMatch: text(),
  payoutVerifiedAt: timestamp({ withTimezone: true }),
  /** The store's Bachs account that its payouts go through (Bachs only) */
  payoutRecipientId: text(),
  /** When Sotechy approved the store and its token; the ticker can't change after this */
  tokenApprovedAt: timestamp({ withTimezone: true }),
  /** Where the token lives on chain (set when it's created on Monad) */
  tokenContract: text(),
  /** The token's id in the Sotechy Tokens contract: 1 is $SOTECHY, stores follow in the order they're approved */
  tokenId: integer().unique(),
  /** This store's own payout plan; null = the standard plan */
  payoutPlan: jsonb().$type<{ firstPercent: number; fee: "spread" | "first" | "last" }>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const zoneReviewEnum = pgEnum("zone_review", ["pending", "approved", "declined"]);
export const offerStatusEnum = pgEnum("offer_status", ["waiting_store", "waiting_customer", "agreed", "declined", "expired", "used"]);
export const payoutStageEnum = pgEnum("payout_stage", ["first", "final", "payback"]);
export const payoutStatusEnum = pgEnum("payout_status", ["scheduled", "sending", "paid", "failed", "held", "cancelled", "owed", "settled"]);

/** Where a marketplace store delivers. Sotechy approves each new area (and changes to where it covers). */
export const deliveryZones = pgTable("delivery_zones", {
  id: uuid().primaryKey().defaultRandom(),
  merchantId: uuid()
    .notNull()
    .references(() => merchants.id, { onDelete: "cascade" }),
  state: text().notNull(),
  /** Cities or areas in the state; empty means the whole state */
  areas: text().array().notNull().default(sql`'{}'::text[]`),
  /** Delivered to the customer's door */
  homeFee: money().notNull(),
  /** Collected from a pickup point in the area (cheaper); null = no pickup there */
  pickupFee: money(),
  pickupPoint: text(),
  days: text().notNull(),
  freeOver: money(),
  isActive: boolean().notNull().default(true),
  review: zoneReviewEnum().notNull().default("pending"),
  reviewNote: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  parentId: uuid(),
  imageUrl: text(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const products = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid().references(() => merchants.id, { onDelete: "cascade" }), // null = Sotechy's own stock
    categoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    name: text().notNull(),
    slug: text().notNull().unique(),
    brand: text(),
    model: text(),
    description: text(),
    specifications: jsonb().$type<Record<string, string>>().notNull().default({}),
    images: text().array().notNull().default(sql`'{}'::text[]`),
    condition: productConditionEnum().notNull().default("new"),
    warrantyMonths: integer(),
    returnPolicy: text(),
    lowStockThreshold: integer().notNull().default(3),
    allowDelivery: boolean().notNull().default(true),
    allowPickup: boolean().notNull().default(true),
    isPublished: boolean().notNull().default(false),
    isFeatured: boolean().notNull().default(false),
    isDemo: boolean().notNull().default(false),
    /** Short selling points shown as a checklist */
    highlights: text().array().notNull().default(sql`'{}'::text[]`),
    /** What comes in the box */
    inTheBox: text().array().notNull().default(sql`'{}'::text[]`),
    /** A store hid this product on purpose (vs a draft it hasn't finished) */
    isHidden: boolean().notNull().default(false),
    /** A marketplace store's own category name (from its list or typed under "Other") */
    storeCategory: text(),
    /** Customers can make an offer; `offerFloor` is the lowest the store will consider (only it sees this) */
    negotiable: boolean().notNull().default(false),
    offerFloor: money(),
    /** How long an agreed price lasts: 6, 12 or 24 hours */
    offerHours: integer(),
    /** A marketplace store's delivery areas this product ships to */
    deliveryZoneIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.categoryId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text().notNull().unique(),
    name: text().notNull().default("Standard"),
    attributes: jsonb().$type<Record<string, string>>().notNull().default({}),
    price: money().notNull(),
    compareAtPrice: money(),
    costPrice: money(), // never exposed by storefront routes
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.productId), check("variant_price_nonneg", sql`${t.price} >= 0`)],
);

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer().notNull(),
    title: text(),
    body: text().notNull(),
    /** Photos of what they bought; a review with one earns the full review bonus */
    photos: text().array().notNull().default(sql`'{}'::text[]`),
    /** true when the reviewer has a completed order containing this product */
    verified: boolean().notNull().default(false),
    /** admins can hide a review */
    isPublished: boolean().notNull().default(true),
    /** The store's public answer */
    storeReply: text(),
    storeRepliedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.productId, t.userId), index().on(t.productId, t.createdAt), check("review_rating_range", sql`${t.rating} between 1 and 5`)],
);

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export const inventory = pgTable(
  "inventory",
  {
    id: uuid().primaryKey().defaultRandom(),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    branchId: uuid()
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    quantity: integer().notNull().default(0), // on hand
    reserved: integer().notNull().default(0), // held by unpaid orders
    updatedAt: updatedAt(),
  },
  (t) => [
    unique().on(t.variantId, t.branchId),
    check("inventory_quantity_nonneg", sql`${t.quantity} >= 0`),
    check("inventory_reserved_valid", sql`${t.reserved} >= 0 and ${t.reserved} <= ${t.quantity}`),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid().primaryKey().defaultRandom(),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    branchId: uuid()
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    movementType: stockMovementTypeEnum().notNull(),
    quantity: integer().notNull(), // signed change to on-hand quantity
    referenceType: text(),
    referenceId: uuid(),
    note: text(),
    performedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.variantId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export const addresses = pgTable("addresses", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text(),
  recipientName: text().notNull(),
  phone: text().notNull(),
  line1: text().notNull(),
  line2: text(),
  city: text().notNull(),
  state: text().notNull(),
  isDefault: boolean().notNull().default(false),
  createdAt: createdAt(),
});

export const wishlists = pgTable(
  "wishlists",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

// ---------------------------------------------------------------------------
// Payment configuration, promotions, settings
// ---------------------------------------------------------------------------
export const paymentMethods = pgTable("payment_methods", {
  code: paymentMethodEnum().primaryKey(),
  label: text().notNull(),
  isEnabled: boolean().notNull().default(false),
  online: boolean().notNull().default(true),
  inStore: boolean().notNull().default(true),
  instructions: text(),
  updatedAt: updatedAt(),
});

// Public receiving addresses only. NEVER store private keys or seed phrases.
export const cryptoAssets = pgTable(
  "crypto_assets",
  {
    id: uuid().primaryKey().defaultRandom(),
    symbol: text().notNull(),
    name: text().notNull(),
    network: text().notNull(),
    receivingAddress: text(),
    isEnabled: boolean().notNull().default(false),
  },
  (t) => [unique().on(t.symbol, t.network)],
);

export const promotions = pgTable("promotions", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  code: text().unique(), // null = applied automatically when eligible
  discountType: discountTypeEnum().notNull().default("percentage"),
  value: money().notNull(),
  maxDiscountAmount: money(),
  minOrderAmount: money(),
  paymentMethod: paymentMethodEnum(), // restrict to a payment method
  cryptoAsset: text(), // restrict to an asset, e.g. MOVE
  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  usageLimit: integer(),
  usageCount: integer().notNull().default(0),
  isActive: boolean().notNull().default(false),
  createdAt: createdAt(),
});

/** Operational settings (delivery fees, bank details, support contacts). No secrets here. */
export const appSettings = pgTable("app_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Orders & payments
// ---------------------------------------------------------------------------
export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1001 });

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderNumber: text()
      .notNull()
      .unique()
      .default(sql`('SOT-' || nextval('order_number_seq')::text)`),
    customerId: uuid().references(() => users.id, { onDelete: "set null" }),
    merchantId: uuid().references(() => merchants.id),
    /** A store order's delivery area (door delivery) or pickup point */
    deliveryZoneId: uuid().references(() => deliveryZones.id, { onDelete: "set null" }),
    channel: salesChannelEnum().notNull().default("online"),
    branchId: uuid().references(() => branches.id),
    fulfilmentType: fulfilmentTypeEnum().notNull().default("pickup"),
    deliveryAddress: jsonb().$type<Record<string, string>>(),
    walkInCustomer: jsonb().$type<{ name?: string; phone?: string }>(),
    status: orderStatusEnum().notNull().default("pending_payment"),
    subtotal: money().notNull().default(0),
    discountTotal: money().notNull().default(0),
    deliveryFee: money().notNull().default(0),
    /** Naira value of the tokens the customer paid with (taken off the total; the reserve covers it for the store) */
    tokensValue: money().notNull().default(0),
    /** Which tokens paid for it: [{ tokenId, ticker, amount }] */
    tokensUsed: jsonb().$type<{ tokenId: number; ticker: string; amount: number }[]>(),
    total: money().notNull().default(0),
    currency: text().notNull().default("NGN"),
    paymentMethod: paymentMethodEnum().notNull(),
    cryptoAsset: text(),
    promotionId: uuid().references(() => promotions.id),
    idempotencyKey: text().unique(),
    stockCommitted: boolean().notNull().default(false), // true once stock has been deducted
    reservationExpiresAt: timestamp({ withTimezone: true }),
    /** The customer said they got it; the store's final payment falls due then */
    customerConfirmedAt: timestamp({ withTimezone: true }),
    notes: text(),
    createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.customerId, t.createdAt), index().on(t.status, t.createdAt)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id),
    productName: text().notNull(),
    variantName: text().notNull(),
    sku: text().notNull(),
    unitPrice: money().notNull(), // price at time of purchase
    unitCost: money(), // cost at time of purchase (null = unknown)
    quantity: integer().notNull(),
    lineTotal: money().notNull(),
  },
  (t) => [index().on(t.orderId)],
);

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatusEnum(),
  toStatus: orderStatusEnum().notNull(),
  changedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  note: text(),
  createdAt: createdAt(),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: paymentMethodEnum().notNull(),
    provider: text(),
    providerReference: text().unique(),
    amount: money().notNull(),
    currency: text().notNull().default("NGN"),
    cryptoAsset: text(),
    cryptoNetwork: text(),
    cryptoAmount: numeric({ precision: 36, scale: 18 }),
    txHash: text().unique(),
    status: paymentStatusEnum().notNull().default("pending"),
    verifiedAt: timestamp({ withTimezone: true }),
    verifiedBy: uuid().references(() => users.id, { onDelete: "set null" }), // null = verified by provider
    verificationNote: text(),
    raw: jsonb(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.orderId)],
);

export const refunds = pgTable("refunds", {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  paymentId: uuid().references(() => payments.id),
  amount: money().notNull(),
  reason: text(),
  status: refundStatusEnum().notNull().default("requested"),
  requestedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  processedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  processedAt: timestamp({ withTimezone: true }),
});

export const shipments = pgTable("shipments", {
  id: uuid().primaryKey().defaultRandom(),
  orderId: uuid()
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: text(),
  trackingNumber: text(),
  status: text().notNull().default("pending"),
  shippedAt: timestamp({ withTimezone: true }),
  deliveredAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Suppliers & purchasing
// ---------------------------------------------------------------------------
export const suppliers = pgTable("suppliers", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  contactName: text(),
  phone: text(),
  email: text(),
  address: text(),
  notes: text(),
  createdAt: createdAt(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid().primaryKey().defaultRandom(),
  supplierId: uuid().references(() => suppliers.id, { onDelete: "set null" }),
  branchId: uuid()
    .notNull()
    .references(() => branches.id),
  status: purchaseOrderStatusEnum().notNull().default("draft"),
  totalCost: money().notNull().default(0),
  orderedAt: timestamp({ withTimezone: true }),
  receivedAt: timestamp({ withTimezone: true }),
  createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid().primaryKey().defaultRandom(),
  purchaseOrderId: uuid()
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  variantId: uuid()
    .notNull()
    .references(() => productVariants.id),
  quantity: integer().notNull(),
  unitCost: money().notNull(),
  receivedQuantity: integer().notNull().default(0),
});

// ---------------------------------------------------------------------------
// Support & audit
// ---------------------------------------------------------------------------
export const supportTickets = pgTable("support_tickets", {
  id: uuid().primaryKey().defaultRandom(),
  customerId: uuid().references(() => users.id, { onDelete: "set null" }),
  orderId: uuid().references(() => orders.id, { onDelete: "set null" }),
  subject: text().notNull(),
  message: text().notNull(),
  status: ticketStatusEnum().notNull().default("open"),
  createdAt: createdAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: uuid(),
    details: jsonb().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt)],
);

// ---------------------------------------------------------------------------
// Content managed from the admin dashboard
// ---------------------------------------------------------------------------
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Uploaded images (product photos, banners, category art), served at /media/:id. */
export const media = pgTable("media", {
  id: uuid().primaryKey().defaultRandom(),
  filename: text().notNull(),
  contentType: text().notNull(),
  size: integer().notNull(),
  data: bytea().notNull(),
  /** Private files (a store's business documents) are only shown to their owner and Sotechy staff */
  isPrivate: boolean().notNull().default(false),
  createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const bannerStyleEnum = pgEnum("banner_style", ["dark", "orange", "light"]);
export const bannerLinkEnum = pgEnum("banner_link", ["none", "category", "product", "deals", "url"]);

/** Home-screen carousel slides. */
export const banners = pgTable("banners", {
  id: uuid().primaryKey().defaultRandom(),
  eyebrow: text(),
  title: text().notNull(),
  subtitle: text(),
  ctaLabel: text().notNull().default("Shop now"),
  imageUrl: text(),
  style: bannerStyleEnum().notNull().default("dark"),
  linkType: bannerLinkEnum().notNull().default("none"),
  linkValue: text(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Payment-provider webhook events already handled (the same event can arrive more than once). */
export const webhookEvents = pgTable("webhook_events", {
  id: text().primaryKey(),
  provider: text().notNull(),
  type: text().notNull(),
  receivedAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Payouts to marketplace stores (sent through Flutterwave)
// ---------------------------------------------------------------------------
export const merchantPayouts = pgTable(
  "merchant_payouts",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    stage: payoutStageEnum().notNull(),
    /** What the store receives (or, for a payback, owes) */
    amount: money().notNull(),
    /** Sotechy's fee taken from this payment */
    fee: money().notNull().default(0),
    status: payoutStatusEnum().notNull().default("scheduled"),
    /** Not sent before this */
    dueAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Sent to Flutterwave as the transfer reference, so a payout can never go out twice */
    reference: text().notNull().unique(),
    /** The service that sent it ("bachs" or "flutterwave") and its ids there */
    provider: text(),
    providerId: text(),
    transferId: text(),
    /** The account it was sent to */
    bankCode: text(),
    bankName: text(),
    accountNumber: text(),
    accountName: text(),
    failureReason: text(),
    attempts: integer().notNull().default(0),
    sentAt: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.orderId, t.stage), index().on(t.status, t.dueAt), index().on(t.merchantId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Price offers: a customer offers a price on a negotiable product, the store answers
// ---------------------------------------------------------------------------
export const offers = pgTable(
  "offers",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    customerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: offerStatusEnum().notNull().default("waiting_store"),
    /** The price when the offer was made */
    listPrice: money().notNull(),
    /** The amount currently on the table */
    lastAmount: money().notNull(),
    agreedPrice: money(),
    /** An agreed price is held for the customer until then */
    agreedUntil: timestamp({ withTimezone: true }),
    /** The order the agreed price was used in */
    orderId: uuid().references(() => orders.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.merchantId, t.updatedAt), index().on(t.customerId, t.updatedAt)],
);

export const offerMessages = pgTable(
  "offer_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    offerId: uuid()
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    /** "customer" or "store" */
    from: text().notNull(),
    /** "offer", "counter", "accept", "decline" */
    kind: text().notNull(),
    amount: money(),
    text: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.offerId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Following stores, and the messages stores send their followers
// ---------------------------------------------------------------------------
export const storeFollows = pgTable(
  "store_follows",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.merchantId] }), index().on(t.merchantId)],
);

/** Stores a customer saved with the heart */
export const storeFavourites = pgTable(
  "store_favourites",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.merchantId] }), index().on(t.merchantId)],
);

export const storeNotices = pgTable(
  "store_notices",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    title: text().notNull(),
    body: text().notNull(),
    /** A product the message points to */
    productId: uuid().references(() => products.id, { onDelete: "set null" }),
    sentTo: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.merchantId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Paid featuring: a store pays to be shown first for a while
// ---------------------------------------------------------------------------
export const featuredPurchases = pgTable(
  "featured_purchases",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    months: integer().notNull(),
    amount: money().notNull(),
    /** "pending", "paid" or "expired" */
    status: text().notNull().default("pending"),
    checkoutId: text(),
    /** Featured until this date once paid */
    until: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.merchantId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Store tokens: the ledger is what counts; the chain is a public copy of it
// ---------------------------------------------------------------------------
export const tokenEntries = pgTable(
  "token_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** 1 = $SOTECHY, otherwise merchants.tokenId */
    tokenId: integer().notNull(),
    /** "mint", "burn" or "move", as on chain */
    kind: text().notNull(),
    /** Who it comes from (burn, move) and goes to (mint, move); not foreign keys, so history outlives accounts */
    fromUserId: uuid(),
    toUserId: uuid(),
    amount: integer().notNull(),
    /** "earned", "bonus", "sent", "refunded" or "adjusted" */
    reason: text().notNull(),
    orderId: uuid(),
    note: text(),
    /** What it came from, e.g. "earn:<order>:<token>", so the same thing is never recorded twice */
    sourceKey: text().unique(),
    createdBy: uuid(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.toUserId, t.createdAt),
    index().on(t.fromUserId, t.createdAt),
    index().on(t.tokenId),
    index().on(t.orderId),
    check("token_entries_amount_positive", sql`${t.amount} > 0`),
  ],
);

/** The naira that backs tokens: 1% of every sale comes in, tokens spent at stores go out */
export const reserveEntries = pgTable(
  "reserve_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** "fee_share", "walk_in_fee", "spent", "returned" or "adjusted" */
    kind: text().notNull(),
    /** Positive in, negative out */
    amount: money().notNull(),
    orderId: uuid(),
    walkInId: uuid(),
    note: text(),
    sourceKey: text().notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.createdAt)],
);

/** A sale in a store's own shop: the customer gets tokens once the store pays Sotechy's fee */
export const walkInSales = pgTable(
  "walk_in_sales",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    customerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: money().notNull(),
    fee: money().notNull(),
    note: text(),
    /** "pending" until the fee is paid, then "paid" */
    status: text().notNull().default("pending"),
    checkoutId: text(),
    paidAt: timestamp({ withTimezone: true }),
    createdBy: uuid(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.merchantId, t.createdAt)],
);

/** People who help run a store, each with their own sign-in and a role */
export const merchantMembers = pgTable(
  "merchant_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    /** Set when they accept; one store per account */
    userId: uuid()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text().notNull(),
    /** "admin", "orders", "catalogue", "finance" or "viewer" */
    role: text().notNull(),
    /** sha256 of the invite link's token */
    inviteHash: text().unique(),
    invitedBy: uuid(),
    acceptedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.merchantId, t.email)],
);

/** Receipts for completed orders. The full receipt stays here; the chain gets its fingerprint. */
export const receipts = pgTable("receipts", {
  /** The receipt number, also its id on chain */
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: uuid()
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  userId: uuid().notNull(),
  tokenId: integer().notNull(),
  content: jsonb().$type<Record<string, unknown>>().notNull(),
  /** keccak256 of the content (which includes a random salt, so it can't be guessed) */
  fingerprint: text().notNull(),
  createdAt: createdAt(),
});

/** What's waiting to be written on chain. Monad gets each one within seconds; Base when an admin sends a batch. */
export const chainOps = pgTable(
  "chain_ops",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    /** "tokens" or "receipts" */
    contract: text().notNull(),
    /** "register", "mint", "burn", "move" or "receipt" */
    kind: text().notNull(),
    /** What it came from (a ledger entry, a receipt, a store's token), so nothing is queued twice */
    sourceId: text().notNull(),
    data: jsonb().$type<Record<string, string | number>>().notNull(),
    /** bytes32 recorded with the change on chain */
    ref: text().notNull(),
    monadTx: text(),
    monadAt: timestamp({ withTimezone: true }),
    monadError: text(),
    monadTries: integer().notNull().default(0),
    baseTx: text(),
    baseAt: timestamp({ withTimezone: true }),
    baseError: text(),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.contract, t.kind, t.sourceId), index().on(t.monadAt), index().on(t.baseAt)],
);

/** A store's payout accounts (up to 3). Payouts always go to the default one, which is also copied onto the store. */
export const payoutAccounts = pgTable(
  "payout_accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    merchantId: uuid()
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    bankCode: text().notNull(),
    bankName: text().notNull(),
    accountNumber: text().notNull(),
    /** The name the bank gave for the account */
    accountName: text().notNull(),
    /** "business", "owner", or null when it matches neither (Sotechy reviews those) */
    match: text(),
    isDefault: boolean().notNull().default(false),
    verifiedAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.merchantId, t.bankCode, t.accountNumber), index().on(t.merchantId)],
);
