// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AgentMarketplace is Ownable, ReentrancyGuard {
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

    mapping(address => Agent) public agents;
    mapping(address => AgentUsage[]) public agentUsageHistory;
    mapping(address => mapping(address => bool)) public userHasRated;
    mapping(address => AgentStats) public agentStats;
    
    address[] public agentAddresses;
    IERC20 public immutable usdcToken;
    
    uint256 public platformFeePercent = 500; // 5%
    uint256 public constant MAX_FEE = 1000; // 10%
    
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

    constructor(address _usdcToken, address _initialOwner) Ownable(_initialOwner) {
        usdcToken = IERC20(_usdcToken);
    }

    function registerAgent(
        address _agentAddress,
        string calldata _name,
        string calldata _description,
        string calldata _apiEndpoint,
        string calldata _logoUri,
        uint256 _pricePerUse,
        string[] calldata _capabilities,
        string calldata _metadataUri
    ) external {
        require(_agentAddress != address(0), "Invalid agent address");
        require(bytes(_name).length > 0, "Name required");
        require(agents[_agentAddress].owner == address(0), "Agent already registered");
        
        agents[_agentAddress] = Agent({
            owner: msg.sender,
            name: _name,
            description: _description,
            apiEndpoint: _apiEndpoint,
            logoUri: _logoUri,
            pricePerUse: _pricePerUse,
            totalUses: 0,
            rating: 0,
            totalRatings: 0,
            isActive: true,
            createdAt: block.timestamp,
            capabilities: _capabilities,
            metadataUri: _metadataUri
        });
        
        agentAddresses.push(_agentAddress);
        
        emit AgentRegistered(_agentAddress, msg.sender, _name, _pricePerUse);
    }

    function useAgent(
        address _agentAddress,
        string calldata _transactionHash
    ) external nonReentrant {
        Agent storage agent = agents[_agentAddress];
        require(agent.owner != address(0), "Agent not found");
        require(agent.isActive, "Agent not active");
        
        uint256 totalFee = agent.pricePerUse;
        uint256 platformFee = (totalFee * platformFeePercent) / 10000;
        uint256 agentFee = totalFee - platformFee;
        
        require(
            usdcToken.transferFrom(msg.sender, agent.owner, agentFee),
            "Payment to agent failed"
        );
        
        if (platformFee > 0) {
            require(
                usdcToken.transferFrom(msg.sender, owner(), platformFee),
                "Platform fee transfer failed"
            );
        }
        
        agent.totalUses++;
        agentStats[_agentAddress].totalEarned += agentFee;
        agentStats[_agentAddress].monthlyUses++; // Simplified, could track monthly
        
        agentUsageHistory[_agentAddress].push(AgentUsage({
            user: msg.sender,
            agent: _agentAddress,
            timestamp: block.timestamp,
            amountPaid: totalFee,
            transactionHash: _transactionHash,
            rating: 0,
            review: ""
        }));
        
        emit AgentUsed(_agentAddress, msg.sender, totalFee, _transactionHash);
    }

    function rateAgent(
        address _agentAddress,
        uint8 _rating,
        string calldata _review
    ) external {
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        require(!userHasRated[msg.sender][_agentAddress], "Already rated");
        
        Agent storage agent = agents[_agentAddress];
        require(agent.owner != address(0), "Agent not found");
        
        // Check if user has used this agent
        bool hasUsedAgent = false;
        AgentUsage[] storage usages = agentUsageHistory[_agentAddress];
        for (uint i = 0; i < usages.length; i++) {
            if (usages[i].user == msg.sender) {
                hasUsedAgent = true;
                // Update the usage record with rating
                if (usages[i].rating == 0) {
                    usages[i].rating = _rating;
                    usages[i].review = _review;
                    break;
                }
            }
        }
        
        require(hasUsedAgent, "Must use agent before rating");
        
        // Update agent rating
        uint256 newTotalRating = (agent.rating * agent.totalRatings) + _rating;
        agent.totalRatings++;
        agent.rating = newTotalRating / agent.totalRatings;
        
        // Update stats
        agentStats[_agentAddress].averageRating = agent.rating;
        agentStats[_agentAddress].totalRatings = agent.totalRatings;
        
        userHasRated[msg.sender][_agentAddress] = true;
        
        emit AgentRated(_agentAddress, msg.sender, _rating, _review);
    }

    function updateAgent(
        address _agentAddress,
        string calldata _name,
        string calldata _description,
        string calldata _apiEndpoint,
        string calldata _logoUri,
        uint256 _pricePerUse,
        string[] calldata _capabilities,
        string calldata _metadataUri
    ) external {
        Agent storage agent = agents[_agentAddress];
        require(agent.owner == msg.sender, "Not agent owner");
        
        agent.name = _name;
        agent.description = _description;
        agent.apiEndpoint = _apiEndpoint;
        agent.logoUri = _logoUri;
        agent.pricePerUse = _pricePerUse;
        agent.capabilities = _capabilities;
        agent.metadataUri = _metadataUri;
        
        emit AgentUpdated(_agentAddress, _name, _pricePerUse);
    }

    function toggleAgentActive(address _agentAddress) external {
        Agent storage agent = agents[_agentAddress];
        require(agent.owner == msg.sender, "Not agent owner");
        agent.isActive = !agent.isActive;
    }

    function getAgent(address _agentAddress) external view returns (Agent memory) {
        return agents[_agentAddress];
    }

    function getAgentCapabilities(address _agentAddress) external view returns (string[] memory) {
        return agents[_agentAddress].capabilities;
    }

    function getAgentUsageHistory(address _agentAddress) external view returns (AgentUsage[] memory) {
        return agentUsageHistory[_agentAddress];
    }

    function getAgentStats(address _agentAddress) external view returns (AgentStats memory) {
        return agentStats[_agentAddress];
    }

    function getAllAgents() external view returns (address[] memory) {
        return agentAddresses;
    }

    function getActiveAgents() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].isActive) {
                activeCount++;
            }
        }
        
        address[] memory activeAgents = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].isActive) {
                activeAgents[index] = agentAddresses[i];
                index++;
            }
        }
        
        return activeAgents;
    }

    function getAgentsByOwner(address _owner) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].owner == _owner) {
                count++;
            }
        }
        
        address[] memory ownerAgents = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < agentAddresses.length; i++) {
            if (agents[agentAddresses[i]].owner == _owner) {
                ownerAgents[index] = agentAddresses[i];
                index++;
            }
        }
        
        return ownerAgents;
    }

    // Admin functions
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_FEE, "Fee too high");
        platformFeePercent = _feePercent;
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(usdcToken.transfer(owner(), balance), "Withdraw failed");
    }
}