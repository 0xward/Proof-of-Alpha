// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  ProofClaimManager
 * @notice Manages weekly $PROOF token claims for Proof of Alpha participants.
 *         The owner (admin wallet) calls setClaimable() each Sunday after the
 *         backend settlement cron runs.  Users then call claim() to receive
 *         their $PROOF tokens from this contract.
 *
 * Deploy on Celo Mainnet via Remix:
 *   1. Set proofToken_ = 0xd2a88b9d9f14952b2e79b01b9e26c6a15efc7336
 *   2. Fund the contract via fundContract() before the first claim window opens.
 *
 * @dev    Single-owner, no multisig.  No upgradability — intentionally simple.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract ProofClaimManager {
    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice The $PROOF ERC-20 token address on Celo Mainnet.
    address public immutable proofToken;

    /// @notice Contract owner — the admin wallet that signs backend transactions.
    address public owner;

    /// @notice Maps a user wallet to the amount of $PROOF they can currently claim.
    ///         Set weekly by the owner.  Reset to 0 after the user claims.
    mapping(address => uint256) public claimableAmount;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a batch of claimable amounts is written by the owner.
    event ClaimableSet(address indexed wallet, uint256 amount);

    /// @notice Emitted when a user successfully claims their $PROOF.
    event Claimed(address indexed wallet, uint256 amount);

    /// @notice Emitted when the owner funds the contract.
    event ContractFunded(address indexed funder, uint256 amount);

    /// @notice Emitted when the owner drains unclaimed tokens.
    event UnclaimedWithdrawn(address indexed to, uint256 amount);

    /// @notice Emitted when ownership is transferred.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "ProofClaimManager: caller is not the owner");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param proofToken_ Address of the $PROOF ERC-20 token on Celo Mainnet.
     *                    Must be non-zero.
     */
    constructor(address proofToken_) {
        require(proofToken_ != address(0), "ProofClaimManager: zero token address");
        proofToken = proofToken_;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ─── Owner functions ─────────────────────────────────────────────────────

    /**
     * @notice Batch-set claimable amounts for a list of wallets.
     *         Called every Sunday by the backend weekly settle cron.
     *         Overwrites any existing pending amount — the backend is responsible
     *         for accumulating across weeks before calling this.
     *
     * @param wallets  Array of user wallet addresses.
     * @param amounts  Parallel array of $PROOF amounts (in wei, 18 decimals).
     *
     * @dev   Emits ClaimableSet for each wallet.  Arrays must be equal length.
     */
    function setClaimable(
        address[] calldata wallets,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(
            wallets.length == amounts.length,
            "ProofClaimManager: array length mismatch"
        );
        for (uint256 i = 0; i < wallets.length; i++) {
            require(wallets[i] != address(0), "ProofClaimManager: zero wallet address");
            claimableAmount[wallets[i]] = amounts[i];
            emit ClaimableSet(wallets[i], amounts[i]);
        }
    }

    /**
     * @notice Transfer $PROOF tokens into this contract so claims can be paid out.
     *         The owner must have approved this contract to spend at least `amount`
     *         from their $PROOF balance before calling.
     *
     * @param amount Amount of $PROOF (in wei) to pull from the owner's wallet.
     */
    function fundContract(uint256 amount) external onlyOwner {
        require(amount > 0, "ProofClaimManager: amount must be > 0");
        bool ok = IERC20(proofToken).transferFrom(msg.sender, address(this), amount);
        require(ok, "ProofClaimManager: transferFrom failed");
        emit ContractFunded(msg.sender, amount);
    }

    /**
     * @notice Safety drain — withdraw unclaimed $PROOF back to the owner's wallet.
     *         Use this if the contract needs to be redeployed or a migration is needed.
     *
     * @param amount Amount of $PROOF (in wei) to withdraw.
     */
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

    /**
     * @notice Transfer ownership to a new admin wallet.
     *         Use with care — the new owner can set claimable amounts and drain funds.
     *
     * @param newOwner Address of the new owner.  Must be non-zero.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ProofClaimManager: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── User functions ───────────────────────────────────────────────────────

    /**
     * @notice Claim all pending $PROOF tokens for the calling wallet.
     *         Transfers the full claimableAmount[msg.sender] to the caller,
     *         then resets it to 0 to prevent double-claiming.
     *
     * @dev    Reverts if the user has nothing to claim or if the contract
     *         has insufficient balance (owner should fund before Sunday claim window).
     */
    function claim() external {
        uint256 amount = claimableAmount[msg.sender];
        require(amount > 0, "ProofClaimManager: nothing to claim");

        // Reset before transfer to protect against reentrancy
        claimableAmount[msg.sender] = 0;

        require(
            IERC20(proofToken).balanceOf(address(this)) >= amount,
            "ProofClaimManager: contract underfunded — contact admin"
        );

        bool ok = IERC20(proofToken).transfer(msg.sender, amount);
        require(ok, "ProofClaimManager: transfer failed");

        emit Claimed(msg.sender, amount);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Returns the $PROOF balance held by this contract.
     *         Useful for the admin to verify sufficient funds before opening claims.
     */
    function contractBalance() external view returns (uint256) {
        return IERC20(proofToken).balanceOf(address(this));
    }

    /**
     * @notice Returns the claimable $PROOF amount for a given wallet.
     * @param wallet The user's wallet address.
     */
    function getClaimable(address wallet) external view returns (uint256) {
        return claimableAmount[wallet];
    }
}
