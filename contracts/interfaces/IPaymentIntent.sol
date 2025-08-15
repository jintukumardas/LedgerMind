// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IPaymentIntent {
    enum State { Active, Revoked, Expired }

    struct Limits {
        uint256 totalCap;     // max total spend
        uint256 perTxCap;     // max per payment
        uint256 spent;        // total spent so far
        uint64  start;        // unix seconds (inclusive)
        uint64  end;          // unix seconds (exclusive)
    }

    event Executed(
        address indexed agent,
        address indexed merchant,
        address indexed token,
        uint256 amount,
        bytes32 receiptHash,      // keccak256 of off-chain MCP context blob
        string  receiptURI        // optional ipfs://... or https://...
    );

    event Revoked(address indexed by, string reason);
    event MerchantUpdated(address indexed merchant, bool allowed);
    event ToppedUp(uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    function execute(
        address merchant,
        uint256 amount,
        bytes32 receiptHash,
        string calldata receiptURI
    ) external;

    function revoke(string calldata reason) external;
    function topUp(uint256 amount) external;
    function withdrawRemainder(address to) external;
    function updateMerchant(address merchant, bool allowed) external;

    function state() external view returns (State);
    function payer() external view returns (address);
    function agent() external view returns (address);
    function token() external view returns (address);
    function limits() external view returns (Limits memory);
    function isMerchantAllowed(address merchant) external view returns (bool);
    function getBalance() external view returns (uint256);
}