import type { OrderStatus, PaymentMethodCode, Role } from "./types";

export const BUSINESS = {
  name: "Sotechy Shop",
  tagline: "Electronics, gadgets and home appliances",
  website: "https://www.sotechy.shop",
  headOffice: "No. 20 Etete Road, Benin City, Nigeria",
  founded: "August 2022",
  currency: "NGN",
} as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  ready_for_pickup: "Ready for pickup",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  refunded: "Refunded",
};

/** Happy-path order of statuses, used for progress timelines. */
export const ORDER_FLOW: OrderStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "ready_for_pickup",
  "dispatched",
  "delivered",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  bank_transfer: "Bank transfer",
  online: "Pay online (Money Moves)",
  crypto: "Crypto",
  cash: "Cash (in store)",
  pos_terminal: "POS terminal (in store)",
};

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  staff: "Store staff",
  manager: "Manager",
  admin: "Administrator",
};

export const STAFF_ROLES: Role[] = ["staff", "manager", "admin"];
