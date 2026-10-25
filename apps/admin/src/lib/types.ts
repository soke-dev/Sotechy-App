// Admin-only response shapes (see apps/api/src/routes/admin/*).
import type { OrderStatus, PaymentMethodCode, PaymentStatus, RefundStatus, SalesChannel, StockMovementType } from "@sotechy/shared";

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel: SalesChannel;
  fulfilmentType: "delivery" | "pickup";
  paymentMethod: PaymentMethodCode;
  total: number;
  createdAt: string;
  customerEmail: string | null;
  customerName: string | null;
  walkInCustomer: { name?: string; phone?: string } | null;
  branchName: string | null;
}

export interface AdminPaymentRow {
  id: string;
  orderId: string;
  orderNumber: string;
  method: PaymentMethodCode;
  provider: string | null;
  providerReference: string | null;
  txHash: string | null;
  amount: number;
  cryptoAsset: string | null;
  status: PaymentStatus;
  verifiedAt: string | null;
  createdAt: string;
}

export interface RefundRow {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  createdAt: string;
}

export interface InventoryRow {
  id: string;
  variantId: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  isLow: boolean;
}

export interface StockMovementRow {
  id: string;
  movementType: StockMovementType;
  quantity: number;
  note: string | null;
  createdAt: string;
  sku: string;
  productName: string;
  branchName: string;
  performedBy: string | null;
}

export interface PosSearchRow {
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  price: number;
  quantity: number | null;
  reserved: number | null;
}

export interface SalesSummary {
  period: { from: string; to: string };
  orders: number;
  revenue: number;
  averageOrderValue: number;
  productRevenue: number;
  costOfGoods: number;
  itemsMissingCost: number;
  grossProfit: number | null;
  byChannel: { channel: string; orders: number; revenue: number }[];
  byBranch: { branch: string; orders: number; revenue: number }[];
  byPaymentMethod: { method: string; orders: number; revenue: number }[];
  bestSellers: { product_name: string; quantity: number; revenue: number }[];
  pendingPayments: { count: number; value: number };
  refunds: { count: number; value: number };
  cancelledOrders: number;
  repeatCustomers: number;
  lowStockItems: number;
  inventoryValue: { atCost: number | null; atPrice: number };
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}

export interface PurchaseOrderRow {
  id: string;
  status: string;
  totalCost: number;
  supplierName: string | null;
  branchName: string;
  orderedAt: string | null;
  receivedAt: string | null;
}

export interface SupportTicketRow {
  id: string;
  subject: string;
  message: string;
  status: "open" | "pending" | "resolved" | "closed";
  customerEmail: string | null;
  createdAt: string;
}

export interface ReviewRow {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  isPublished: boolean;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  actorEmail: string | null;
  createdAt: string;
}
