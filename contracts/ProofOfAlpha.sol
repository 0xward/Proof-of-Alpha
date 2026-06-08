// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofOfAlpha_SBT
 * @author ward.eth
 * @notice Autonomous Soulbound Token (SBT) factory for the Proof of Alpha AI Agent.
 */
contract ProofOfAlpha {
    string public name = "Proof of Alpha";
    string public symbol = "PoA";
    
    address public admin;
    address public minter;
    uint256 private _nextTokenId;
    bool public paused;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    error SoulboundRestriction();
    error NotAdmin();
    error NotMinter();
    error ContractPaused();
    error NonExistentToken();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    constructor(
        address _minter, 
        string memory tier1Uri, 
        string memory tier2Uri, 
        string memory tier3Uri
    ) {
        admin = msg.sender;
        minter = _minter;

        // Genesis Mint for the deployer to lock in metadata URIs
        _internalMint(msg.sender, tier1Uri);
        _internalMint(msg.sender, tier2Uri);
        _internalMint(msg.sender, tier3Uri);
    }

    function safeMint(address to, string calldata uri) external onlyMinter {
        if (paused) revert ContractPaused();
        _internalMint(to, uri);
    }

    function _internalMint(address to, string memory uri) internal {
        uint256 tokenId = _nextTokenId++;
        _balances[to] += 1;
        _owners[tokenId] = to;
        _tokenURIs[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
    }

    // --- Soulbound Logic (Anti-Transfer Wall) ---
    function transferFrom(address, address, uint256) external pure {
        revert SoulboundRestriction();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert SoulboundRestriction();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert SoulboundRestriction();
    }

    // --- View Functions ---
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NonExistentToken();
        return _tokenURIs[tokenId];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        if (owner == address(0)) revert NonExistentToken();
        return owner;
    }

    function balanceOf(address owner) public view returns (uint256) {
        return _balances[owner];
    }

    // --- Admin Ops ---
    function setMinter(address _newMinter) external onlyAdmin {
        minter = _newMinter;
    }

    function setPaused(bool _state) external onlyAdmin {
        paused = _state;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }
}
