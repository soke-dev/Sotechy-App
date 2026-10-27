// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Sotechy store tokens
/// @notice Every Sotechy store's reward token in one contract (one id per store, ERC-1155 style).
/// Tokens are store credit: only Sotechy's operator mints, burns or moves them, nobody can trade
/// or send them outside Sotechy, and Sotechy's database ledger is what counts. Each change carries
/// the ledger entry it came from (`ref`), so anyone can match the chain against Sotechy's records.
contract SotechyTokens {
    // --- Who can do what ---
    address public owner;
    address public pendingOwner;
    mapping(address => bool) public isOperator;

    /// @notice Paused: nothing moves. Retired: paused for good, when Sotechy moves to a new contract.
    bool public paused;
    bool public retired;

    // --- Limits, so a stolen operator key can't mint without end ---
    uint256 public maxMintPerOp;
    uint256 public maxMintPerDay;
    uint256 public mintedToday;
    uint256 public mintDay;

    // --- Tokens ---
    mapping(uint256 => string) public tickerOf;
    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => mapping(address => uint256)) private _balances;
    string private _uri;

    /// @notice One change to balances: 0 mint, 1 burn, 2 move
    struct Op {
        uint8 kind;
        uint256 id;
        address from;
        address to;
        uint256 amount;
        bytes32 ref;
    }

    // ERC-1155 events, so explorers show holders and movements
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event URI(string value, uint256 indexed id);
    // Sotechy's own
    event Recorded(bytes32 indexed ref, uint8 kind, uint256 indexed id, uint256 amount);
    event TokenRegistered(uint256 indexed id, string ticker);
    event OperatorSet(address indexed operator, bool allowed);
    event LimitsSet(uint256 maxMintPerOp, uint256 maxMintPerDay);
    event Paused(bool paused);
    event Retired();
    event OwnershipTransferStarted(address indexed from, address indexed to);
    event OwnershipTransferred(address indexed from, address indexed to);

    error NotOwner();
    error NotOperator();
    error IsPaused();
    error IsRetired();
    error UnknownToken(uint256 id);
    error TokenExists(uint256 id);
    error OverOpLimit(uint256 amount, uint256 limit);
    error OverDailyLimit(uint256 wouldBe, uint256 limit);
    error NotEnough(uint256 id, address from, uint256 has, uint256 wants);
    error BadOp(uint8 kind);
    error ZeroAddress();
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

    constructor(address owner_, address operator_, uint256 maxMintPerOp_, uint256 maxMintPerDay_, string memory uri_) {
        if (owner_ == address(0) || operator_ == address(0)) revert ZeroAddress();
        owner = owner_;
        isOperator[operator_] = true;
        maxMintPerOp = maxMintPerOp_;
        maxMintPerDay = maxMintPerDay_;
        _uri = uri_;
        emit OwnershipTransferred(address(0), owner_);
        emit OperatorSet(operator_, true);
        emit LimitsSet(maxMintPerOp_, maxMintPerDay_);
    }

    // ------------------------------------------------------------------
    // Operator: Sotechy's API
    // ------------------------------------------------------------------

    /// @notice A store's token, created when Sotechy approves the store
    function registerToken(uint256 id, string calldata ticker) external onlyOperator {
        if (bytes(tickerOf[id]).length != 0) revert TokenExists(id);
        tickerOf[id] = ticker;
        emit TokenRegistered(id, ticker);
        emit URI(uri(id), id);
    }

    /// @notice Applies several changes in one transaction (the API batches what's waiting)
    function applyOps(Op[] calldata ops) external onlyOperator {
        for (uint256 i = 0; i < ops.length; i++) _apply(ops[i]);
    }

    function mint(uint256 id, address to, uint256 amount, bytes32 ref) external onlyOperator {
        _apply(Op(0, id, address(0), to, amount, ref));
    }

    function burn(uint256 id, address from, uint256 amount, bytes32 ref) external onlyOperator {
        _apply(Op(1, id, from, address(0), amount, ref));
    }

    function move(uint256 id, address from, address to, uint256 amount, bytes32 ref) external onlyOperator {
        _apply(Op(2, id, from, to, amount, ref));
    }

    function _apply(Op memory op) internal {
        if (bytes(tickerOf[op.id]).length == 0) revert UnknownToken(op.id);
        if (op.kind == 0) {
            if (op.to == address(0)) revert ZeroAddress();
            if (op.amount > maxMintPerOp) revert OverOpLimit(op.amount, maxMintPerOp);
            uint256 today = block.timestamp / 1 days;
            if (today != mintDay) {
                mintDay = today;
                mintedToday = 0;
            }
            uint256 wouldBe = mintedToday + op.amount;
            if (wouldBe > maxMintPerDay) revert OverDailyLimit(wouldBe, maxMintPerDay);
            mintedToday = wouldBe;
            _balances[op.id][op.to] += op.amount;
            totalSupply[op.id] += op.amount;
            emit TransferSingle(msg.sender, address(0), op.to, op.id, op.amount);
        } else if (op.kind == 1) {
            _take(op.id, op.from, op.amount);
            totalSupply[op.id] -= op.amount;
            emit TransferSingle(msg.sender, op.from, address(0), op.id, op.amount);
        } else if (op.kind == 2) {
            if (op.to == address(0)) revert ZeroAddress();
            _take(op.id, op.from, op.amount);
            _balances[op.id][op.to] += op.amount;
            emit TransferSingle(msg.sender, op.from, op.to, op.id, op.amount);
        } else {
            revert BadOp(op.kind);
        }
        emit Recorded(op.ref, op.kind, op.id, op.amount);
    }

    function _take(uint256 id, address from, uint256 amount) internal {
        uint256 has = _balances[id][from];
        if (has < amount) revert NotEnough(id, from, has, amount);
        unchecked {
            _balances[id][from] = has - amount;
        }
    }

    // ------------------------------------------------------------------
    // Owner: the rules
    // ------------------------------------------------------------------

    function setOperator(address operator, bool allowed) external onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        isOperator[operator] = allowed;
        emit OperatorSet(operator, allowed);
    }

    function setLimits(uint256 maxMintPerOp_, uint256 maxMintPerDay_) external onlyOwner {
        maxMintPerOp = maxMintPerOp_;
        maxMintPerDay = maxMintPerDay_;
        emit LimitsSet(maxMintPerOp_, maxMintPerDay_);
    }

    function setPaused(bool paused_) external onlyOwner {
        if (retired) revert IsRetired();
        paused = paused_;
        emit Paused(paused_);
    }

    /// @notice For good: when Sotechy moves to a new contract or chain. History stays readable.
    function retire() external onlyOwner {
        retired = true;
        paused = true;
        emit Paused(true);
        emit Retired();
    }

    function setURI(string calldata uri_) external onlyOwner {
        _uri = uri_;
    }

    /// @notice Two steps, so ownership can't go to a mistyped address
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
    // ERC-1155 reading (and refusing transfers)
    // ------------------------------------------------------------------

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return _balances[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory out) {
        out = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) out[i] = _balances[ids[i]][accounts[i]];
    }

    function uri(uint256) public view returns (string memory) {
        return _uri;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // ERC-165, ERC-1155, ERC-1155 metadata
        return interfaceId == 0x01ffc9a7 || interfaceId == 0xd9b67a26 || interfaceId == 0x0e89341c;
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function setApprovalForAll(address, bool) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256, uint256, bytes calldata) external pure {
        revert NonTransferable();
    }

    function safeBatchTransferFrom(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure {
        revert NonTransferable();
    }
}
