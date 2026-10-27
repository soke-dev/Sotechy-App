import type { FulfilmentType, OrderStatus } from "@sotechy/shared";

/** Customer-facing progress steps for an order. */
export function orderSteps(fulfilment: FulfilmentType): { status: OrderStatus; label: string }[] {
  return [
    { status: "pending_payment", label: "Placed" },
    { status: "paid", label: "Paid" },
    { status: "processing", label: "Preparing" },
    fulfilment === "pickup" ? { status: "ready_for_pickup", label: "Available" } : { status: "dispatched", label: "On the way" },
    { status: "delivered", label: fulfilment === "pickup" ? "Collected" : "Delivered" },
  ];
}

/** Headline and explanation shown at the top of the tracking screen. */
export function statusCopy(status: OrderStatus, fulfilment: FulfilmentType): { title: string; body: string } {
  switch (status) {
    case "pending_payment":
      return { title: "Waiting for your payment", body: "Pay using the details below. We confirm your order as soon as the payment is verified." };
    case "payment_failed":
      return { title: "Payment didn't go through", body: "Please try paying again or contact us for help." };
    case "paid":
      return { title: "Payment confirmed", body: "Thanks! We've received your payment and will start preparing your order." };
    case "processing":
      return { title: "We're preparing your order", body: "Our team is checking and packing your items." };
    case "ready_for_pickup":
      return { title: "Available for pickup", body: "Your order is waiting at the pickup location. Bring your order number, and tap “I've picked it up” once you have it." };
    case "dispatched":
      return { title: "On its way to you", body: "Our rider is on the way. Keep your phone close for the delivery call." };
    case "delivered":
      return fulfilment === "pickup"
        ? { title: "Collected. Enjoy!", body: "Thanks for shopping with Sotechy. Your warranty starts today." }
        : { title: "Delivered. Enjoy!", body: "Thanks for shopping with Sotechy. Your warranty starts today." };
    case "cancelled":
      return { title: "Order cancelled", body: "This order was cancelled. Any reserved items were released." };
    case "refunded":
      return { title: "Refunded", body: "Your refund has been processed." };
  }
}
