// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../contracts/PaymentIntentFactory.sol";
import "../contracts/PaymentIntent.sol";
import "./mocks/MockERC20.sol";

contract PaymentIntentFactoryTest is Test {
    PaymentIntentFactory public factory;
    MockERC20 public token;
    
    address public payer1 = address(0x1);
    address public payer2 = address(0x2);
    address public agent1 = address(0x3);
    address public agent2 = address(0x4);
    address public merchant = address(0x5);
    
    event IntentCreated(
        address indexed payer,
        address indexed intent,
        address indexed agent,
        bytes32 salt
    );

    function setUp() public {
        factory = new PaymentIntentFactory();
        token = new MockERC20("Mock USDC", "USDC", 6, 1000000e6);
        
        // Give some tokens to payers
        token.transfer(payer1, 10000e6);
        token.transfer(payer2, 10000e6);
    }

    function testFactoryInitialization() public view {
        assertTrue(factory.getImplementation() != address(0));
        assertEq(factory.totalIntents(), 0);
    }

    function testCreateIntent() public {
        address[] memory merchants = new address[](1);
        merchants[0] = merchant;
        
        IPaymentIntentFactory.CreateParams memory params = IPaymentIntentFactory.CreateParams({
            token: address(token),
            agent: agent1,
            totalCap: 1000e6,
            perTxCap: 100e6,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 7 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTest",
            salt: keccak256("test-salt")
        });
        
        vm.expectEmit(true, false, true, false);
        emit IntentCreated(payer1, address(0), agent1, bytes32(0));
        
        vm.prank(payer1);
        address intentAddr = factory.createIntent(params);
        
        assertTrue(intentAddr != address(0));
        assertEq(factory.totalIntents(), 1);
        
        PaymentIntent intent = PaymentIntent(intentAddr);
        assertEq(intent.payer(), payer1);
        assertEq(intent.agent(), agent1);
        assertEq(intent.token(), address(token));
        assertTrue(intent.isMerchantAllowed(merchant));
    }

    function testCreateMultipleIntents() public {
        address[] memory merchants = new address[](0);
        
        // Create intent for payer1
        IPaymentIntentFactory.CreateParams memory params1 = IPaymentIntentFactory.CreateParams({
            token: address(token),
            agent: agent1,
            totalCap: 1000e6,
            perTxCap: 100e6,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 7 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTest1",
            salt: keccak256("salt-1")
        });
        
        vm.prank(payer1);
        address intent1 = factory.createIntent(params1);
        
        // Create intent for payer2
        IPaymentIntentFactory.CreateParams memory params2 = IPaymentIntentFactory.CreateParams({
            token: address(token),
            agent: agent2,
            totalCap: 500e6,
            perTxCap: 50e6,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 3 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTest2",
            salt: keccak256("salt-2")
        });
        
        vm.prank(payer2);
        address intent2 = factory.createIntent(params2);
        
        assertEq(factory.totalIntents(), 2);
        assertTrue(intent1 != intent2);
        
        // Check payer intents
        address[] memory payer1Intents = factory.getPayerIntents(payer1);
        assertEq(payer1Intents.length, 1);
        assertEq(payer1Intents[0], intent1);
        
        address[] memory payer2Intents = factory.getPayerIntents(payer2);
        assertEq(payer2Intents.length, 1);
        assertEq(payer2Intents[0], intent2);
        
        // Check agent intents
        address[] memory agent1Intents = factory.getAgentIntents(agent1);
        assertEq(agent1Intents.length, 1);
        assertEq(agent1Intents[0], intent1);
        
        address[] memory agent2Intents = factory.getAgentIntents(agent2);
        assertEq(agent2Intents.length, 1);
        assertEq(agent2Intents[0], intent2);
    }

    function testCreateIntentValidation() public {
        address[] memory merchants = new address[](0);
        
        // Test invalid token
        IPaymentIntentFactory.CreateParams memory params = IPaymentIntentFactory.CreateParams({
            token: address(0),
            agent: agent1,
            totalCap: 1000e6,
            perTxCap: 100e6,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 7 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTest",
            salt: keccak256("test-salt")
        });
        
        vm.prank(payer1);
        vm.expectRevert("Factory: invalid token");
        factory.createIntent(params);
        
        // Test invalid agent
        params.token = address(token);
        params.agent = address(0);
        
        vm.prank(payer1);
        vm.expectRevert("Factory: invalid agent");
        factory.createIntent(params);
        
        // Test invalid caps
        params.agent = agent1;
        params.totalCap = 0;
        
        vm.prank(payer1);
        vm.expectRevert("Factory: invalid total cap");
        factory.createIntent(params);
        
        // Test per tx cap greater than total cap
        params.totalCap = 100e6;
        params.perTxCap = 200e6;
        
        vm.prank(payer1);
        vm.expectRevert("Factory: invalid per tx cap");
        factory.createIntent(params);
        
        // Test invalid time range
        params.perTxCap = 50e6;
        params.start = uint64(block.timestamp + 7 days);
        params.end = uint64(block.timestamp + 1 days);
        
        vm.prank(payer1);
        vm.expectRevert("Factory: invalid time range");
        factory.createIntent(params);
        
        // Test end time in past
        vm.warp(1000); // Set a reasonable timestamp
        params.start = uint64(block.timestamp);
        params.end = uint64(block.timestamp - 1);
        
        vm.prank(payer1);
        vm.expectRevert("Factory: end time in past");
        factory.createIntent(params);
    }

    function testGetIntentsPagination() public {
        address[] memory merchants = new address[](0);
        
        // Create multiple intents for payer1
        vm.startPrank(payer1);
        for (uint256 i = 0; i < 5; i++) {
            IPaymentIntentFactory.CreateParams memory params = IPaymentIntentFactory.CreateParams({
                token: address(token),
                agent: agent1,
                totalCap: 1000e6,
                perTxCap: 100e6,
                start: uint64(block.timestamp),
                end: uint64(block.timestamp + 7 days),
                merchants: merchants,
                metadataURI: string(abi.encodePacked("ipfs://QmTest", vm.toString(i))),
                salt: keccak256(abi.encodePacked("salt", i))
            });
            factory.createIntent(params);
        }
        vm.stopPrank();
        
        // Test pagination
        address[] memory page1 = factory.getAllIntentsForPayer(payer1, 0, 2);
        assertEq(page1.length, 2);
        
        address[] memory page2 = factory.getAllIntentsForPayer(payer1, 2, 2);
        assertEq(page2.length, 2);
        
        address[] memory page3 = factory.getAllIntentsForPayer(payer1, 4, 2);
        assertEq(page3.length, 1);
        
        // Test out of bounds
        address[] memory emptyPage = factory.getAllIntentsForPayer(payer1, 10, 2);
        assertEq(emptyPage.length, 0);
        
        // Verify all intents are different
        address[] memory allIntents = factory.getPayerIntents(payer1);
        for (uint256 i = 0; i < allIntents.length; i++) {
            for (uint256 j = i + 1; j < allIntents.length; j++) {
                assertTrue(allIntents[i] != allIntents[j]);
            }
        }
    }

    function testMultiplePayersAndAgents() public {
        address[] memory merchants = new address[](1);
        merchants[0] = merchant;
        
        // payer1 creates intent with agent1
        vm.prank(payer1);
        address intent1 = factory.createIntent(IPaymentIntentFactory.CreateParams({
            token: address(token),
            agent: agent1,
            totalCap: 1000e6,
            perTxCap: 100e6,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 7 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTest1",
            salt: keccak256("salt-1")
        }));
        
        // payer1 creates another intent with agent2
        vm.prank(payer1);
        address intent2 = factory.createIntent(IPaymentIntentFactory.CreateParams({
            token: address(token),
            agent: agent2,
            totalCap: 2000e6,
            perTxCap: 200e6,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 14 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTest2",
            salt: keccak256("salt-2")
        }));
        
        // payer2 creates intent with agent1
        vm.prank(payer2);
        address intent3 = factory.createIntent(IPaymentIntentFactory.CreateParams({
            token: address(token),
            agent: agent1,
            totalCap: 500e6,
            perTxCap: 50e6,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 3 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTest3",
            salt: keccak256("salt-3")
        }));
        
        // Verify counts
        assertEq(factory.getPayerIntentCount(payer1), 2);
        assertEq(factory.getPayerIntentCount(payer2), 1);
        assertEq(factory.getAgentIntentCount(agent1), 2);
        assertEq(factory.getAgentIntentCount(agent2), 1);
        
        // Verify intent mappings
        address[] memory payer1Intents = factory.getPayerIntents(payer1);
        assertEq(payer1Intents[0], intent1);
        assertEq(payer1Intents[1], intent2);
        
        address[] memory agent1Intents = factory.getAgentIntents(agent1);
        assertEq(agent1Intents[0], intent1);
        assertEq(agent1Intents[1], intent3);
        
        assertEq(factory.totalIntents(), 3);
    }
}