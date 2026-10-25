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
  phone: string | null;
  role: Role;
  branchId: string | null;
  avatarUrl?: string | null;
  /** Chosen illustrated avatar (m1–m3, f1–f3); null = generated */
  avatarStyle?: string | null;
  createdAt: string;
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
