// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MiddlemanVault
 * @dev Holds user funds and allows authorized backend to trigger payouts.
 */
contract MiddlemanVault is Ownable, ReentrancyGuard {
    IERC20 public usdc;
    address public backendWallet;

    event Deposited(address indexed user, uint256 amount);
    event PaidOut(address indexed recipient, uint256 amount);
    event BackendWalletUpdated(address newWallet);

    constructor(address _usdc, address _backendWallet) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        backendWallet = _backendWallet;
    }

    modifier onlyBackend() {
        require(msg.sender == backendWallet || msg.sender == owner(), "Not authorized");
        _;
    }

    function setBackendWallet(address _newWallet) external onlyOwner {
        backendWallet = _newWallet;
        emit BackendWalletUpdated(_newWallet);
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Deposited(msg.sender, amount);
    }

    function payout(address recipient, uint256 amount) external onlyBackend nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient funds in vault");
        require(usdc.transfer(recipient, amount), "Transfer failed");
        emit PaidOut(recipient, amount);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}
