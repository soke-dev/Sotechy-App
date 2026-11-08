//! Sotechy on NEAR, in one contract:
//! - Store tokens (`tokens.rs`, NEP-245): every store's reward token, one token id per store ("1" is $SOTECHY).
//!   Customers earn a store's token on every delivered order and can spend it only at that store, so only the
//!   operator (Sotechy's API) mints, burns or moves tokens, and nobody can trade them.
//! - Receipts (`receipts.rs`, NEP-171): a soulbound NFT for every order, issued when it's paid, whose status and
//!   picture move with the order (paid → shipped → delivered, or refunded).
//! One owner sets the rules (operators, mint limits, pause); one operator writes. If the operator key ever leaks,
//! the owner pauses the contract and swaps the operator, and the mint limits cap what it could do before then.
use near_sdk::store::{IterableSet, LookupMap, Vector};
use near_sdk::{env, near, require, AccountId, BorshStorageKey, PanicOnDefault};

mod receipts;
mod tokens;

pub use receipts::{ContractMetadata as NftContractMetadata, Issue, Receipt, Status, Token as NftToken, TokenMetadata};
pub use tokens::{ContractMetadata as MtContractMetadata, Limits, Op, OpKind, StoreToken, Token as MtToken};

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum Key {
    Operators,
    Tickers,
    Supply,
    Balances,
    Receipts,
    ByOrder,
    ByOwner,
    All,
    OwnerSet { owner_hash: Vec<u8> },
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    owner: AccountId,
    pending_owner: Option<AccountId>,
    operators: IterableSet<AccountId>,
    paused: bool,
    retired: bool,
    // Store tokens
    max_mint_per_op: u128,
    max_mint_per_day: u128,
    minted_today: u128,
    mint_day: u64,
    tickers: LookupMap<String, String>,
    supply: LookupMap<String, u128>,
    balances: LookupMap<(String, AccountId), u128>,
    token_count: u64,
    /// The highest queue number applied through apply_ops
    last_seq: u64,
    // Receipts
    receipts: LookupMap<String, Receipt>,
    by_order: LookupMap<String, String>,
    by_owner: LookupMap<AccountId, IterableSet<String>>,
    /// Every receipt id in issue order, for NEP-181 enumeration
    all: Vector<String>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner: AccountId, operator: AccountId, max_mint_per_op: near_sdk::json_types::U128, max_mint_per_day: near_sdk::json_types::U128) -> Self {
        let mut operators = IterableSet::new(Key::Operators);
        operators.insert(operator);
        Self {
            owner,
            pending_owner: None,
            operators,
            paused: false,
            retired: false,
            max_mint_per_op: max_mint_per_op.0,
            max_mint_per_day: max_mint_per_day.0,
            minted_today: 0,
            mint_day: 0,
            tickers: LookupMap::new(Key::Tickers),
            supply: LookupMap::new(Key::Supply),
            balances: LookupMap::new(Key::Balances),
            token_count: 0,
            last_seq: 0,
            receipts: LookupMap::new(Key::Receipts),
            by_order: LookupMap::new(Key::ByOrder),
            by_owner: LookupMap::new(Key::ByOwner),
            all: Vector::new(Key::All),
        }
    }

    // ---------------------------------------------------------------------------------------------------------
    // Owner: the rules
    // ---------------------------------------------------------------------------------------------------------

    pub fn set_operator(&mut self, operator: AccountId, allowed: bool) {
        self.only_owner();
        if allowed {
            self.operators.insert(operator);
        } else {
            self.operators.remove(&operator);
        }
    }

    pub fn set_limits(&mut self, max_mint_per_op: near_sdk::json_types::U128, max_mint_per_day: near_sdk::json_types::U128) {
        self.only_owner();
        self.max_mint_per_op = max_mint_per_op.0;
        self.max_mint_per_day = max_mint_per_day.0;
    }

    pub fn set_paused(&mut self, paused: bool) {
        self.only_owner();
        require!(!self.retired, "This contract is retired");
        self.paused = paused;
    }

    /// For good, when moving to a new contract
    pub fn retire(&mut self) {
        self.only_owner();
        self.retired = true;
        self.paused = true;
    }

    pub fn transfer_ownership(&mut self, to: AccountId) {
        self.only_owner();
        self.pending_owner = Some(to);
    }

    pub fn accept_ownership(&mut self) {
        let caller = env::predecessor_account_id();
        require!(self.pending_owner.as_ref() == Some(&caller), "Only the new owner can accept");
        self.owner = caller;
        self.pending_owner = None;
    }

    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn is_operator(&self, account_id: AccountId) -> bool {
        self.operators.contains(&account_id)
    }

    pub fn is_paused(&self) -> bool {
        self.paused
    }
}

impl Contract {
    fn only_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "Only the owner can do this");
    }

    fn only_operator(&self) {
        require!(!self.paused, "Paused");
        require!(self.operators.contains(&env::predecessor_account_id()), "Only Sotechy's operator can do this");
    }
}

/// A NEP-297 event log, as explorers and indexers read them
fn emit(standard: &str, version: &str, event: &str, data: String) {
    env::log_str(&format!(r#"EVENT_JSON:{{"standard":"{standard}","version":"{version}","event":"{event}","data":[{data}]}}"#));
}

fn json_str(s: &str) -> String {
    near_sdk::serde_json::to_string(s).unwrap()
}

#[cfg(test)]
mod test_utils {
    use super::*;
    use near_sdk::json_types::U128;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    pub const DAY_NS: u64 = 86_400 * 1_000_000_000;

    pub fn acc(s: &str) -> AccountId {
        s.parse().unwrap()
    }

    pub fn as_caller(caller: &str) {
        testing_env!(VMContextBuilder::new().predecessor_account_id(acc(caller)).block_timestamp(1_000 * DAY_NS).build());
    }

    /// A contract with $SOTECHY (1) and a store's token (2), called as the operator from here on
    pub fn setup() -> Contract {
        as_caller("owner.near");
        let mut c = Contract::new(acc("owner.near"), acc("api.near"), U128(1_000_000), U128(2_000_000));
        as_caller("api.near");
        c.register_token("1".into(), "SOTECHY".into());
        c.register_token("2".into(), "YOURSTORE".into());
        c
    }
}
