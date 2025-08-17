// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAgentMarketplace {
    struct Agent {
        address owner;
        string name;
        string description;
        string apiEndpoint;
        string logoUri;
        uint256 pricePerUse;
        uint256 totalUses;
        uint256 rating;
        uint256 totalRatings;
        bool isActive;
        uint256 createdAt;
        string[] capabilities;
        string metadataUri;
    }

    struct AgentUsage {
        address user;
        address agent;
        uint256 timestamp;
        uint256 amountPaid;
        string transactionHash;
        uint8 rating;
        string review;
    }

    struct AgentStats {
        uint256 totalEarned;
        uint256 monthlyUses;
        uint256 averageRating;
        uint256 totalRatings;
    }

    event AgentRegistered(
        address indexed agentAddress,
        address indexed owner,
        string name,
        uint256 pricePerUse
    );
    
    event AgentUsed(
        address indexed agentAddress,
        address indexed user,
        uint256 amountPaid,
        string transactionHash
    );
    
    event AgentRated(
        address indexed agentAddress,
        address indexed user,
        uint8 rating,
        string review
    );
    
    event AgentUpdated(
        address indexed agentAddress,
        string name,
        uint256 pricePerUse
    );

    function registerAgent(
        address _agentAddress,
        string calldata _name,
        string calldata _description,
        string calldata _apiEndpoint,
        string calldata _logoUri,
        uint256 _pricePerUse,
        string[] calldata _capabilities,
        string calldata _metadataUri
    ) external;

    function useAgent(
        address _agentAddress,
        string calldata _transactionHash
    ) external;

    function rateAgent(
        address _agentAddress,
        uint8 _rating,
        string calldata _review
    ) external;

    function updateAgent(
        address _agentAddress,
        string calldata _name,
        string calldata _description,
        string calldata _apiEndpoint,
        string calldata _logoUri,
        uint256 _pricePerUse,
        string[] calldata _capabilities,
        string calldata _metadataUri
    ) external;

    function getAgent(address _agentAddress) external view returns (Agent memory);
    function getAgentCapabilities(address _agentAddress) external view returns (string[] memory);
    function getAgentUsageHistory(address _agentAddress) external view returns (AgentUsage[] memory);
    function getAgentStats(address _agentAddress) external view returns (AgentStats memory);
    function getAllAgents() external view returns (address[] memory);
    function getActiveAgents() external view returns (address[] memory);
    function getAgentsByOwner(address _owner) external view returns (address[] memory);
}