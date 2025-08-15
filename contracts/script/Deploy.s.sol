// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../PaymentIntentFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy USDC mock (for testnet only)
        address usdcAddress = 0x4fCF1784B31630811181f670Aea7A7bEF803eaED;
        
        // Deploy PaymentIntentFactory
        PaymentIntentFactory factory = new PaymentIntentFactory();
        
        console.log("PaymentIntentFactory deployed at:", address(factory));
        console.log("USDC address:", usdcAddress);
        
        vm.stopBroadcast();
    }
}