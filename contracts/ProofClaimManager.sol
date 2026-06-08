// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofClaimManager
 * @notice Manages weekly $PROOF token claims for Proof of Alpha participants.
 * The owner (admin wallet) calls setClaimable() each Sunday after the
 * backend settlement cron runs. Users then call claim() to receive
 * their $PROOF tokens from this contract.
 *
 * Deploy on Celo Mainnet via Remix:
 * 1. Set proofToken_ = 0xd2a88b9d9f14952b2e79b01b9e26c6a15efc7336
 * 2. Fund the contract via fundContract() before the first claim window opens.
 *
 * @dev Single-owner, no multisig. No upgradability - intentionally simple.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract ProofClaimManager {
    // State

    /// @notice The $PROOF ERC20 token address on Celo Mainnet.
    address public immutable proofToken;

    /// @notice Contract owner.
    address public owner;

    /// @notice Claimable balances per wallet.
    mapping(address => uint256) public claimableAmount;

    // Events

    event ClaimableSet(address indexed wallet, uint256 amount);

    event Claimed(address indexed wallet, uint256 amount);

    event ContractFunded(address indexed funder, uint256 amount);

    event UnclaimedWithdrawn(address indexed to, uint256 amount);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Modifiers

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "ProofClaimManager: caller is not the owner"
        );
        _;
    }

    // Constructor

    constructor(address proofToken_) {
        require(
            proofToken_ != address(0),
            "ProofClaimManager: zero token address"
        );

        proofToken = proofToken_;
        owner = msg.sender;

        emit OwnershipTransferred(address(0), msg.sender);
    }

    // Owner functions

    function setClaimable(
        address[] calldata wallets,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(
            wallets.length == amounts.length,
            "ProofClaimManager: array length mismatch"
        );

        for (uint256 i = 0; i < wallets.length; i++) {
            require(
                wallets[i] != address(0),
                "ProofClaimManager: zero wallet address"
            );

            claimableAmount[wallets[i]] = amounts[i];

            emit ClaimableSet(wallets[i], amounts[i]);
        }
    }

    function fundContract(uint256 amount) external onlyOwner {
        require(amount > 0, "ProofClaimManager: amount must be > 0");

        bool ok = IERC20(proofToken).transferFrom(
            msg.sender,
            address(this),
            amount
        );

        require(ok, "ProofClaimManager: transferFrom failed");

        emit ContractFunded(msg.sender, amount);
    }

    function withdrawUnclaimed(uint256 amount) external onlyOwner {
        require(amount > 0, "ProofClaimManager: amount must be > 0");

        require(
            IERC20(proofToken).balanceOf(address(this)) >= amount,
            "ProofClaimManager: insufficient contract balance"
        );

        bool ok = IERC20(proofToken).transfer(owner, amount);

        require(ok, "ProofClaimManager: transfer failed");

        emit UnclaimedWithdrawn(owner, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(
            newOwner != address(0),
            "ProofClaimManager: zero address"
        );

        emit OwnershipTransferred(owner, newOwner);

        owner = newOwner;
    }

    // User functions

    function claim() external {
        uint256 amount = claimableAmount[msg.sender];

        require(amount > 0, "ProofClaimManager: nothing to claim");

        // Reset before transfer to protect against reentrancy
        claimableAmount[msg.sender] = 0;

        require(
            IERC20(proofToken).balanceOf(address(this)) >= amount,
            "ProofClaimManager: contract underfunded - contact admin"
        );

        bool ok = IERC20(proofToken).transfer(msg.sender, amount);

        require(ok, "ProofClaimManager: transfer failed");

        emit Claimed(msg.sender, amount);
    }

    // View helpers

    function contractBalance() external view returns (uint256) {
        return IERC20(proofToken).balanceOf(address(this));
    }

    function getClaimable(
        address wallet
    ) external view returns (uint256) {
        return claimableAmount[wallet];
    }
}
