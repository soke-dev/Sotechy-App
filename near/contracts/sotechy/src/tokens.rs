//! Store tokens (NEP-245). Every change carries the order it belongs to (`memo`), mints are capped per operation and
//! per day, and batched changes carry the API's queue number (`seq`): anything at or below the last one applied is
//! skipped, so a batch sent again after a lost reply can't mint twice.
use crate::{emit, json_str, Contract, ContractExt};
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId};

const DAY_NS: u64 = 86_400 * 1_000_000_000;
const NEP245: &str = "nep245";
const NEP245_VERSION: &str = "1.0.0";
const NOT_TRADEABLE: &str = "Sotechy store tokens can't be transferred: spend them at the store that issued them";

#[near(serializers = [json])]
#[derive(Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum OpKind {
    Mint,
    Burn,
    Move,
}

/// One change to balances, as the API batches them
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct Op {
    pub kind: OpKind,
    pub token_id: String,
    pub from: Option<AccountId>,
    pub to: Option<AccountId>,
    pub amount: U128,
    /// The order or review this change belongs to, e.g. "SO-1024"
    pub memo: String,
    /// The API's queue number for this change; batches send them in rising order
    pub seq: u64,
}

/// NEP-245 token view: fungible store tokens have no single owner
#[near(serializers = [json])]
pub struct Token {
    pub token_id: String,
    pub owner_id: Option<AccountId>,
}

#[near(serializers = [json])]
pub struct ContractMetadata {
    pub spec: String,
    pub name: String,
}

#[near(serializers = [json])]
pub struct StoreToken {
    pub token_id: String,
    pub ticker: String,
    pub supply: U128,
}

#[near(serializers = [json])]
pub struct Limits {
    pub max_mint_per_op: U128,
    pub max_mint_per_day: U128,
    pub minted_today: U128,
}

#[near]
impl Contract {
    // Operator: the API

    /// A new store's token, e.g. ("2", "YOURSTORE")
    pub fn register_token(&mut self, token_id: String, ticker: String) {
        self.only_operator();
        require!(!self.tickers.contains_key(&token_id), "That token id is taken");
        require!(!ticker.is_empty() && ticker.len() <= 16, "A ticker is 1 to 16 characters");
        self.tickers.insert(token_id.clone(), ticker.clone());
        self.supply.insert(token_id.clone(), 0);
        self.token_count += 1;
        env::log_str(&format!("Registered token {token_id} as ${ticker}"));
    }

    /// Applies several changes in one transaction (the API batches what's waiting). Changes at or below the last
    /// queue number applied are already here, so they're skipped.
    pub fn apply_ops(&mut self, ops: Vec<Op>) {
        self.only_operator();
        for op in ops {
            if op.seq <= self.last_seq {
                env::log_str(&format!("Skipped change {}: already applied", op.seq));
                continue;
            }
            self.last_seq = op.seq;
            self.apply(op);
        }
    }

    pub fn mint(&mut self, token_id: String, to: AccountId, amount: U128, memo: String) {
        self.only_operator();
        self.apply(Op { kind: OpKind::Mint, token_id, from: None, to: Some(to), amount, memo, seq: 0 });
    }

    pub fn burn(&mut self, token_id: String, from: AccountId, amount: U128, memo: String) {
        self.only_operator();
        self.apply(Op { kind: OpKind::Burn, token_id, from: Some(from), to: None, amount, memo, seq: 0 });
    }

    /// Moves tokens between accounts, e.g. tokens spent at a store back to its pool
    pub fn move_tokens(&mut self, token_id: String, from: AccountId, to: AccountId, amount: U128, memo: String) {
        self.only_operator();
        self.apply(Op { kind: OpKind::Move, token_id, from: Some(from), to: Some(to), amount, memo, seq: 0 });
    }

    // NEP-245 views

    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128 {
        U128(self.balance(&token_id, &account_id))
    }

    pub fn mt_batch_balance_of(&self, account_id: AccountId, token_ids: Vec<String>) -> Vec<U128> {
        token_ids.iter().map(|id| U128(self.balance(id, &account_id))).collect()
    }

    pub fn mt_supply(&self, token_id: String) -> Option<U128> {
        self.supply.get(&token_id).map(|s| U128(*s))
    }

    pub fn mt_batch_supply(&self, token_ids: Vec<String>) -> Vec<Option<U128>> {
        token_ids.iter().map(|id| self.supply.get(id).map(|s| U128(*s))).collect()
    }

    pub fn mt_token(&self, token_ids: Vec<String>) -> Vec<Option<Token>> {
        token_ids
            .into_iter()
            .map(|id| self.tickers.contains_key(&id).then(|| Token { token_id: id, owner_id: None }))
            .collect()
    }

    pub fn mt_metadata_contract(&self) -> ContractMetadata {
        ContractMetadata { spec: "mt-1.0.0".into(), name: "Sotechy store tokens".into() }
    }

    // NEP-245 transfers: store tokens can't be traded

    #[payable]
    pub fn mt_transfer(&mut self, receiver_id: AccountId, token_id: String, amount: U128, approval: Option<(AccountId, u64)>, memo: Option<String>) {
        let _ = (receiver_id, token_id, amount, approval, memo);
        env::panic_str(NOT_TRADEABLE);
    }

    #[payable]
    pub fn mt_batch_transfer(&mut self, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>, approvals: Option<Vec<Option<(AccountId, u64)>>>, memo: Option<String>) {
        let _ = (receiver_id, token_ids, amounts, approvals, memo);
        env::panic_str(NOT_TRADEABLE);
    }

    #[payable]
    pub fn mt_transfer_call(&mut self, receiver_id: AccountId, token_id: String, amount: U128, approval: Option<(AccountId, u64)>, memo: Option<String>, msg: String) {
        let _ = (receiver_id, token_id, amount, approval, memo, msg);
        env::panic_str(NOT_TRADEABLE);
    }

    #[payable]
    pub fn mt_batch_transfer_call(&mut self, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>, approvals: Option<Vec<Option<(AccountId, u64)>>>, memo: Option<String>, msg: String) {
        let _ = (receiver_id, token_ids, amounts, approvals, memo, msg);
        env::panic_str(NOT_TRADEABLE);
    }

    // Sotechy views

    pub fn store_token(&self, token_id: String) -> Option<StoreToken> {
        let ticker = self.tickers.get(&token_id)?.clone();
        let supply = U128(*self.supply.get(&token_id).unwrap_or(&0));
        Some(StoreToken { token_id, ticker, supply })
    }

    pub fn limits(&self) -> Limits {
        let today = env::block_timestamp() / DAY_NS;
        let minted_today = if today == self.mint_day { self.minted_today } else { 0 };
        Limits { max_mint_per_op: U128(self.max_mint_per_op), max_mint_per_day: U128(self.max_mint_per_day), minted_today: U128(minted_today) }
    }

    pub fn token_count(&self) -> u64 {
        self.token_count
    }

    pub fn last_seq(&self) -> u64 {
        self.last_seq
    }
}

impl Contract {
    fn balance(&self, token_id: &str, account: &AccountId) -> u128 {
        *self.balances.get(&(token_id.to_string(), account.clone())).unwrap_or(&0)
    }

    fn set_balance(&mut self, token_id: &str, account: &AccountId, amount: u128) {
        let key = (token_id.to_string(), account.clone());
        if amount == 0 {
            self.balances.remove(&key);
        } else {
            self.balances.insert(key, amount);
        }
    }

    fn take(&mut self, token_id: &str, from: &AccountId, amount: u128) {
        let has = self.balance(token_id, from);
        require!(has >= amount, format!("{from} has {has} of token {token_id}, not {amount}"));
        self.set_balance(token_id, from, has - amount);
    }

    fn apply(&mut self, op: Op) {
        require!(self.tickers.contains_key(&op.token_id), format!("Unknown token {}", op.token_id));
        let amount = op.amount.0;
        require!(amount > 0, "Amount must be more than 0");
        match op.kind {
            OpKind::Mint => {
                let to = op.to.expect("A mint needs `to`");
                require!(amount <= self.max_mint_per_op, format!("{amount} is over the per-mint limit of {}", self.max_mint_per_op));
                let today = env::block_timestamp() / DAY_NS;
                if today != self.mint_day {
                    self.mint_day = today;
                    self.minted_today = 0;
                }
                let would_be = self.minted_today + amount;
                require!(would_be <= self.max_mint_per_day, format!("{would_be} today is over the daily limit of {}", self.max_mint_per_day));
                self.minted_today = would_be;
                let balance = self.balance(&op.token_id, &to);
                self.set_balance(&op.token_id, &to, balance + amount);
                let supply = *self.supply.get(&op.token_id).unwrap_or(&0);
                self.supply.insert(op.token_id.clone(), supply + amount);
                emit(NEP245, NEP245_VERSION, "mt_mint", format!(r#"{{"owner_id":"{to}","token_ids":["{}"],"amounts":["{amount}"],"memo":{}}}"#, op.token_id, json_str(&op.memo)));
            }
            OpKind::Burn => {
                let from = op.from.expect("A burn needs `from`");
                self.take(&op.token_id, &from, amount);
                let supply = *self.supply.get(&op.token_id).unwrap_or(&0);
                self.supply.insert(op.token_id.clone(), supply - amount);
                emit(NEP245, NEP245_VERSION, "mt_burn", format!(r#"{{"owner_id":"{from}","token_ids":["{}"],"amounts":["{amount}"],"memo":{}}}"#, op.token_id, json_str(&op.memo)));
            }
            OpKind::Move => {
                let from = op.from.expect("A move needs `from`");
                let to = op.to.expect("A move needs `to`");
                self.take(&op.token_id, &from, amount);
                let balance = self.balance(&op.token_id, &to);
                self.set_balance(&op.token_id, &to, balance + amount);
                emit(NEP245, NEP245_VERSION, "mt_transfer", format!(r#"{{"old_owner_id":"{from}","new_owner_id":"{to}","token_ids":["{}"],"amounts":["{amount}"],"memo":{}}}"#, op.token_id, json_str(&op.memo)));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{acc, as_caller, setup};
    use near_sdk::test_utils::get_logs;

    #[test]
    fn mints_moves_and_burns_with_events() {
        let mut c = setup();
        c.mint("2".into(), acc("ada.near"), U128(572_000), "SO-1024".into());
        assert_eq!(c.mt_balance_of(acc("ada.near"), "2".into()).0, 572_000);
        assert_eq!(c.mt_supply("2".into()).unwrap().0, 572_000);
        assert!(get_logs().iter().any(|l| l.contains(r#""event":"mt_mint""#) && l.contains("SO-1024")));

        c.move_tokens("2".into(), acc("ada.near"), acc("pool.near"), U128(10_000), "SO-1031".into());
        c.burn("2".into(), acc("ada.near"), U128(2_000), "SO-1032".into());
        assert_eq!(c.mt_balance_of(acc("ada.near"), "2".into()).0, 560_000);
        assert_eq!(c.mt_balance_of(acc("pool.near"), "2".into()).0, 10_000);
        assert_eq!(c.mt_supply("2".into()).unwrap().0, 570_000);
    }

    #[test]
    fn batches_ops() {
        let mut c = setup();
        c.apply_ops(vec![
            Op { kind: OpKind::Mint, token_id: "1".into(), from: None, to: Some(acc("ada.near")), amount: U128(100), memo: "SO-1".into(), seq: 1 },
            Op { kind: OpKind::Mint, token_id: "2".into(), from: None, to: Some(acc("ada.near")), amount: U128(50), memo: "SO-1".into(), seq: 2 },
        ]);
        assert_eq!(c.mt_batch_balance_of(acc("ada.near"), vec!["1".into(), "2".into()]).iter().map(|b| b.0).collect::<Vec<_>>(), vec![100, 50]);
    }

    #[test]
    fn a_resent_batch_doesnt_mint_twice() {
        let mut c = setup();
        let batch = || vec![Op { kind: OpKind::Mint, token_id: "2".into(), from: None, to: Some(acc("ada.near")), amount: U128(25_000), memo: "SO-7".into(), seq: 7 }];
        c.apply_ops(batch());
        c.apply_ops(batch());
        assert_eq!(c.mt_balance_of(acc("ada.near"), "2".into()).0, 25_000);
        assert_eq!(c.last_seq(), 7);
    }

    #[test]
    #[should_panic(expected = "per-mint limit")]
    fn caps_each_mint() {
        let mut c = setup();
        c.mint("1".into(), acc("ada.near"), U128(1_000_001), "SO-1".into());
    }

    #[test]
    #[should_panic(expected = "daily limit")]
    fn caps_each_day() {
        let mut c = setup();
        c.mint("1".into(), acc("ada.near"), U128(1_000_000), "SO-1".into());
        c.mint("1".into(), acc("bo.near"), U128(1_000_000), "SO-2".into());
        c.mint("1".into(), acc("cy.near"), U128(1), "SO-3".into());
    }

    #[test]
    #[should_panic(expected = "Only Sotechy's operator")]
    fn only_the_operator_mints() {
        let mut c = setup();
        as_caller("ada.near");
        c.mint("1".into(), acc("ada.near"), U128(5), "SO-1".into());
    }

    #[test]
    #[should_panic(expected = "can't be transferred")]
    fn nobody_can_trade() {
        let mut c = setup();
        c.mint("2".into(), acc("ada.near"), U128(5), "SO-1".into());
        as_caller("ada.near");
        c.mt_transfer(acc("bo.near"), "2".into(), U128(5), None, None);
    }

    #[test]
    #[should_panic(expected = "Paused")]
    fn owner_can_pause() {
        let mut c = setup();
        as_caller("owner.near");
        c.set_paused(true);
        as_caller("api.near");
        c.mint("1".into(), acc("ada.near"), U128(5), "SO-1".into());
    }

    #[test]
    #[should_panic(expected = "has 5 of token 2, not 6")]
    fn cant_spend_more_than_held() {
        let mut c = setup();
        c.mint("2".into(), acc("ada.near"), U128(5), "SO-1".into());
        c.burn("2".into(), acc("ada.near"), U128(6), "SO-2".into());
    }
}
