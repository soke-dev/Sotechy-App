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

- Every merchant has its own token: Xena → **XENA**, Collins → **COLLINS**, Sotechy → **SOTECHY**. In the app they're shown together as the customer's balances **(name confirm: "shares" carries legal risk; "tokens" or "rewards" until a lawyer says otherwise)**.
- **No fixed supply.** Tokens are minted when orders complete.
- **Issue rate:** 1 token per ₦1 by default, adjustable per merchant.
- **Spend only where issued:** XENA only at Xena; SOTECHY only at Sotechy stores.
- **Store value:** each token buys a fixed naira value of goods at its store, set from the reserve (section 6): **₦0.00909 per token** (≈0.91 kobo) at launch. It's a store benefit, not a cash or market price.
- **Usernames:** customers send tokens to **@username**; the username is bound to the wallet, and nobody types 0x addresses. Every transfer shows its status and a **View on Monad explorer** link.
- **Who can hold them:** only registered Sotechy users and Sotechy's own contracts and wallets. The token contract itself rejects transfers to anyone else (an on-chain allowlist), even from a block explorer or another app.

### What a customer earns

| Order | Tokens released when the order completes |
|---|---|
| ₦100M from Sotechy | **100M SOTECHY** |
| ₦100M from Xena | **100M XENA + 10M SOTECHY** (10% cross-store bonus) |
| Review with a photo (delivered items only) | **+10%** of that item's tokens |
| Review without a photo (delivered items only) | **+5%** of that item's tokens |
| Walk-in sale at a merchant's POS | That merchant's token only (no SOTECHY), and only after the merchant pays Sotechy the 2% for that sale |

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
    S->>M: 50% of merchant share (after 2% fee)
    M->>C: Ships, marks delivered
    C->>S: Confirms delivery (or Sotechy confirms after review)
    S->>M: Remaining 50%
    Note over C: 100% of tokens released
  else Merchant declines / no response
    Note over S: Sotechy reviews; refund handled manually
  end
```

- **Fee:** 2% of the order, taken first, split **1% reserve + 1% Sotechy revenue**. Rate and split adjustable in admin.
- **Merchant share:** the other 98%, paid **50% on accept** and **50% on completion** to the payout method the merchant set up (bank account). Merchants don't need a Money Moves account.
- **Timers:**
  - Merchant has **24 hours** to accept. No response: Sotechy reviews manually.
  - After the merchant marks it delivered, the customer confirms. No response: Sotechy reviews and confirms.
- **Merchant can't ship after taking the first 50%:** Sotechy asks the merchant to pay it back and refunds the customer. The customer sees **"Processing"** throughout.
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
- When the order completes, the redeemed tokens split **50% to the recycling pool** and **50% to Sotechy's reserve wallet**, and Sotechy pays the merchant the naira value from the reserve as part of the normal 50/50 payout.
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
| **Allowlist** | Registered users' wallets (added at sign-up) and approved Sotechy contracts. |
| **OrderMinter** | Mints for a completed order, once per order id (no double minting); cross-store SOTECHY bonus; review bonus (from the pool first). |
| **Checkout escrow / Redemption** | Holds tokens used at checkout; on completion splits 50/50 to recycling pool and Sotechy wallet; returns them on cancellation. |
| **RecyclingPool** | Per-token pool; pays bonuses and promotions with existing tokens. |

- **Wallets and gas:** a wallet is created for every customer at sign-up and linked to their @username; customers sign, Sotechy's relayer submits and pays the gas (customers never need MON) **(confirm the wallet provider: Dynamic, as Money Moves uses, or similar)**.
- **Safety for a live mainnet launch:**
  - admin roles on a multisig;
  - narrow pause switches;
  - small daily mint and redemption limits at first;
  - every rule covered by automated tests before deployment;
  - no hidden power to take balances or mint at will.

## 8. Not in the first build

- DEX trading and liquidity pools: later, separately, after the core passes its tests.
- Token cash-out: none. Tokens are store value only.

## 9. Still to confirm

1. **Name in the app:** "shares" vs "tokens" / "rewards" (legal risk; see section 10).
2. **Store value:** ₦0.00909 per token (keeps the 2% fee and funds the full 10% bonus). Alternatively ₦0.01 per token with a 1.1% reserve share.
3. **Wallet provider** for sign-up wallets and gas sponsorship.
4. **How the automatic 50% payouts are sent** (Money Moves payouts if available, otherwise a transfer provider such as Flutterwave).

## 10. Questions for a Nigerian lawyer before launch

- **SEC Nigeria:** are transferable merchant tokens "digital assets" or securities under the 2024 rules? Does calling them "shares" change that?
- **CBN:** does holding customer payments before paying merchants (escrow), and token-plus-naira checkout, need a licence or a licensed partner?
- **FCCPC:** consumer terms for token value, expiry, refunds, disputes and the merchant review timers.
- **NDPA:** storing customer IDs, usernames and merchant KYB documents; wallet data.
- **Tax:** VAT on the 2% fee; accounting for tokens issued and redeemed; merchant withholding.
- **Merchant agreement:** the 2% fee, the 50/50 payout terms and paying back the first 50% when an order isn't shipped.
