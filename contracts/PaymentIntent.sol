// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IPaymentIntent.sol";

contract PaymentIntent is IPaymentIntent, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    address public immutable payer;
    address public immutable agent;
    address public immutable token;
    string public metadataURI;
    
    Limits private _limits;
    State public currentState;
    
    mapping(address => bool) public allowedMerchants;
    bool public hasRestrictedMerchants;

    modifier onlyPayer() {
        require(msg.sender == payer, "PaymentIntent: not payer");
        _;
    }

    modifier onlyPayerOrAgent() {
        require(msg.sender == payer || msg.sender == agent, "PaymentIntent: not authorized");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "PaymentIntent: not agent");
        _;
    }

    modifier onlyActive() {
        require(state() == State.Active, "PaymentIntent: not active");
        _;
    }

    constructor(
        address _payer,
        address _agent,
        address _token,
        uint256 _totalCap,
        uint256 _perTxCap,
        uint64 _start,
        uint64 _end,
        address[] memory _merchants,
        string memory _metadataURI
    ) {
        require(_payer != address(0), "PaymentIntent: invalid payer");
        require(_agent != address(0), "PaymentIntent: invalid agent");
        require(_token != address(0), "PaymentIntent: invalid token");
        require(_totalCap > 0, "PaymentIntent: invalid total cap");
        require(_perTxCap > 0 && _perTxCap <= _totalCap, "PaymentIntent: invalid per tx cap");
        require(_start < _end, "PaymentIntent: invalid time range");
        require(_end > block.timestamp, "PaymentIntent: end time in past");

        payer = _payer;
        agent = _agent;
        token = _token;
        metadataURI = _metadataURI;
        
        _limits = Limits({
            totalCap: _totalCap,
            perTxCap: _perTxCap,
            spent: 0,
            start: _start,
            end: _end
        });
        
        currentState = State.Active;

        if (_merchants.length > 0) {
            hasRestrictedMerchants = true;
            for (uint256 i = 0; i < _merchants.length; i++) {
                require(_merchants[i] != address(0), "PaymentIntent: invalid merchant");
                allowedMerchants[_merchants[i]] = true;
                emit MerchantUpdated(_merchants[i], true);
            }
        }
    }

    function execute(
        address merchant,
        uint256 amount,
        bytes32 receiptHash,
        string calldata receiptURI
    ) external override onlyAgent onlyActive nonReentrant whenNotPaused {
        require(merchant != address(0), "PaymentIntent: invalid merchant");
        require(amount > 0, "PaymentIntent: invalid amount");
        require(receiptHash != bytes32(0), "PaymentIntent: invalid receipt hash");
        
        // Check time bounds
        require(block.timestamp >= _limits.start, "PaymentIntent: too early");
        require(block.timestamp < _limits.end, "PaymentIntent: too late");
        
        // Check merchant allowlist
        if (hasRestrictedMerchants) {
            require(allowedMerchants[merchant], "PaymentIntent: merchant not allowed");
        }
        
        // Check spending limits
        require(amount <= _limits.perTxCap, "PaymentIntent: exceeds per tx cap");
        require(_limits.spent + amount <= _limits.totalCap, "PaymentIntent: exceeds total cap");
        
        // Check sufficient balance
        require(getBalance() >= amount, "PaymentIntent: insufficient balance");
        
        // Update spent amount before external call
        _limits.spent += amount;
        
        // Execute transfer
        IERC20(token).safeTransfer(merchant, amount);
        
        emit Executed(agent, merchant, token, amount, receiptHash, receiptURI);
    }

    function revoke(string calldata reason) external override onlyPayerOrAgent nonReentrant {
        require(currentState == State.Active, "PaymentIntent: already revoked");
        currentState = State.Revoked;
        emit Revoked(msg.sender, reason);
    }

    function topUp(uint256 amount) external override onlyPayer nonReentrant {
        require(amount > 0, "PaymentIntent: invalid amount");
        require(state() == State.Active, "PaymentIntent: not active");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit ToppedUp(amount);
    }

    function withdrawRemainder(address to) external override onlyPayer nonReentrant {
        require(to != address(0), "PaymentIntent: invalid recipient");
        require(state() != State.Active, "PaymentIntent: still active");
        
        uint256 balance = getBalance();
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
            emit Withdrawn(to, balance);
        }
    }

    function updateMerchant(address merchant, bool allowed) external override onlyPayer {
        require(merchant != address(0), "PaymentIntent: invalid merchant");
        allowedMerchants[merchant] = allowed;
        if (!hasRestrictedMerchants && allowed) {
            hasRestrictedMerchants = true;
        }
        emit MerchantUpdated(merchant, allowed);
    }

    function pause() external onlyPayer {
        _pause();
    }

    function unpause() external onlyPayer {
        _unpause();
    }

    function state() public view override returns (State) {
        if (currentState == State.Revoked) {
            return State.Revoked;
        }
        if (block.timestamp >= _limits.end) {
            return State.Expired;
        }
        return State.Active;
    }

    function isMerchantAllowed(address merchant) external view override returns (bool) {
        if (!hasRestrictedMerchants) {
            return true;
        }
        return allowedMerchants[merchant];
    }

    function getBalance() public view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function limits() external view override returns (Limits memory) {
        return _limits;
    }

    function getRemainingCap() external view returns (uint256) {
        if (_limits.totalCap <= _limits.spent) {
            return 0;
        }
        return _limits.totalCap - _limits.spent;
    }

    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= _limits.end) {
            return 0;
        }
        return _limits.end - block.timestamp;
    }
}