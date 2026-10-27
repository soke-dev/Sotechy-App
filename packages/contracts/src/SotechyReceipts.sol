// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Sotechy receipts
/// @notice One receipt for every completed Sotechy order, held by the customer (ERC-721 style).
/// Receipts can't be sold or sent on. On chain there's no personal detail and no amount: just the
/// store, the order number, when it was issued, and a fingerprint (keccak256) of the full receipt
/// Sotechy keeps. Anyone holding the full receipt can check it against the fingerprint.
contract SotechyReceipts {
    string public constant name = "Sotechy Receipts";
    string public constant symbol = "SOTR";

    // --- Who can do what ---
    address public owner;
    address public pendingOwner;
    mapping(address => bool) public isOperator;
    bool public paused;
    bool public retired;

    // --- Receipts ---
    struct Receipt {
        uint256 store;
        bytes32 order;
        bytes32 fingerprint;
        uint64 issuedAt;
    }

    /// @notice What the operator sends to issue one receipt; ids are Sotechy's receipt numbers
    struct Issue {
        uint256 id;
        address to;
        uint256 store;
        bytes32 order;
        bytes32 fingerprint;
    }

    mapping(uint256 => Receipt) public receipts;
    /// @notice The receipt for an order, so no order gets two
    mapping(bytes32 => uint256) public receiptOfOrder;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    uint256 public totalIssued;
    string private _baseURI;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Issued(uint256 indexed id, bytes32 indexed order, uint256 indexed store, bytes32 fingerprint);
    event OperatorSet(address indexed operator, bool allowed);
    event Paused(bool paused);
    event Retired();
    event OwnershipTransferStarted(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotOperator();
    error IsPaused();
    error IsRetired();
    error ZeroAddress();
    error ReceiptExists(uint256 id);
    error OrderHasReceipt(bytes32 order);
    error UnknownReceipt(uint256 id);
    error NonTransferable();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (!isOperator[msg.sender]) revert NotOperator();
        if (retired) revert IsRetired();
        if (paused) revert IsPaused();
        _;
    }

    constructor(address owner_, address operator_, string memory baseURI_) {
        if (owner_ == address(0) || operator_ == address(0)) revert ZeroAddress();
        owner = owner_;
        isOperator[operator_] = true;
        _baseURI = baseURI_;
        emit OwnershipTransferred(address(0), owner_);
        emit OperatorSet(operator_, true);
    }

    // ------------------------------------------------------------------
    // Operator: Sotechy's API
    // ------------------------------------------------------------------

    function issue(Issue[] calldata list) external onlyOperator {
        for (uint256 i = 0; i < list.length; i++) {
            Issue calldata r = list[i];
            if (r.to == address(0)) revert ZeroAddress();
            if (r.id == 0 || _owners[r.id] != address(0)) revert ReceiptExists(r.id);
            if (receiptOfOrder[r.order] != 0) revert OrderHasReceipt(r.order);
            receipts[r.id] = Receipt(r.store, r.order, r.fingerprint, uint64(block.timestamp));
            receiptOfOrder[r.order] = r.id;
            _owners[r.id] = r.to;
            _balances[r.to] += 1;
            totalIssued += 1;
            emit Transfer(address(0), r.to, r.id);
            emit Issued(r.id, r.order, r.store, r.fingerprint);
        }
    }

    /// @notice True when a full receipt's fingerprint is the one recorded for this receipt
    function verify(uint256 id, bytes32 fingerprint) external view returns (bool) {
        return _owners[id] != address(0) && receipts[id].fingerprint == fingerprint;
    }

    // ------------------------------------------------------------------
    // Owner: the rules
    // ------------------------------------------------------------------

    function setOperator(address operator, bool allowed) external onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        isOperator[operator] = allowed;
        emit OperatorSet(operator, allowed);
    }

    function setPaused(bool paused_) external onlyOwner {
        if (retired) revert IsRetired();
        paused = paused_;
        emit Paused(paused_);
    }

    function retire() external onlyOwner {
        retired = true;
        paused = true;
        emit Paused(true);
        emit Retired();
    }

    function setURI(string calldata baseURI_) external onlyOwner {
        _baseURI = baseURI_;
    }

    function transferOwnership(address to) external onlyOwner {
        pendingOwner = to;
        emit OwnershipTransferStarted(owner, to);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    // ------------------------------------------------------------------
    // ERC-721 reading (and refusing transfers)
    // ------------------------------------------------------------------

    function balanceOf(address holder) external view returns (uint256) {
        if (holder == address(0)) revert ZeroAddress();
        return _balances[holder];
    }

    function ownerOf(uint256 id) public view returns (address) {
        address o = _owners[id];
        if (o == address(0)) revert UnknownReceipt(id);
        return o;
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        ownerOf(id);
        return string.concat(_baseURI, _toString(id));
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // ERC-165, ERC-721, ERC-721 metadata
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }

    function getApproved(uint256 id) external view returns (address) {
        ownerOf(id);
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function approve(address, uint256) external pure {
        revert NonTransferable();
    }

    function setApprovalForAll(address, bool) external pure {
        revert NonTransferable();
    }

    function transferFrom(address, address, uint256) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert NonTransferable();
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 len;
        for (uint256 t = v; t != 0; t /= 10) len++;
        bytes memory b = new bytes(len);
        for (; v != 0; v /= 10) b[--len] = bytes1(uint8(48 + (v % 10)));
        return string(b);
    }
}
