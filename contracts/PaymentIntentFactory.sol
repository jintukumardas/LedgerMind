// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPaymentIntentFactory.sol";
import "./PaymentIntent.sol";

contract PaymentIntentFactory is IPaymentIntentFactory, Ownable, ReentrancyGuard {
    address public immutable implementation;
    
    mapping(address => address[]) public payerIntents;
    mapping(address => address[]) public agentIntents;
    
    uint256 public totalIntents;
    
    event ImplementationUpdated(address indexed oldImpl, address indexed newImpl);

    constructor() Ownable(msg.sender) {
        implementation = address(new PaymentIntent(
            address(0x1), // dummy payer
            address(0x2), // dummy agent  
            address(0x3), // dummy token
            1,            // dummy total cap
            1,            // dummy per tx cap
            uint64(block.timestamp),     // dummy start
            uint64(block.timestamp + 1), // dummy end
            new address[](0),            // empty merchants
            ""                           // empty metadata
        ));
    }

    function createIntent(CreateParams calldata params) 
        external 
        override 
        nonReentrant 
        returns (address intent) 
    {
        require(params.token != address(0), "Factory: invalid token");
        require(params.agent != address(0), "Factory: invalid agent");
        require(params.totalCap > 0, "Factory: invalid total cap");
        require(params.perTxCap > 0 && params.perTxCap <= params.totalCap, "Factory: invalid per tx cap");
        require(params.start < params.end, "Factory: invalid time range");
        require(params.end > block.timestamp, "Factory: end time in past");

        bytes32 salt = keccak256(abi.encodePacked(msg.sender, params.salt, block.timestamp));
        
        bytes memory bytecode = abi.encodePacked(
            type(PaymentIntent).creationCode,
            abi.encode(
                msg.sender,        // payer
                params.agent,      // agent
                params.token,      // token
                params.totalCap,   // total cap
                params.perTxCap,   // per tx cap
                params.start,      // start time
                params.end,        // end time
                params.merchants,  // merchants
                params.metadataURI // metadata URI
            )
        );

        intent = Create2.deploy(0, salt, bytecode);
        
        payerIntents[msg.sender].push(intent);
        agentIntents[params.agent].push(intent);
        totalIntents++;

        emit IntentCreated(msg.sender, intent, params.agent, salt);
    }

    function predictIntent(address payer, bytes32 salt) 
        external 
        view 
        override 
        returns (address) 
    {
        bytes32 finalSalt = keccak256(abi.encodePacked(payer, salt, block.timestamp));
        bytes memory bytecode = type(PaymentIntent).creationCode;
        return Create2.computeAddress(finalSalt, keccak256(bytecode));
    }

    function getImplementation() external view override returns (address) {
        return implementation;
    }

    function getPayerIntents(address payer) external view returns (address[] memory) {
        return payerIntents[payer];
    }

    function getAgentIntents(address agent) external view returns (address[] memory) {
        return agentIntents[agent];
    }

    function getPayerIntentCount(address payer) external view returns (uint256) {
        return payerIntents[payer].length;
    }

    function getAgentIntentCount(address agent) external view returns (uint256) {
        return agentIntents[agent].length;
    }

    function getAllIntentsForPayer(
        address payer, 
        uint256 offset, 
        uint256 limit
    ) external view returns (address[] memory intents) {
        address[] storage userIntents = payerIntents[payer];
        uint256 total = userIntents.length;
        
        if (offset >= total) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        intents = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            intents[i - offset] = userIntents[i];
        }
    }

    function getAllIntentsForAgent(
        address agent, 
        uint256 offset, 
        uint256 limit
    ) external view returns (address[] memory intents) {
        address[] storage agentIntentsList = agentIntents[agent];
        uint256 total = agentIntentsList.length;
        
        if (offset >= total) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        intents = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            intents[i - offset] = agentIntentsList[i];
        }
    }
}