// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../contracts/PaymentIntent.sol";
import "../contracts/PaymentIntentFactory.sol";
import "./mocks/MockERC20.sol";

contract PaymentIntentTest is Test {
    PaymentIntentFactory public factory;
    MockERC20 public token;
    PaymentIntent public intent;
    
    address public payer = address(0x1);
    address public agent = address(0x2);
    address public merchant1 = address(0x3);
    address public merchant2 = address(0x4);
    address public other = address(0x5);
    
    uint256 public constant TOTAL_CAP = 1000e6; // 1000 USDC
    uint256 public constant PER_TX_CAP = 100e6;  // 100 USDC
    uint64 public startTime;
    uint64 public endTime;
    
    event Executed(
        address indexed agent,
        address indexed merchant,
        address indexed token,
        uint256 amount,
        bytes32 receiptHash,
        string receiptURI
    );
    
    event Revoked(address indexed by, string reason);
    event ToppedUp(uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event MerchantUpdated(address indexed merchant, bool allowed);

    function setUp() public {
        factory = new PaymentIntentFactory();
        token = new MockERC20("Mock USDC", "USDC", 6, 1000000e6);
        
        // Give tokens to payer
        token.transfer(payer, 10000e6);
        
        startTime = uint64(block.timestamp);
        endTime = uint64(block.timestamp + 7 days);
        
        vm.startPrank(payer);
        address[] memory merchants = new address[](2);
        merchants[0] = merchant1;
        merchants[1] = merchant2;
        
        IPaymentIntentFactory.CreateParams memory params = IPaymentIntentFactory.CreateParams({
            token: address(token),
            agent: agent,
            totalCap: TOTAL_CAP,
            perTxCap: PER_TX_CAP,
            start: startTime,
            end: endTime,
            merchants: merchants,
            metadataURI: "ipfs://QmTest",
            salt: keccak256("test-intent")
        });
        
        address intentAddr = factory.createIntent(params);
        intent = PaymentIntent(intentAddr);
        vm.stopPrank();
        
        token.transfer(address(intent), 500e6); // Fund with 500 USDC
    }

    function testInitialState() public view {
        assertEq(intent.payer(), payer);
        assertEq(intent.agent(), agent);
        assertEq(intent.token(), address(token));
        assertEq(uint(intent.state()), uint(IPaymentIntent.State.Active));
        assertEq(intent.getBalance(), 500e6);
        
        IPaymentIntent.Limits memory limits = intent.limits();
        assertEq(limits.totalCap, TOTAL_CAP);
        assertEq(limits.perTxCap, PER_TX_CAP);
        assertEq(limits.spent, 0);
        assertEq(limits.start, startTime);
        assertEq(limits.end, endTime);
        
        assertTrue(intent.isMerchantAllowed(merchant1));
        assertTrue(intent.isMerchantAllowed(merchant2));
        assertFalse(intent.isMerchantAllowed(other));
    }

    function testSuccessfulExecution() public {
        uint256 amount = 50e6;
        bytes32 receiptHash = keccak256("test-receipt");
        string memory receiptURI = "ipfs://QmReceipt";
        
        uint256 initialBalance = intent.getBalance();
        uint256 initialMerchantBalance = token.balanceOf(merchant1);
        
        vm.expectEmit(true, true, true, true);
        emit Executed(agent, merchant1, address(token), amount, receiptHash, receiptURI);
        
        vm.prank(agent);
        intent.execute(merchant1, amount, receiptHash, receiptURI);
        
        assertEq(intent.getBalance(), initialBalance - amount);
        assertEq(token.balanceOf(merchant1), initialMerchantBalance + amount);
        assertEq(intent.limits().spent, amount);
    }

    function testExecutionFailures() public {
        uint256 amount = 50e6;
        bytes32 receiptHash = keccak256("test-receipt");
        string memory receiptURI = "ipfs://QmReceipt";
        
        // Test unauthorized caller
        vm.prank(other);
        vm.expectRevert("PaymentIntent: not agent");
        intent.execute(merchant1, amount, receiptHash, receiptURI);
        
        // Test invalid merchant
        vm.prank(agent);
        vm.expectRevert("PaymentIntent: merchant not allowed");
        intent.execute(other, amount, receiptHash, receiptURI);
        
        // Test amount exceeds per-tx cap
        vm.prank(agent);
        vm.expectRevert("PaymentIntent: exceeds per tx cap");
        intent.execute(merchant1, PER_TX_CAP + 1, receiptHash, receiptURI);
        
        // Test zero amount
        vm.prank(agent);
        vm.expectRevert("PaymentIntent: invalid amount");
        intent.execute(merchant1, 0, receiptHash, receiptURI);
        
        // Test zero receipt hash
        vm.prank(agent);
        vm.expectRevert("PaymentIntent: invalid receipt hash");
        intent.execute(merchant1, amount, bytes32(0), receiptURI);
    }

    function testTotalCapEnforcement() public {
        // Fund the contract with enough tokens for the test
        token.transfer(address(intent), TOTAL_CAP);
        
        uint256 amount = PER_TX_CAP;
        bytes32 receiptHash = keccak256("test-receipt");
        string memory receiptURI = "ipfs://QmReceipt";
        
        // Execute multiple payments up to total cap
        vm.startPrank(agent);
        for (uint256 i = 0; i < TOTAL_CAP / PER_TX_CAP; i++) {
            intent.execute(merchant1, amount, receiptHash, receiptURI);
        }
        
        // Should fail when exceeding total cap
        vm.expectRevert("PaymentIntent: exceeds total cap");
        intent.execute(merchant1, 1, receiptHash, receiptURI);
        vm.stopPrank();
    }

    function testTimeConstraints() public {
        uint256 amount = 50e6;
        bytes32 receiptHash = keccak256("test-receipt");
        string memory receiptURI = "ipfs://QmReceipt";
        
        // Test execution before start time
        vm.warp(startTime - 1);
        vm.prank(agent);
        vm.expectRevert("PaymentIntent: too early");
        intent.execute(merchant1, amount, receiptHash, receiptURI);
        
        // Test execution after end time
        vm.warp(endTime);
        vm.prank(agent);
        vm.expectRevert("PaymentIntent: not active");
        intent.execute(merchant1, amount, receiptHash, receiptURI);
        
        // Test state changes to expired after end time
        assertEq(uint(intent.state()), uint(IPaymentIntent.State.Expired));
    }

    function testRevoke() public {
        string memory reason = "Emergency revoke";
        
        vm.expectEmit(true, false, false, true);
        emit Revoked(payer, reason);
        
        vm.prank(payer);
        intent.revoke(reason);
        
        assertEq(uint(intent.state()), uint(IPaymentIntent.State.Revoked));
        
        // Should not allow execution after revoke
        vm.prank(agent);
        vm.expectRevert("PaymentIntent: not active");
        intent.execute(merchant1, 50e6, keccak256("test"), "uri");
    }

    function testAgentCanRevoke() public {
        string memory reason = "Agent revoke";
        
        vm.expectEmit(true, false, false, true);
        emit Revoked(agent, reason);
        
        vm.prank(agent);
        intent.revoke(reason);
        
        assertEq(uint(intent.state()), uint(IPaymentIntent.State.Revoked));
    }

    function testTopUp() public {
        uint256 topUpAmount = 200e6;
        uint256 initialBalance = intent.getBalance();
        
        vm.startPrank(payer);
        token.approve(address(intent), topUpAmount);
        intent.topUp(topUpAmount);
        vm.stopPrank();
        
        assertEq(intent.getBalance(), initialBalance + topUpAmount);
    }

    function testWithdrawRemainder() public {
        uint256 initialBalance = intent.getBalance();
        
        // Revoke first
        vm.prank(payer);
        intent.revoke("test");
        
        vm.expectEmit(true, false, false, true);
        emit Withdrawn(payer, initialBalance);
        
        vm.prank(payer);
        intent.withdrawRemainder(payer);
        
        assertEq(intent.getBalance(), 0);
        assertEq(token.balanceOf(payer), token.balanceOf(payer));
    }

    function testUpdateMerchant() public {
        address newMerchant = address(0x6);
        
        vm.expectEmit(true, false, false, true);
        emit MerchantUpdated(newMerchant, true);
        
        vm.prank(payer);
        intent.updateMerchant(newMerchant, true);
        
        assertTrue(intent.isMerchantAllowed(newMerchant));
        
        // Remove merchant
        vm.expectEmit(true, false, false, true);
        emit MerchantUpdated(newMerchant, false);
        
        vm.prank(payer);
        intent.updateMerchant(newMerchant, false);
        
        assertFalse(intent.isMerchantAllowed(newMerchant));
    }

    function testInsufficientBalance() public {
        // Withdraw all funds first
        vm.prank(payer);
        intent.revoke("test");
        
        vm.prank(payer);
        intent.withdrawRemainder(payer);
        
        // Create new intent with no funds
        vm.startPrank(payer);
        address[] memory merchants = new address[](1);
        merchants[0] = merchant1;
        
        IPaymentIntentFactory.CreateParams memory params = IPaymentIntentFactory.CreateParams({
            token: address(token),
            agent: agent,
            totalCap: TOTAL_CAP,
            perTxCap: PER_TX_CAP,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 7 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTest2",
            salt: keccak256("test-intent-2")
        });
        
        address intentAddr2 = factory.createIntent(params);
        PaymentIntent intent2 = PaymentIntent(intentAddr2);
        vm.stopPrank();
        
        vm.prank(agent);
        vm.expectRevert("PaymentIntent: insufficient balance");
        intent2.execute(merchant1, 1e6, keccak256("test"), "uri");
    }

    function testPauseUnpause() public {
        // Pause
        vm.prank(payer);
        intent.pause();
        
        // Should not allow execution when paused
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        intent.execute(merchant1, 50e6, keccak256("test"), "uri");
        
        // Unpause
        vm.prank(payer);
        intent.unpause();
        
        // Should allow execution after unpause
        vm.prank(agent);
        intent.execute(merchant1, 50e6, keccak256("test"), "uri");
    }

    function testFuzzExecution(uint256 amount) public {
        amount = bound(amount, 1e6, PER_TX_CAP); // Bound between 1 USDC and per-tx cap
        vm.assume(intent.getBalance() >= amount);
        vm.assume(intent.limits().spent + amount <= TOTAL_CAP);
        
        uint256 initialBalance = intent.getBalance();
        uint256 initialSpent = intent.limits().spent;
        
        vm.prank(agent);
        intent.execute(merchant1, amount, keccak256("fuzz-test"), "uri");
        
        assertEq(intent.getBalance(), initialBalance - amount);
        assertEq(intent.limits().spent, initialSpent + amount);
    }
}