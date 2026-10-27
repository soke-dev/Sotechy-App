# Sotechy tokenized marketplace: the final model

Status: agreed model, before design detail and build. Decisions marked **(confirm)** still need a final yes.

Sotechy becomes a multi-merchant marketplace. Every verified merchant has a store page and its own on-chain token on **Monad mainnet**. Customers earn tokens when orders complete and spend them (with or without naira) at the store that issued them. Sotechy collects all payments, takes a 2% fee, pays merchants in two halves, and funds the token reserve.

**The rule above all others:** the blockchain enforces who can hold, send and spend tokens; the backend coordinates real orders and real naira. Tokens never create the money that pays merchants: Sotechy's reserve does.

---

## 1. Who's who

| Party | What they have |
|---|---|
| **Customer** | An account, a unique **@username**, and a **wallet created at sign-up** (Sotechy pays all gas). Sees every token balance in one place. |
| **Merchant** | Business owners and freelancers, verified by Sotechy (onboarding modelled on Money Moves Business). Own storefront, own token, own dashboard and team logins. |
| **Sotechy** | Merchant #1 (the Sotechy store, **SOTECHY** token) and the platform: collects payments, holds the reserve, pays merchants, runs admin. |

## 2. Tokens

- Every merchant has its own token, called by its ticker: **$XENA**, **$COLLINS**, **$SOTECHY**. The app calls them **tokens** and shows all of a customer's balances together.
- **Merchants choose their ticker during onboarding**, with a short explanation of what a store token is (earned by their customers, spent only at their store, not money or an investment). Rules: 3–8 letters/numbers, unique across Sotechy, no reserved or misleading names (SOTECHY, NGN, USD, USDT, MON, …), checked by admin at approval. The token contract can be **renamed** (new name and ticker, same token and balances) with Sotechy admin approval, so a merchant who rebrands keeps their token; the merchant request flow for this comes later.
- **No fixed supply.** Tokens are minted when orders complete.
- **Issue rate:** 1 token per ₦1 by default, adjustable per merchant.
- **Spend only where issued:** XENA only at Xena; SOTECHY only at Sotechy stores.
- **Store value:** each token buys a fixed naira value of goods at its store, set from the reserve (section 6): **₦0.00909 per token** (≈0.91 kobo) at launch. It's a store benefit, not a cash or market price.
- **Sending:** customers send to another user's **@username** or to their **Sotechy wallet address** (the one Sotechy created for them; each username is bound to one wallet). Every transfer shows its status and a **View on Monad explorer** link.
- **No outside wallets:** sending to any wallet Sotechy didn't create is impossible. The app checks first, and the token contract itself rejects it (an on-chain allowlist of Sotechy-created wallets and Sotechy contracts), even if someone tries from a block explorer or another app.

### What a customer earns

| Order | Tokens released when the order completes |
|---|---|
| ₦100M from Sotechy | **100M SOTECHY** |
| ₦100M from Xena | **100M XENA + 10M SOTECHY** (10% cross-store bonus) |
| Review with a photo (delivered items only) | **+10%** of that item's tokens |
| Review without a photo (delivered items only) | **+5%** of that item's tokens |
| Walk-in sale at a merchant's POS | That merchant's tokens + **10% SOTECHY**, only after the merchant pays 1% of that sale, all of which goes to the reserve that backs the tokens. The customer needs a Sotechy account; the cashier finds them by @username or phone. |

Tokens show as **pending** from checkout and are released **100%** when the order completes. Cancelled or refunded orders never release tokens.

## 3. Order and money flow

```mermaid
sequenceDiagram
  participant C as Customer
  participant S as Sotechy
  participant M as Merchant
  C->>S: Pays (naira via Money Moves, tokens, or both)
  Note over C: Tokens earned: pending
  S->>M: New order (dashboard + email)
  alt Merchant accepts within 24h
    S->>M: First payment (plan's share + delivery fee)
    M->>C: Ships, marks delivered
    C->>S: Confirms delivery (or Sotechy confirms after review)
    S->>M: Last payment (the rest)
    Note over C: 100% of tokens released
  else Merchant declines / no response
    Note over S: Sotechy reviews; refund handled manually
  end
```

- **Fee:** 2% of the order, taken first, split **1% reserve + 1% Sotechy revenue**. Rate and split adjustable in admin.
- **Merchant share:** the other 98%, paid in two payments to the merchant's bank account: a **first payment on accept** and the **last payment on completion**. Merchants don't need a Money Moves account.
- **Payout plans (set in admin):** one plan for everyone (default **50% first**) plus a plan per merchant where needed, e.g. **90% first** for a trusted store or **10% first** for a new one. Each plan also says **how the 2% fee is collected**: spread over both payments (default), all from the first payment, or all from the last payment (held back until delivery). Admin warns when a payment would be too small to carry the fee. Changes apply to orders placed after saving.
- **Timers:**
  - Merchant has **24 hours** to accept. No response: Sotechy reviews manually.
  - After the merchant marks it delivered, the customer confirms. No response: Sotechy reviews and confirms.
- **Merchant can't ship after taking the first payment:** Sotechy asks the merchant to pay it back and refunds the customer. The customer sees **"Processing"** throughout.
- **No returns after the customer confirms delivery**, so released tokens are never clawed back.

Worked example, ₦100,000 order from Xena:

| | ₦ |
|---|---|
| Customer pays | 100,000 |
| Fee (2%): reserve | 1,000 |
| Fee (2%): Sotechy revenue | 1,000 |
| Merchant: on accept | 49,000 |
| Merchant: on completion | 49,000 |
| Customer earns | 100,000 XENA + 10,000 SOTECHY (pending until completion) |

## 4. Paying with tokens (and mixing with naira)

- At checkout the customer can use the store's tokens for part or all of the order and pay the rest in naira: Xena with XENA + naira, Sotechy with SOTECHY + naira.
- Tokens are held in escrow (on-chain) until the order completes; if it's cancelled they go back to the customer.
- When the order completes, the redeemed tokens split **50% to the recycling pool** and **50% to Sotechy's reserve wallet**, and Sotechy pays the merchant the naira value from the reserve as part of the normal two payments.
- **Recycling pool:** existing tokens reused for review bonuses and promotions before anything new is minted.
- **Sotechy reserve wallet:** controlled by Sotechy (not locked). Re-using those tokens creates new store obligations, so they're only re-issued against funding (for example, a promotion paid from revenue).

## 5. Merchants

- **Onboarding (from Money Moves Business):**
  1. Sign up with email + code, optional Google and authenticator app.
  2. Choose individual or registered business (BN, LTD, PLC, IT).
  3. Enter business details and upload documents (stored encrypted).
  4. ID + selfie check.
  5. Add directors and owners.
  6. Describe the business.
  7. Add a payout bank (name must match).
  8. Submit for review.

  Admin then approves, rejects or asks for changes with a note.
- **Selling:** merchants upload goods to their storefront from the dashboard: photos, price, options (size, colour, storage), stock, description, key features, what's in the box and specs, the same product page customers already see. Their products also appear in Shop and search; admin can hide listings that break the rules.
- **Delivery areas:** merchants save delivery areas once (a state, optionally just some cities, with a delivery time and free-over amount) and tick which areas each product ships to, adding a new area from the product form if needed. Each area has **two prices the merchant sets: home delivery and pickup** (a cheaper collection point in that area, such as a park, courier office or their shop); the customer picks one at checkout. **Every new area, and any change to an area's state or cities, waits for Sotechy's approval** so we can confirm the merchant really delivers there; price and time changes go live straight away. Merchants can also offer free pickup at their own shop for anyone. Big items can be pickup-only. Customers only see approved areas that cover their address.
- **Negotiable prices:** a merchant can mark a product negotiable, with an optional private lowest price (offers below it are flagged) and a default hold time. A customer makes an offer from the product, which opens a conversation between that customer and the store about that product. The store can accept, counter, decline or just reply. When a price is agreed, only that customer can buy that product at it, for the window the store picked: **6, 12 or 24 hours, never more than 24**. After that it goes back to the normal price. Every offer, counter and agreement is sent to the other side in the app, on WhatsApp and by email. Tokens are earned on the price actually paid.
- **Featured stores (paid):** a merchant can pay to be featured, **₦2,000 a month** to start, one month at a time for now from the merchant dashboard through Money Moves. Featured stores are shown first on the app's Home (stores row and store product rows), lead the Shop grid and the Stores tab, and carry a ★ Featured label. Admin sets the monthly price and how many stores can be featured at once, and can end a feature early. Fees from features are Sotechy revenue.
- **Notifications:** merchants always get new orders by email (it can't be switched off, because of the 24-hour accept window), and can also get them by SMS and on WhatsApp from Sotechy's official WhatsApp Business number, with a link to accept. Customers get every order update (accepted, shipped or ready for pickup, delivered) on WhatsApp and by email. A decline or payback is not sent: the customer keeps seeing "Processing" while Sotechy sorts it out. The **2% fee is on goods only**, and the **delivery fee is paid to the merchant in full with the first payment**.
- **Test mode before approval;** live selling and payouts only once verified. Daily payout limits for new merchants.
- **Team:** owner invites staff with roles (owner, admin, orders, catalogue, finance, viewer).
- **Dashboard** in the customer app's look (cream, Sotechy orange, illustrated icons):
  - new-order queue with Accept / Decline, plus email alerts;
  - orders and delivery;
  - products and stock;
  - storefront;
  - payouts (both halves per order);
  - token page: minted, holders, redemptions, pools, reserve;
  - reviews, team, settings.

## 6. The reserve (funded for the maximum, every time)

Each order's 1% reserve contribution is sized to cover **every** token that order can ever create at its store: the base tokens **plus the full 10% review bonus**, whether or not the customer reviews.

```
store value per token = reserve share ÷ (1 + max review bonus) = 1% ÷ 1.10 = ₦0.00909
```

- **Cross-store SOTECHY bonus** (10% on other stores) is funded by Sotechy from its 1% revenue: about 0.1% of each such sale, leaving ≈0.9% net revenue.
- **Review bonuses come from the recycling pool first.** When the pool pays a bonus, the bonus funding already in the reserve isn't used, so it covers recycled tokens being spent again.

Per ₦100M of Xena sales:

| | Amount |
|---|---|
| Reserve (1%) | ₦1,000,000 |
| Sotechy revenue (1%) | ₦1,000,000, minus ≈₦100,000 to fund 10M SOTECHY bonus |
| XENA created (max) | 100M + 10M bonus = 110M, worth ₦1,000,000 at store value |
| If 60% is spent | 66M XENA spent → ₦600,000 paid to Xena from the reserve; 33M to recycling, 33M to Sotechy's wallet |

Sotechy manages the reserve directly (no automatic pausing). Admin dashboards show, per token: reserve balance, outstanding store value of tokens in circulation, and alerts when the outstanding value approaches the reserve.

## 7. On-chain design (Monad mainnet)

| Contract | Job |
|---|---|
| **TokenFactory / Registry** | Deploys one token per approved merchant; the official list of Sotechy tokens. |
| **MerchantToken** (ERC-20) | Balances and transfers; rejects any sender or receiver not on the allowlist. No arbitrary minting. |
| **WalletFactory** | Creates each customer's Sotechy Wallet; the record of which addresses are Sotechy wallets. |
| **Allowlist** | Only Sotechy wallets (from the factory) and approved Sotechy contracts. Transfers to anything else are rejected. |
| **OrderMinter** | Mints for a completed order, once per order id (no double minting); cross-store SOTECHY bonus; review bonus (from the pool first). |
| **Checkout escrow / Redemption** | Holds tokens used at checkout; on completion splits 50/50 to recycling pool and Sotechy wallet; returns them on cancellation. |
| **RecyclingPool** | Per-token pool; pays bonuses and promotions with existing tokens. |

- **Wallets, our own contract (no outside provider):** at sign-up Sotechy creates a **Sotechy Wallet** for each customer: a small smart-contract account made by Sotechy's **WalletFactory**, linked to their @username. Its address is known at sign-up and the contract is only deployed on first use, so idle accounts cost no gas.
  - The wallet only does what the customer asks in the app (send, pay at checkout): being signed in is enough (no PIN or fingerprint; the app shows a normal confirm screen), Sotechy's server authorises the action for the signed-in customer, and Sotechy's relayer sends it and **pays the gas** (customers never need MON).
  - Because every wallet comes from the factory, the token allowlist is simply "was this wallet made by Sotechy's factory?", which also makes outside wallets impossible to send to.
  - In practice Sotechy holds the keys for customers (custodial), which is part of the legal review. Self-custody (customer passkeys) can be added to the same wallet later.
- **Safety for a live mainnet launch:**
  - a single Sotechy admin key (no multisig, by choice), kept in a hardware wallet or a cloud key vault, never on a laptop or in code; separate keys for day-to-day jobs (the minting relayer) so the admin key is rarely used;
  - narrow pause switches;
  - small daily mint and redemption limits at first;
  - every rule covered by automated tests before deployment;
  - no hidden power to take balances or mint at will.

## 8. Not in the first build

- Merchant-requested ticker changes (the contract supports renaming from day one; the dashboard flow comes later).
- DEX trading and liquidity pools: later, separately, after the core passes its tests.
- Token cash-out: none. Tokens are store value only.

## 9. Decided

- Called **tokens**, shown by ticker ($XENA); merchants choose the ticker at onboarding.
- **2% fee** kept, so store value is **₦0.00909 per token**.
- **Own wallet contract** (WalletFactory), no wallet provider; Sotechy pays gas.
- **Automatic payouts** to the merchant's bank account for both payments. Sent through Money Moves (Sotechy's own provider) once it offers a payouts API; a bank-transfer provider such as Flutterwave is the fallback.

## 10. Questions for a Nigerian lawyer before launch

- **SEC Nigeria:** are transferable merchant tokens "digital assets" or securities under the 2024 rules? Does the ticker naming ($XENA) or the custodial Sotechy Wallet change that?
- **CBN:** does holding customer payments before paying merchants (escrow), and token-plus-naira checkout, need a licence or a licensed partner?
- **FCCPC:** consumer terms for token value, expiry, refunds, disputes and the merchant review timers.
- **NDPA:** storing customer IDs, usernames and merchant KYB documents; wallet data.
- **Tax:** VAT on the 2% fee; accounting for tokens issued and redeemed; merchant withholding.
- **Merchant agreement:** the 2% fee, the payout plan (and that Sotechy can change it) and paying back the first payment when an order isn't shipped.
