// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/PaymentIntentFactory.sol";
import "../contracts/AgentMarketplace.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOYER");
        address deployer = vm.addr(deployerPrivateKey);
        
        // USDC address on Sei testnet
        address usdcAddress = 0x4fCF1784B31630811181f670Aea7A7bEF803eaED;
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy PaymentIntentFactory
        PaymentIntentFactory factory = new PaymentIntentFactory();
        
        // Deploy AgentMarketplace
        AgentMarketplace marketplace = new AgentMarketplace(usdcAddress, deployer);
        
        vm.stopBroadcast();
        
        console.log("PaymentIntentFactory deployed at:", address(factory));
        console.log("Implementation deployed at:", factory.getImplementation());
        console.log("AgentMarketplace deployed at:", address(marketplace));
        console.log("USDC address configured:", usdcAddress);
        
        // Save addresses to environment file
        string memory addressesContent = string.concat(
            "FACTORY_ADDRESS=", vm.toString(address(factory)), "\n",
            "IMPLEMENTATION_ADDRESS=", vm.toString(factory.getImplementation()), "\n",
            "MARKETPLACE_ADDRESS=", vm.toString(address(marketplace)), "\n",
            "USDC_ADDRESS=", vm.toString(usdcAddress), "\n"
        );
        
        vm.writeFile("deployed-addresses.env", addressesContent);
        
        console.log("Deployment addresses saved to deployed-addresses.env");
    }
}