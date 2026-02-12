export const TREND_MINT_721_ABI = [
  "function mintFromSeries(uint256 seriesId, address to, string tokenURI_) external returns (uint256 tokenId)",
  "function batchMintFromSeries(uint256 seriesId, address[] recipients, string[] tokenURIs_) external returns (uint256[] tokenIds)",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event TokenMinted(uint256 indexed tokenId, uint256 indexed seriesId, uint256 editionNumber, address indexed to, string tokenURI)"
] as const;
