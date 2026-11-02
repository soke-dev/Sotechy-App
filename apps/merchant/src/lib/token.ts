// A store's token is named by its ticker only once Sotechy has approved the store and created the token.
// Until then the dashboard talks about "your store token".

/** "$SOTECHY" once the token is approved; null before */
export const tokenTicker = (store: { ticker: string; tokenApprovedAt?: string | null }) => (store.tokenApprovedAt ? `$${store.ticker}` : null);
