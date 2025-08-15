// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../contracts/PaymentIntentFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOYER");
        
        vm.startBroadcast(deployerPrivateKey);
        
        PaymentIntentFactory factory = new PaymentIntentFactory();
        
        vm.stopBroadcast();
        
        console.log("PaymentIntentFactory deployed at:", address(factory));
        console.log("Implementation deployed at:", factory.getImplementation());
        
        // Save addresses to environment file
        string memory addressesContent = string.concat(
            "FACTORY_ADDRESS=", vm.toString(address(factory)), "\n",
            "IMPLEMENTATION_ADDRESS=", vm.toString(factory.getImplementation()), "\n"
        );
        
        vm.writeFile("deployed-addresses.env", addressesContent);
        
        console.log("Deployment addresses saved to deployed-addresses.env");
    }
}