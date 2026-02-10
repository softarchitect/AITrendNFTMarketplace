# Milestone 1 — Smart Contracts (Ethereum / ERC-721)

This milestone delivers an MVP, **Ethereum-only ERC-721** contract suitable for an NFT marketplace minting pipeline. It supports **editions/series** (multiple copies of a work), restricts minting to an authorized backend via `MINTER_ROLE`, and stores token metadata as **IPFS JSON** (`ipfs://...`).

## What was built

- **Contract**: `TrendMint721` (`contract/contracts/TrendMint721.sol`)
- **Core features**
  - **Editions/series model**:
    - `createSeries(seriesId, maxSupply, metadataRoot)`
    - `mintFromSeries(seriesId, to, tokenURI)`
    - `batchMintFromSeries(seriesId, recipients[], tokenURIs[])`
  - **Access control**
    - `DEFAULT_ADMIN_ROLE`: manages roles, creates series, can pause/unpause
    - `MINTER_ROLE`: allowed to mint
  - **Metadata**
    - `tokenURI` is stored per-token at mint time (`ipfs://.../metadata.json` recommended)
    - Each token records:
      - `tokenId -> seriesId`
      - `tokenId -> editionNumber` (1..maxSupply)
  - **Optional safety**
    - Minting functions are guarded by `whenNotPaused` (`pause()` / `unpause()` admin only)

## How editions/series work

- A **series** is an on-chain record identified by `seriesId`:
  - `maxSupply`: maximum editions allowed in that series
  - `mintedCount`: how many editions have been minted so far
  - `metadataRoot`: a string for off-chain coordination (commonly `ipfs://<CID>/`)
- Each mint from a series:
  - increments `mintedCount`
  - assigns the next `tokenId` (monotonic)
  - sets `editionNumber = mintedCount` (starting at 1)
  - stores `tokenURI` passed in by the backend (full IPFS JSON URI)

## IPFS / tokenURI handling

- The backend (or deployment operator) mints with a **full IPFS token URI**, e.g.:
  - `ipfs://bafy.../123.json`
- The contract does **not** build tokenURIs from `metadataRoot`; it simply stores `tokenURI` per token. This keeps on-chain logic minimal and flexible for different metadata pipelines.

## Security notes

- **Minting is restricted** to accounts with `MINTER_ROLE`.
- **Series supply is enforced**: minting reverts once `maxSupply` is reached.
- Uses OpenZeppelin:
  - `AccessControl` for role management
  - `ERC721URIStorage` for per-token URIs
  - `Pausable` (admin can pause minting)

## Explicitly out of scope (Phase 1)

- Royalties (ERC-2981) / advanced royalties
- Marketplace logic (listings, purchases, escrow)
- Fractional ownership
- Upgradeable proxy patterns (contract is non-upgradeable MVP)
- Cross-chain / multi-network deployments

