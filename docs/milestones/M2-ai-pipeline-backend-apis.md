# Milestone 2 — AI Pipeline & Backend APIs

Milestone 2 delivers the backend implementation that powers the agreed Phase 1 automated workflow:

`trend ingestion -> prompt build -> AI generation -> IPFS metadata -> ERC-721 mint -> listing index`

## Implemented Components

- **Trend Ingestion Service**
  - Configurable trend sources
  - Admin-pinned themes
  - Hourly and daily mint cap enforcement
- **Prompt Builder**
  - Topic to provider prompt transformation
- **AI Adapter**
  - Provider interface with mock implementation for MVP reproducibility
- **Metadata + IPFS Service**
  - ERC-721 metadata JSON creation
  - IPFS pinning abstraction (mock provider by default)
- **Minter Service**
  - Uses deployed `TrendMint721` contract (`MINTER_ROLE`) when chain config is present
  - Safe mock mode fallback for local demos
- **Indexer**
  - Tracks listing/ownership state for API reads
- **Payment Abstraction + Webhook**
  - Payment session creation
  - External webhook status updates
  - Transfer blocked until payment is `confirmed`
- **REST APIs**
  - Admin APIs
  - Marketplace APIs
  - Partner APIs (bulk purchase, bulk transfer, relist)
  - Idempotency key support for bulk purchase

## Validation

- Automated tests cover:
  - end-to-end automated mint cycle,
  - transfer blocking before payment confirmation,
  - transfer settlement after payment webhook confirmation.

## Folder

- Backend implementation: `backend/`
