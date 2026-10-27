// Price offers: the customer negotiates a product with its store in a conversation. If they agree,
// only this customer can buy at that price, for the 6, 12 or 24 hours the store chose.
// Kept in memory with sample conversations; the store's replies are simulated until the backend exists.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useToast } from "@/components/toast";
import { findProduct, storeBySlug } from "./marketplace";

export type OfferStatus = "waiting_store" | "countered" | "agreed" | "declined" | "expired";

export interface OfferMessage {
  id: string;
  from: "me" | "store";
  kind: "text" | "offer" | "counter" | "accepted" | "declined";
  text?: string;
  amount?: number;
  hours?: number;
  at: number;
}

export interface OfferThread {
  id: string;
  store: string;
  productId: string;
  status: OfferStatus;
  messages: OfferMessage[];
  agreedPrice?: number;
  expiresAt?: number;
}

const mins = (n: number) => Date.now() - n * 60_000;

const SEED: OfferThread[] = [
  {
    id: "o1",
    store: "xena",
    productId: "x1",
    status: "waiting_store",
    messages: [
      { id: "1", from: "me", kind: "text", text: "Good afternoon. Is the black one still available?", at: mins(42) },
      { id: "2", from: "store", kind: "text", text: "Yes, we have 8 in stock.", at: mins(38) },
      { id: "3", from: "me", kind: "offer", amount: 220_000, text: "Can you do 220k? I'll pick it up today.", at: mins(20) },
    ],
  },
  {
    id: "o2",
    store: "brighthome",
    productId: "b1",
    status: "agreed",
    agreedPrice: 365_000,
    expiresAt: Date.now() + 9 * 3_600_000,
    messages: [
      { id: "1", from: "me", kind: "offer", amount: 350_000, at: mins(200) },
      { id: "2", from: "store", kind: "counter", amount: 365_000, hours: 12, text: "Best we can do, with free delivery in Enugu.", at: mins(185) },
      { id: "3", from: "me", kind: "accepted", amount: 365_000, hours: 12, at: mins(180) },
    ],
  },
];

interface OffersState {
  threads: OfferThread[];
  byId: (id: string) => OfferThread | undefined;
  forProduct: (store: string, productId: string) => OfferThread | undefined;
  /** Starts a conversation with an offer; returns its id */
  makeOffer: (store: string, productId: string, amount: number, text?: string) => string;
  counter: (id: string, amount: number, text?: string) => void;
  acceptCounter: (id: string) => void;
  decline: (id: string) => void;
  message: (id: string, text: string) => void;
}

const Ctx = createContext<OffersState | null>(null);
export const useOffers = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("OffersProvider missing");
  return v;
};

/** Live status: an agreed price whose time ran out is expired */
export const statusOf = (t: OfferThread): OfferStatus => (t.status === "agreed" && t.expiresAt && t.expiresAt < Date.now() ? "expired" : t.status);

export function OffersProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<OfferThread[]>(SEED);
  const toast = useToast();

  const update = useCallback((id: string, fn: (t: OfferThread) => OfferThread) => setThreads((all) => all.map((t) => (t.id === id ? fn(t) : t))), []);
  const push = (t: OfferThread, m: Omit<OfferMessage, "id" | "at">, patch: Partial<OfferThread> = {}): OfferThread => ({
    ...t,
    ...patch,
    messages: [...t.messages, { ...m, id: `${Date.now()}-${Math.random()}`, at: Date.now() }],
  });

  // Until stores answer for real: the store meets the customer halfway, holding the price for the product's window
  const simulateReply = useCallback(
    (id: string, store: string, productId: string, amount: number) => {
      const product = findProduct(store, productId);
      const name = storeBySlug(store)?.name ?? "The store";
      if (!product) return;
      setTimeout(() => {
        const counterPrice = Math.max(amount, Math.round((amount + product.price) / 2 / 500) * 500);
        update(id, (t) => push(t, { from: "store", kind: "counter", amount: counterPrice, hours: 24, text: "This is the best we can do." }, { status: "countered" }));
        toast(`${name} replied to your offer`);
      }, 2500);
    },
    [update, toast],
  );

  const value: OffersState = {
    threads,
    byId: (id) => threads.find((t) => t.id === id),
    forProduct: (store, productId) => threads.find((t) => t.store === store && t.productId === productId && statusOf(t) !== "declined" && statusOf(t) !== "expired"),
    makeOffer: (store, productId, amount, text) => {
      const id = `o${Date.now()}`;
      setThreads((all) => [{ id, store, productId, status: "waiting_store", messages: [{ id: "1", from: "me", kind: "offer", amount, text, at: Date.now() }] }, ...all]);
      simulateReply(id, store, productId, amount);
      return id;
    },
    counter: (id, amount, text) => {
      const t = threads.find((x) => x.id === id);
      update(id, (x) => push(x, { from: "me", kind: "offer", amount, text }, { status: "waiting_store" }));
      if (t) simulateReply(id, t.store, t.productId, amount);
    },
    acceptCounter: (id) =>
      update(id, (t) => {
        const last = [...t.messages].reverse().find((m) => m.kind === "counter");
        const hours = last?.hours ?? 12;
        return push(t, { from: "me", kind: "accepted", amount: last?.amount, hours }, { status: "agreed", agreedPrice: last?.amount, expiresAt: Date.now() + hours * 3_600_000 });
      }),
    decline: (id) => update(id, (t) => push(t, { from: "me", kind: "declined" }, { status: "declined" })),
    message: (id, text) => update(id, (t) => push(t, { from: "me", kind: "text", text })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
