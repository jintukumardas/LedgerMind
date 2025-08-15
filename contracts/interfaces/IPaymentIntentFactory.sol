// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IPaymentIntentFactory {
    event IntentCreated(
        address indexed payer, 
        address indexed intent, 
        address indexed agent,
        bytes32 salt
    );

    struct CreateParams {
        address token;             // e.g., USDC on Sei
        address agent;             // agent key allowed to spend
        uint256 totalCap;
        uint256 perTxCap;
        uint64  start;
        uint64  end;
        address[] merchants;       // allowlist (optional)
        string  metadataURI;       // JSON: purpose, notes, category tags
        bytes32 salt;              // for CREATE2 predictability
    }

    function createIntent(CreateParams calldata params) external returns (address intent);
    function predictIntent(address payer, bytes32 salt) external view returns (address);
    function getImplementation() external view returns (address);
}