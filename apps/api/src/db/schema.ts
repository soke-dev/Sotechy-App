// Postgres schema (Railway). Column names are snake_case in the database via `casing: "snake_case"`.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
export const paymentMethodEnum = pgEnum("payment_method", ["bank_transfer", "card", "crypto", "cash", "pos_terminal"]);
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
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "pending", "resolved", "closed"]);

// ---------------------------------------------------------------------------
// Branches & users
// ---------------------------------------------------------------------------
export const branches = pgTable("branches", {
  id: uuid().primaryKey().defaultRandom(),
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
  passwordHash: text().notNull(),
  fullName: text(),
  phone: text(),
  role: roleEnum().notNull().default("customer"),
  branchId: uuid().references(() => branches.id, { onDelete: "set null" }), // staff home branch
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Marketplace (Phase 4 — table exists, onboarding disabled in v1)
// ---------------------------------------------------------------------------
export const merchants = pgTable("merchants", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  ownerId: uuid().references(() => users.id, { onDelete: "set null" }),
  status: merchantStatusEnum().notNull().default("pending"),
  contactEmail: text(),
  contactPhone: text(),
  commissionRate: numeric({ precision: 5, scale: 2, mode: "number" }),
  createdAt: createdAt(),
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
    channel: salesChannelEnum().notNull().default("online"),
    branchId: uuid().references(() => branches.id),
    fulfilmentType: fulfilmentTypeEnum().notNull().default("pickup"),
    deliveryAddress: jsonb().$type<Record<string, string>>(),
    walkInCustomer: jsonb().$type<{ name?: string; phone?: string }>(),
    status: orderStatusEnum().notNull().default("pending_payment"),
    subtotal: money().notNull().default(0),
    discountTotal: money().notNull().default(0),
    deliveryFee: money().notNull().default(0),
    total: money().notNull().default(0),
    currency: text().notNull().default("NGN"),
    paymentMethod: paymentMethodEnum().notNull(),
    cryptoAsset: text(),
    promotionId: uuid().references(() => promotions.id),
    idempotencyKey: text().unique(),
    stockCommitted: boolean().notNull().default(false), // true once stock has been deducted
    reservationExpiresAt: timestamp({ withTimezone: true }),
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
