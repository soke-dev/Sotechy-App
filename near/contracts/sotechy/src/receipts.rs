//! Receipts (soulbound NEP-171): one per order, issued when the customer pays. Its status moves with the order
//! (paid → shipped → delivered, or refunded) and its picture is drawn from that status, so the receipt in the
//! customer's wallet changes as the order does. On chain it holds only the store, the order number, the dates and a
//! fingerprint (keccak256) of the full receipt: no amounts, no personal details. Anyone holding the full receipt can
//! check it against the fingerprint with `verify`.
use crate::{emit, json_str, Contract, ContractExt, Key};
use near_sdk::json_types::U128;
use near_sdk::store::IterableSet;
use near_sdk::{env, near, require, AccountId};

const NEP171: &str = "nep171";
const NEP171_VERSION: &str = "1.2.0";
const SOULBOUND: &str = "A Sotechy receipt belongs to the customer who placed the order and can't be sent on";

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Paid,
    Shipped,
    Delivered,
    Refunded,
}

impl Status {
    fn label(self) -> &'static str {
        match self {
            Status::Paid => "Paid",
            Status::Shipped => "On its way",
            Status::Delivered => "Delivered",
            Status::Refunded => "Refunded",
        }
    }

    /// The order a receipt can move in: forward only, and a refund ends it
    fn can_follow(self, before: Status) -> bool {
        matches!(
            (before, self),
            (Status::Paid, Status::Shipped) | (Status::Paid, Status::Delivered) | (Status::Shipped, Status::Delivered) | (Status::Paid, Status::Refunded) | (Status::Shipped, Status::Refunded)
        )
    }
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Receipt {
    pub owner_id: AccountId,
    pub store_id: String,
    pub store_name: String,
    pub order: String,
    /// keccak256 of the full receipt, as 0x-prefixed hex
    pub fingerprint: String,
    pub status: Status,
    pub issued_at_ms: u64,
    pub updated_at_ms: u64,
}

/// What the operator sends to issue one receipt
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct Issue {
    pub token_id: String,
    pub owner_id: AccountId,
    pub store_id: String,
    pub store_name: String,
    pub order: String,
    pub fingerprint: String,
}

/// NEP-177 token metadata
#[near(serializers = [json])]
pub struct TokenMetadata {
    pub title: Option<String>,
    pub description: Option<String>,
    pub media: Option<String>,
    pub media_hash: Option<String>,
    pub copies: Option<u64>,
    pub issued_at: Option<String>,
    pub expires_at: Option<String>,
    pub starts_at: Option<String>,
    pub updated_at: Option<String>,
    pub extra: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<String>,
}

/// NEP-171 token view
#[near(serializers = [json])]
pub struct Token {
    pub token_id: String,
    pub owner_id: AccountId,
    pub metadata: TokenMetadata,
    pub approved_account_ids: std::collections::HashMap<AccountId, u64>,
}

/// NEP-177 contract metadata
#[near(serializers = [json])]
pub struct ContractMetadata {
    pub spec: String,
    pub name: String,
    pub symbol: String,
    pub icon: Option<String>,
    pub base_uri: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<String>,
}

#[near]
impl Contract {
    // Operator: the API

    /// Issues receipts for paid orders, one per order
    pub fn issue(&mut self, list: Vec<Issue>) {
        self.only_operator();
        let now = env::block_timestamp_ms();
        for r in list {
            require!(!r.token_id.is_empty() && !self.receipts.contains_key(&r.token_id), format!("Receipt {} already exists", r.token_id));
            require!(!self.by_order.contains_key(&r.order), format!("Order {} already has a receipt", r.order));
            require!(is_fingerprint(&r.fingerprint), "A fingerprint is 0x and 64 hex characters");
            self.by_order.insert(r.order.clone(), r.token_id.clone());
            self.add_to_owner(&r.owner_id, &r.token_id);
            self.all.push(r.token_id.clone());
            emit(NEP171, NEP171_VERSION, "nft_mint", format!(r#"{{"owner_id":"{}","token_ids":["{}"],"memo":{}}}"#, r.owner_id, r.token_id, json_str(&r.order)));
            let receipt = Receipt { owner_id: r.owner_id, store_id: r.store_id, store_name: r.store_name, order: r.order, fingerprint: r.fingerprint, status: Status::Paid, issued_at_ms: now, updated_at_ms: now };
            self.receipts.insert(r.token_id, receipt);
        }
    }

    /// Moves a receipt on as its order does. The fingerprint is replaced when the final receipt differs
    /// (e.g. on delivery or a refund).
    pub fn set_status(&mut self, token_id: String, status: Status, fingerprint: Option<String>) {
        self.only_operator();
        let receipt = self.receipts.get_mut(&token_id).unwrap_or_else(|| env::panic_str("No such receipt"));
        require!(status.can_follow(receipt.status), format!("A {:?} receipt can't become {:?}", receipt.status, status));
        if let Some(f) = fingerprint {
            require!(is_fingerprint(&f), "A fingerprint is 0x and 64 hex characters");
            receipt.fingerprint = f;
        }
        receipt.status = status;
        receipt.updated_at_ms = env::block_timestamp_ms();
        let order = receipt.order.clone();
        emit("sotechy_receipts", "1.0.0", "status_update", format!(r#"{{"token_id":"{token_id}","order":{},"status":"{}"}}"#, json_str(&order), status.label()));
    }

    // Views

    /// True when a full receipt's fingerprint is the one recorded for this receipt
    pub fn verify(&self, token_id: String, fingerprint: String) -> bool {
        self.receipts.get(&token_id).is_some_and(|r| r.fingerprint.eq_ignore_ascii_case(&fingerprint))
    }

    pub fn receipt(&self, token_id: String) -> Option<Receipt> {
        self.receipts.get(&token_id).cloned()
    }

    pub fn receipt_of_order(&self, order: String) -> Option<String> {
        self.by_order.get(&order).cloned()
    }

    pub fn nft_token(&self, token_id: String) -> Option<Token> {
        let r = self.receipts.get(&token_id)?;
        Some(token_view(&token_id, r))
    }

    pub fn nft_metadata(&self) -> ContractMetadata {
        ContractMetadata { spec: "nft-1.0.0".into(), name: "Sotechy receipts".into(), symbol: "SORCPT".into(), icon: None, base_uri: None, reference: None, reference_hash: None }
    }

    pub fn nft_total_supply(&self) -> U128 {
        U128(self.all.len() as u128)
    }

    pub fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        let start = from_index.map_or(0, |i| i.0 as usize);
        self.all.iter().skip(start).take(limit.unwrap_or(50) as usize).filter_map(|id| self.receipts.get(id).map(|r| token_view(id, r))).collect()
    }

    pub fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        U128(self.by_owner.get(&account_id).map_or(0, |s| s.len() as u128))
    }

    pub fn nft_tokens_for_owner(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        let Some(set) = self.by_owner.get(&account_id) else { return vec![] };
        let start = from_index.map_or(0, |i| i.0 as usize);
        set.iter().skip(start).take(limit.unwrap_or(50) as usize).filter_map(|id| self.receipts.get(id).map(|r| token_view(id, r))).collect()
    }

    // NEP-171 transfers: receipts are soulbound

    #[payable]
    pub fn nft_transfer(&mut self, receiver_id: AccountId, token_id: String, approval_id: Option<u64>, memo: Option<String>) {
        let _ = (receiver_id, token_id, approval_id, memo);
        env::panic_str(SOULBOUND);
    }

    #[payable]
    pub fn nft_transfer_call(&mut self, receiver_id: AccountId, token_id: String, approval_id: Option<u64>, memo: Option<String>, msg: String) -> bool {
        let _ = (receiver_id, token_id, approval_id, memo, msg);
        env::panic_str(SOULBOUND);
    }
}

impl Contract {
    fn add_to_owner(&mut self, owner: &AccountId, token_id: &str) {
        if !self.by_owner.contains_key(owner) {
            let set = IterableSet::new(Key::OwnerSet { owner_hash: env::sha256(owner.as_bytes()) });
            self.by_owner.insert(owner.clone(), set);
        }
        self.by_owner.get_mut(owner).unwrap().insert(token_id.to_string());
    }
}

fn token_view(token_id: &str, r: &Receipt) -> Token {
    let extra = near_sdk::serde_json::json!({ "store_id": r.store_id, "order": r.order, "status": r.status, "fingerprint": r.fingerprint }).to_string();
    Token {
        token_id: token_id.to_string(),
        owner_id: r.owner_id.clone(),
        metadata: TokenMetadata {
            title: Some(format!("Sotechy receipt #{token_id}")),
            description: Some(format!("Order {} at {}: {}", r.order, r.store_name, r.status.label())),
            media: Some(picture(token_id, r)),
            media_hash: None,
            copies: Some(1),
            issued_at: Some(r.issued_at_ms.to_string()),
            expires_at: None,
            starts_at: None,
            updated_at: Some(r.updated_at_ms.to_string()),
            extra: Some(extra),
            reference: None,
            reference_hash: None,
        },
        approved_account_ids: Default::default(),
    }
}

/// The receipt's picture, drawn from its status: a card with a progress bar that fills as the order moves
fn picture(token_id: &str, r: &Receipt) -> String {
    let (fill, color) = match r.status {
        Status::Paid => (100, "#FDB913"),
        Status::Shipped => (210, "#F7931E"),
        Status::Delivered => (320, "#1C8A4C"),
        Status::Refunded => (320, "#8C8178"),
    };
    let store = escape(&r.store_name);
    let order = escape(&r.order);
    let svg = format!(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>\
<rect width='400' height='400' rx='32' fill='#17120E'/>\
<circle cx='200' cy='150' r='90' fill='#F7931E'/>\
<rect x='0' y='150' width='400' height='250' fill='#17120E'/>\
<rect x='110' y='118' width='180' height='6' fill='#17120E'/><rect x='110' y='134' width='180' height='9' fill='#17120E'/>\
<text x='40' y='200' font-family='sans-serif' font-size='30' font-weight='800' fill='#FFF1DF'>Sotechy receipt</text>\
<text x='40' y='232' font-family='monospace' font-size='16' fill='#FDB913'>#{token_id} · {order}</text>\
<text x='40' y='262' font-family='sans-serif' font-size='18' fill='#FFF1DF' opacity='0.8'>{store}</text>\
<rect x='40' y='300' width='320' height='14' rx='7' fill='#FFF1DF' opacity='0.15'/>\
<rect x='40' y='300' width='{fill}' height='14' rx='7' fill='{color}'/>\
<text x='40' y='350' font-family='sans-serif' font-size='22' font-weight='700' fill='{color}'>{status}</text>\
</svg>",
        status = r.status.label()
    );
    format!("data:image/svg+xml;charset=utf-8,{}", svg.replace('%', "%25").replace('#', "%23").replace('<', "%3C").replace('>', "%3E"))
}

fn escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('\'', "&apos;").replace('"', "&quot;")
}

fn is_fingerprint(s: &str) -> bool {
    s.len() == 66 && s.starts_with("0x") && s[2..].chars().all(|c| c.is_ascii_hexdigit())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{acc, as_caller, setup};
    use near_sdk::test_utils::get_logs;

    fn fp() -> String {
        format!("0x9f3c4a{}7b20e21a", "0".repeat(50))
    }

    fn issued() -> Contract {
        let mut c = setup();
        c.issue(vec![Issue { token_id: "SO-1024".into(), owner_id: acc("ada.near"), store_id: "2".into(), store_name: "Sotechy Shop".into(), order: "SO-1024".into(), fingerprint: fp() }]);
        c
    }

    #[test]
    fn issues_a_receipt_with_metadata() {
        let c = issued();
        assert!(get_logs().iter().any(|l| l.contains(r#""event":"nft_mint""#)));
        let t = c.nft_token("SO-1024".into()).unwrap();
        assert_eq!(t.owner_id, acc("ada.near"));
        assert!(t.metadata.description.unwrap().contains("Paid"));
        assert!(t.metadata.media.unwrap().starts_with("data:image/svg+xml"));
        assert_eq!(c.nft_supply_for_owner(acc("ada.near")).0, 1);
        assert_eq!(c.receipt_of_order("SO-1024".into()), Some("SO-1024".into()));
        assert!(c.verify("SO-1024".into(), fp()));
        assert!(!c.verify("SO-1024".into(), fp().replace('9', "8")));
    }

    #[test]
    fn status_moves_with_the_order() {
        let mut c = issued();
        c.set_status("SO-1024".into(), Status::Shipped, None);
        c.set_status("SO-1024".into(), Status::Delivered, None);
        assert_eq!(c.receipt("SO-1024".into()).unwrap().status, Status::Delivered);
        assert!(c.nft_token("SO-1024".into()).unwrap().metadata.description.unwrap().contains("Delivered"));
        assert!(get_logs().iter().any(|l| l.contains("status_update")));
    }

    #[test]
    #[should_panic(expected = "can't become")]
    fn status_only_moves_forward() {
        let mut c = issued();
        c.set_status("SO-1024".into(), Status::Delivered, None);
        c.set_status("SO-1024".into(), Status::Shipped, None);
    }

    #[test]
    #[should_panic(expected = "already has a receipt")]
    fn one_receipt_per_order() {
        let mut c = issued();
        c.issue(vec![Issue { token_id: "SO-1024b".into(), owner_id: acc("ada.near"), store_id: "2".into(), store_name: "Sotechy Shop".into(), order: "SO-1024".into(), fingerprint: fp() }]);
    }

    #[test]
    #[should_panic(expected = "can't be sent on")]
    fn soulbound() {
        let mut c = issued();
        as_caller("ada.near");
        c.nft_transfer(acc("bo.near"), "SO-1024".into(), None, None);
    }

    #[test]
    #[should_panic(expected = "Only Sotechy's operator")]
    fn only_the_operator_issues() {
        let mut c = issued();
        as_caller("ada.near");
        c.set_status("SO-1024".into(), Status::Delivered, None);
    }
}
