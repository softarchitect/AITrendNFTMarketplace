// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title TrendMint721
/// @notice ERC-721 contract with a simple "series/editions" model for marketplace minting pipelines.
/// @dev MVP scope: non-upgradeable, no royalties, tokenURI stored per-token (IPFS JSON recommended).
contract TrendMint721 is ERC721URIStorage, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    error ZeroAddress();
    error SeriesAlreadyExists(uint256 seriesId);
    error SeriesDoesNotExist(uint256 seriesId);
    error InvalidMaxSupply();
    error SeriesMaxSupplyExceeded(uint256 seriesId);
    error ArrayLengthMismatch(uint256 recipientsLength, uint256 tokenUrisLength);

    event SeriesCreated(uint256 indexed seriesId, uint256 maxSupply, string metadataRoot);
    event TokenMinted(
        uint256 indexed tokenId,
        uint256 indexed seriesId,
        uint256 editionNumber,
        address indexed to,
        string tokenURI
    );

    struct Series {
        uint256 maxSupply;
        uint256 mintedCount;
        string metadataRoot;
        bool exists;
    }

    /// @notice Next tokenId to be minted (monotonic).
    uint256 public nextTokenId = 1;

    mapping(uint256 => Series) private _series;

    /// @notice tokenId => seriesId
    mapping(uint256 => uint256) public tokenSeriesId;

    /// @notice tokenId => edition number within the series (1..maxSupply)
    mapping(uint256 => uint256) public tokenEditionNumber;

    constructor(string memory name_, string memory symbol_, address admin_) ERC721(name_, symbol_) {
        if (admin_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    // -------------------------
    // Admin controls
    // -------------------------

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Create a new series/edition group with a max supply and optional metadata root (e.g., `ipfs://CID/`).
    function createSeries(uint256 seriesId, uint256 maxSupply, string calldata metadataRoot)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (_series[seriesId].exists) revert SeriesAlreadyExists(seriesId);
        if (maxSupply == 0) revert InvalidMaxSupply();

        _series[seriesId] = Series({maxSupply: maxSupply, mintedCount: 0, metadataRoot: metadataRoot, exists: true});
        emit SeriesCreated(seriesId, maxSupply, metadataRoot);
    }

    /// @notice Read series information.
    function seriesInfo(uint256 seriesId)
        external
        view
        returns (uint256 maxSupply, uint256 mintedCount, string memory metadataRoot)
    {
        Series storage s = _series[seriesId];
        if (!s.exists) revert SeriesDoesNotExist(seriesId);
        return (s.maxSupply, s.mintedCount, s.metadataRoot);
    }

    // -------------------------
    // Minting
    // -------------------------

    /// @notice Mint a single token from an existing series.
    /// @param seriesId Series identifier.
    /// @param to Recipient address.
    /// @param tokenURI_ Full token URI (recommended `ipfs://.../metadata.json`).
    function mintFromSeries(uint256 seriesId, address to, string calldata tokenURI_)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        returns (uint256 tokenId)
    {
        return _mintFromSeries(seriesId, to, tokenURI_);
    }

    /// @notice Batch mint multiple tokens from a series.
    function batchMintFromSeries(uint256 seriesId, address[] calldata recipients, string[] calldata tokenURIs_)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        returns (uint256[] memory tokenIds)
    {
        if (recipients.length != tokenURIs_.length) revert ArrayLengthMismatch(recipients.length, tokenURIs_.length);
        tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = _mintFromSeries(seriesId, recipients[i], tokenURIs_[i]);
        }
    }

    function _mintFromSeries(uint256 seriesId, address to, string calldata tokenURI_) internal returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();

        Series storage s = _series[seriesId];
        if (!s.exists) revert SeriesDoesNotExist(seriesId);
        if (s.mintedCount >= s.maxSupply) revert SeriesMaxSupplyExceeded(seriesId);

        s.mintedCount += 1;
        uint256 editionNumber = s.mintedCount;

        tokenId = nextTokenId;
        nextTokenId = tokenId + 1;

        tokenSeriesId[tokenId] = seriesId;
        tokenEditionNumber[tokenId] = editionNumber;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        emit TokenMinted(tokenId, seriesId, editionNumber, to, tokenURI_);
    }

    // -------------------------
    // Overrides
    // -------------------------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ERC721URIStorage already overrides tokenURI; no changes needed.
}

