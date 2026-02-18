export const TREND_MINT_721_ABI = [
  "error ZeroAddress()",
  "error SeriesDoesNotExist(uint256 seriesId)",
  "error SeriesMaxSupplyExceeded(uint256 seriesId)",
  "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
  "error EnforcedPause()",
  "function mintFromSeries(uint256 seriesId, address to, string tokenURI_) external returns (uint256 tokenId)",
  "function batchMintFromSeries(uint256 seriesId, address[] recipients, string[] tokenURIs_) external returns (uint256[] tokenIds)",
  "function seriesInfo(uint256 seriesId) view returns (uint256 maxSupply, uint256 mintedCount, string metadataRoot)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event TokenMinted(uint256 indexed tokenId, uint256 indexed seriesId, uint256 editionNumber, address indexed to, string tokenURI)"
] as const;
