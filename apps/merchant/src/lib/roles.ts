// What each team role can open in the dashboard (the API checks the same rules on every request).
import type { StoreRole } from "@sotechy/shared";

export const ROLE_LABEL: Record<StoreRole, string> = {
  owner: "Owner",
  admin: "Admin",
  orders: "Orders",
  catalogue: "Catalogue",
  finance: "Finance",
  viewer: "Viewer",
};

export const ROLE_CAN: Record<Exclude<StoreRole, "owner">, string> = {
  admin: "Everything except payout accounts, setup and adding admins",
  orders: "Orders, offers, customers and walk-in sales",
  catalogue: "Products, delivery areas, the storefront and reviews",
  finance: "Payouts, the token, walk-in sales and featuring",
  viewer: "Can see everything, change nothing",
};

// Each dashboard page and the part of the store it belongs to
const PAGE_AREA: Record<string, string> = {
  "/orders": "orders",
  "/offers": "orders",
  "/customers": "orders",
  "/products": "catalogue",
  "/storefront": "catalogue",
  "/delivery": "catalogue",
  "/reviews": "catalogue",
  "/notifications": "catalogue",
  "/token": "finance",
  "/payouts": "finance",
  "/featured": "finance",
  "/walk-in": "orders",
  "/promotions": "orders",
};

/** Whether the menu shows a page to this role */
export function roleSees(role: StoreRole, href: string) {
  if (role === "owner" || role === "admin" || role === "viewer") return true;
  const area = PAGE_AREA[href];
  if (!area) return true; // Home, Team, Settings
  if (href === "/walk-in") return role === "orders" || role === "finance";
  if (href === "/notifications") return role === "catalogue" || role === "orders";
  return area === role;
}
