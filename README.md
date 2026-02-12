# TrendMint — Phase 1 (MVP) / Milestone Archive

This repo contains the **Phase‑1 (MVP)** milestone deliverables for the TrendMint NFT marketplace project.

## Smart Contracts (Milestone‑1)

Milestone‑1 delivers an Ethereum-only **ERC‑721 Editions** contract plus tests, deployment scripts, and reproducible documentation.

- **Milestone overview**: `docs/milestones/M1-smart-contracts.md`
- **Sepolia deploy & verify**: `docs/deployment/testnet-deploy.md`
- **Contract code**: `contract/contracts/TrendMint721.sol`

## Backend Services (Milestone‑2)

Milestone‑2 delivers the backend automation and API surface for the Phase‑1 architecture.

- **Milestone overview**: `docs/milestones/M2-ai-pipeline-backend-apis.md`
- **Backend code**: `backend/`

### Deployed contract (Sepolia)

- **Network**: Sepolia (chainId `11155111`)
- **Contract**: `TrendMint721`
- **Address**: `0xa97a9dA0A4E1214E6784fCA0453A5cC141D0c7dA`
- **Verified source**: `https://sepolia.etherscan.io/address/0xa97a9dA0A4E1214E6784fCA0453A5cC141D0c7dA#code`

## Quickstart

```bash
cd contract
npm install
npx hardhat test
```

## Deploy to Sepolia (reproducible)

1) Create `contract/.env` from the template:

```bash
cd contract
copy .env.example .env
```

2) Fill:

- `RPC_URL`
- `PRIVATE_KEY`
- `ETHERSCAN_API_KEY`

3) Deploy / set roles / create a series / mint an example token:

```bash
cd contract
npx hardhat run --network sepolia scripts/01-deploy.ts
npx hardhat run --network sepolia scripts/00-grant-minter.ts
npx hardhat run --network sepolia scripts/02-create-series.ts
npx hardhat run --network sepolia scripts/03-mint-example.ts
```

4) Verify:

```bash
cd contract
npx hardhat verify --network sepolia <contractAddress> "TrendMint721" "TREND" <deployerAddress>
```

## Repo structure

- `contract/`: Hardhat + TypeScript workspace
- `backend/`: Express + TypeScript backend services (Milestone‑2)
- `docs/`: Milestone and deployment documentation


