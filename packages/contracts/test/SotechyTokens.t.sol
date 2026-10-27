// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SotechyTokens} from "../src/SotechyTokens.sol";

/// Foundry's cheat codes, declared here so the tests need no libraries
interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function expectRevert(bytes calldata) external;
    function expectRevert(bytes4) external;
}

contract SotechyTokensTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    SotechyTokens t;
    address owner = address(0xA11CE);
    address operator = address(0xB0B);
    address ada = address(0xADA);
    address tunde = address(0x7DE);
    address stranger = address(0xBAD);
    uint256 constant XENA = 2;

    function setUp() public {
        t = new SotechyTokens(owner, operator, 1_000_000, 5_000_000, "https://api.sotechy.shop/tokens/{id}.json");
        vm.prank(operator);
        t.registerToken(XENA, "XENA");
    }

    function _eq(uint256 a, uint256 b) internal pure {
        require(a == b, "not equal");
    }

    function test_operatorMintsMovesAndBurns() public {
        vm.startPrank(operator);
        t.mint(XENA, ada, 50_000, bytes32("ledger-1"));
        t.move(XENA, ada, tunde, 20_000, bytes32("ledger-2"));
        t.burn(XENA, tunde, 5_000, bytes32("ledger-3"));
        vm.stopPrank();
        _eq(t.balanceOf(ada, XENA), 30_000);
        _eq(t.balanceOf(tunde, XENA), 15_000);
        _eq(t.totalSupply(XENA), 45_000);
    }

    function test_batch() public {
        SotechyTokens.Op[] memory ops = new SotechyTokens.Op[](3);
        ops[0] = SotechyTokens.Op(0, XENA, address(0), ada, 10_000, bytes32("a"));
        ops[1] = SotechyTokens.Op(0, XENA, address(0), tunde, 4_000, bytes32("b"));
        ops[2] = SotechyTokens.Op(2, XENA, ada, tunde, 1_000, bytes32("c"));
        vm.prank(operator);
        t.applyOps(ops);
        _eq(t.balanceOf(ada, XENA), 9_000);
        _eq(t.balanceOf(tunde, XENA), 5_000);
    }

    function test_strangersCantMint() public {
        vm.prank(stranger);
        vm.expectRevert(SotechyTokens.NotOperator.selector);
        t.mint(XENA, ada, 1, bytes32("x"));
    }

    function test_ownerIsNotAnOperator() public {
        vm.prank(owner);
        vm.expectRevert(SotechyTokens.NotOperator.selector);
        t.mint(XENA, ada, 1, bytes32("x"));
    }

    function test_unknownToken() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(SotechyTokens.UnknownToken.selector, 99));
        t.mint(99, ada, 1, bytes32("x"));
    }

    function test_cantRegisterTwice() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(SotechyTokens.TokenExists.selector, XENA));
        t.registerToken(XENA, "OTHER");
    }

    function test_perMintLimit() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(SotechyTokens.OverOpLimit.selector, 1_000_001, 1_000_000));
        t.mint(XENA, ada, 1_000_001, bytes32("x"));
    }

    function test_dailyLimitResetsNextDay() public {
        vm.warp(10 days);
        vm.startPrank(operator);
        for (uint256 i = 0; i < 5; i++) t.mint(XENA, ada, 1_000_000, bytes32(i));
        vm.expectRevert(abi.encodeWithSelector(SotechyTokens.OverDailyLimit.selector, 5_000_001, 5_000_000));
        t.mint(XENA, ada, 1, bytes32("over"));
        vm.warp(11 days);
        t.mint(XENA, ada, 1, bytes32("next day"));
        vm.stopPrank();
        _eq(t.balanceOf(ada, XENA), 5_000_001);
    }

    function test_cantSpendMoreThanHeld() public {
        vm.startPrank(operator);
        t.mint(XENA, ada, 100, bytes32("a"));
        vm.expectRevert(abi.encodeWithSelector(SotechyTokens.NotEnough.selector, XENA, ada, 100, 101));
        t.move(XENA, ada, tunde, 101, bytes32("b"));
        vm.stopPrank();
    }

    function test_pauseStopsEverything() public {
        vm.prank(owner);
        t.setPaused(true);
        vm.prank(operator);
        vm.expectRevert(SotechyTokens.IsPaused.selector);
        t.mint(XENA, ada, 1, bytes32("x"));
        vm.prank(owner);
        t.setPaused(false);
        vm.prank(operator);
        t.mint(XENA, ada, 1, bytes32("x"));
    }

    function test_retireIsForGood() public {
        vm.prank(owner);
        t.retire();
        vm.prank(operator);
        vm.expectRevert(SotechyTokens.IsRetired.selector);
        t.mint(XENA, ada, 1, bytes32("x"));
        vm.prank(owner);
        vm.expectRevert(SotechyTokens.IsRetired.selector);
        t.setPaused(false);
    }

    function test_onlyOwnerSetsRules() public {
        vm.prank(operator);
        vm.expectRevert(SotechyTokens.NotOwner.selector);
        t.setLimits(1, 1);
        vm.prank(owner);
        t.setLimits(10, 20);
        _eq(t.maxMintPerOp(), 10);
    }

    function test_ownerSwapsTheOperator() public {
        address next = address(0xC0DE);
        vm.startPrank(owner);
        t.setOperator(operator, false);
        t.setOperator(next, true);
        vm.stopPrank();
        vm.prank(operator);
        vm.expectRevert(SotechyTokens.NotOperator.selector);
        t.mint(XENA, ada, 1, bytes32("x"));
        vm.prank(next);
        t.mint(XENA, ada, 1, bytes32("x"));
    }

    function test_ownershipTakesTwoSteps() public {
        address next = address(0x5AFE);
        vm.prank(owner);
        t.transferOwnership(next);
        require(t.owner() == owner, "moved too soon");
        vm.prank(stranger);
        vm.expectRevert(SotechyTokens.NotOwner.selector);
        t.acceptOwnership();
        vm.prank(next);
        t.acceptOwnership();
        require(t.owner() == next, "not moved");
    }

    function test_nobodyCanTradeThem() public {
        vm.prank(operator);
        t.mint(XENA, ada, 100, bytes32("a"));
        vm.prank(ada);
        vm.expectRevert(SotechyTokens.NonTransferable.selector);
        t.safeTransferFrom(ada, tunde, XENA, 1, "");
        vm.prank(ada);
        vm.expectRevert(SotechyTokens.NonTransferable.selector);
        t.setApprovalForAll(tunde, true);
        require(!t.isApprovedForAll(ada, tunde), "approved");
    }

    function test_reportsErc1155() public view {
        require(t.supportsInterface(0xd9b67a26), "erc1155");
        require(t.supportsInterface(0x01ffc9a7), "erc165");
    }
}
