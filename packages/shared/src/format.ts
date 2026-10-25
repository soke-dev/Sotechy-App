const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return nairaFormatter.format(amount);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function stockLabel(available: number, lowThreshold = 3): string {
  if (available <= 0) return "Out of stock";
  if (available <= lowThreshold) return `Only ${available} left`;
  return "In stock";
}

/** Display-only estimate. The server (place_order) is the source of truth for totals. */
export function estimateSubtotal(lines: { unitPrice: number; quantity: number }[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}
