// Matching an address to a marketplace store's delivery areas. The API charges with this and the app
// shows the same fee before checkout.
import type { StoreDeliveryArea } from "./types";

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** "FCT Abuja", "Abuja" and "Federal Capital Territory" are one state; "Edo State" is "Edo" */
export function sameState(a: string, b: string) {
  const key = (s: string) => {
    const n = letters(s).replace(/state$/, "");
    return /abuja|fct|federalcapitalterritory/.test(n) ? "abuja" : n;
  };
  return key(a) === key(b);
}

/** An area name matches a city when either contains the other ("Benin" and "Benin City") */
function sameCity(area: string, city: string) {
  const [a, c] = [letters(area), letters(city)];
  return !!a && !!c && (a.includes(c) || c.includes(a));
}

/** The area that delivers to an address: one naming the city beats a whole-state one, then the cheapest */
export function deliveryAreaFor<T extends StoreDeliveryArea>(areas: T[], state: string, city: string): T | null {
  const inState = areas.filter((a) => sameState(a.state, state));
  const byCity = inState.filter((a) => a.areas.some((x) => sameCity(x, city)));
  const wholeState = inState.filter((a) => a.areas.length === 0);
  return [...byCity, ...wholeState].sort((a, b) => a.homeFee - b.homeFee)[0] ?? null;
}

/** Door delivery fee in an area, free above its threshold */
export const areaDeliveryFee = (area: StoreDeliveryArea, subtotal: number) => (area.freeOver != null && subtotal >= area.freeOver ? 0 : area.homeFee);
