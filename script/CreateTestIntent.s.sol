// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/PaymentIntentFactory.sol";
import "../contracts/interfaces/IPaymentIntentFactory.sol";

contract CreateTestIntent is Script {
    function run() external {
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        uint256 payerPrivateKey = vm.envUint("PRIVATE_KEY_PAYER");
        address agentAddress = vm.envAddress("PRIVATE_KEY_AGENT"); // Will be derived from private key
        
        PaymentIntentFactory factory = PaymentIntentFactory(factoryAddress);
        
        vm.startBroadcast(payerPrivateKey);
        
        address[] memory merchants = new address[](2);
        merchants[0] = 0x1234567890123456789012345678901234567890; // Example merchant 1
        merchants[1] = 0x0987654321098765432109876543210987654321; // Example merchant 2
        
        IPaymentIntentFactory.CreateParams memory params = IPaymentIntentFactory.CreateParams({
            token: usdcAddress,
            agent: agentAddress,
            totalCap: 1000e6, // 1000 USDC
            perTxCap: 100e6,   // 100 USDC
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 7 days),
            merchants: merchants,
            metadataURI: "ipfs://QmTestIntent",
            salt: keccak256("test-hackathon-intent")
        });
        
        address intentAddress = factory.createIntent(params);
        
        vm.stopBroadcast();
        
        console.log("Test PaymentIntent created at:", intentAddress);
        
        // Save the intent address
        string memory intentContent = string.concat(
            "TEST_INTENT_ADDRESS=", vm.toString(intentAddress), "\n"
        );
        
        vm.writeFile("test-intent.env", intentContent);
        
        console.log("Test intent address saved to test-intent.env");
    }
}