// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SotechyReceipts} from "../src/SotechyReceipts.sol";

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert(bytes calldata) external;
    function expectRevert(bytes4) external;
}

contract SotechyReceiptsTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    SotechyReceipts r;
    address owner = address(0xA11CE);
    address operator = address(0xB0B);
    address ada = address(0xADA);
    address tunde = address(0x7DE);
    address stranger = address(0xBAD);

    function setUp() public {
        r = new SotechyReceipts(owner, operator, "https://api.sotechy.shop/receipts/");
    }

    function _one(uint256 id, address to, bytes32 order) internal pure returns (SotechyReceipts.Issue[] memory list) {
        list = new SotechyReceipts.Issue[](1);
        list[0] = SotechyReceipts.Issue(id, to, 2, order, keccak256(abi.encode(order)));
    }

    function test_issuesAndVerifies() public {
        SotechyReceipts.Issue[] memory list = new SotechyReceipts.Issue[](2);
        list[0] = SotechyReceipts.Issue(1, ada, 2, bytes32("SOT-1001"), keccak256("receipt one"));
        list[1] = SotechyReceipts.Issue(2, tunde, 1, bytes32("SOT-1002"), keccak256("receipt two"));
        vm.prank(operator);
        r.issue(list);
        require(r.ownerOf(1) == ada && r.ownerOf(2) == tunde, "owners");
        require(r.balanceOf(ada) == 1, "balance");
        require(r.totalIssued() == 2, "total");
        require(r.receiptOfOrder(bytes32("SOT-1002")) == 2, "by order");
        require(r.verify(1, keccak256("receipt one")), "verify");
        require(!r.verify(1, keccak256("something else")), "wrong print");
        require(keccak256(bytes(r.tokenURI(2))) == keccak256("https://api.sotechy.shop/receipts/2"), "uri");
    }

    function test_oneReceiptPerOrder() public {
        vm.startPrank(operator);
        r.issue(_one(1, ada, bytes32("SOT-1")));
        vm.expectRevert(abi.encodeWithSelector(SotechyReceipts.OrderHasReceipt.selector, bytes32("SOT-1")));
        r.issue(_one(2, ada, bytes32("SOT-1")));
        vm.stopPrank();
    }

    function test_idsAreNotReused() public {
        vm.startPrank(operator);
        r.issue(_one(7, ada, bytes32("SOT-1")));
        vm.expectRevert(abi.encodeWithSelector(SotechyReceipts.ReceiptExists.selector, 7));
        r.issue(_one(7, tunde, bytes32("SOT-2")));
        vm.stopPrank();
    }

    function test_onlyTheOperatorIssues() public {
        SotechyReceipts.Issue[] memory list = _one(1, ada, bytes32("SOT-1"));
        vm.prank(stranger);
        vm.expectRevert(SotechyReceipts.NotOperator.selector);
        r.issue(list);
        vm.prank(owner);
        vm.expectRevert(SotechyReceipts.NotOperator.selector);
        r.issue(list);
    }

    function test_pausedAndRetired() public {
        SotechyReceipts.Issue[] memory list = _one(1, ada, bytes32("SOT-1"));
        vm.prank(owner);
        r.setPaused(true);
        vm.prank(operator);
        vm.expectRevert(SotechyReceipts.IsPaused.selector);
        r.issue(list);
        vm.prank(owner);
        r.retire();
        vm.prank(operator);
        vm.expectRevert(SotechyReceipts.IsRetired.selector);
        r.issue(list);
    }

    function test_cantBeSentOn() public {
        vm.prank(operator);
        r.issue(_one(1, ada, bytes32("SOT-1")));
        vm.prank(ada);
        vm.expectRevert(SotechyReceipts.NonTransferable.selector);
        r.transferFrom(ada, tunde, 1);
        vm.prank(ada);
        vm.expectRevert(SotechyReceipts.NonTransferable.selector);
        r.approve(tunde, 1);
        require(r.ownerOf(1) == ada, "moved");
    }

    function test_unknownReceipt() public {
        vm.expectRevert(abi.encodeWithSelector(SotechyReceipts.UnknownReceipt.selector, 5));
        r.ownerOf(5);
    }

    function test_reportsErc721() public view {
        require(r.supportsInterface(0x80ac58cd), "erc721");
        require(r.supportsInterface(0x5b5e139f), "metadata");
    }
}
