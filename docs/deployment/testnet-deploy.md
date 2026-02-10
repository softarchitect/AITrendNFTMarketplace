# Testnet deployment (Sepolia) — TrendMint721

This guide lets a third party reproduce **compile → test → deploy → verify** from scratch.

## Prerequisites

- Node.js (LTS recommended) + npm
- A funded Sepolia EOA for deployment (Sepolia ETH)
- RPC endpoint for Sepolia (Alchemy/Infura/QuickNode/etc)
- Etherscan API key (for verification)

## Install

From the repo root:

```bash
cd contract
npm install
```

## Environment variables

Create `.env` in `contract/`:

```bash
cd contract
copy .env.example .env
```

Set the following values in `contract/.env`:

- **RPC_URL**: Sepolia RPC endpoint
- **PRIVATE_KEY**: deployer/admin private key (no `0x` prefix)
- **ETHERSCAN_API_KEY**: used by Hardhat verification

Optional for scripts:

- **CONTRACT_ADDRESS**: if you want to point scripts at an existing deployment
- **MINTER_ADDRESS**: address to grant `MINTER_ROLE` to (backend wallet)
- **SERIES_ID**, **MAX_SUPPLY**, **SERIES_METADATA_ROOT**
- **TO_ADDRESS**, **TOKEN_URI**

## Run tests

```bash
cd contract
npx hardhat test
```

## Deploy to Sepolia

```bash
cd contract
npx hardhat run --network sepolia scripts/01-deploy.ts
```

This writes a deployment record to `contract/deployments/sepolia.json`.

## Grant the backend minter role

Choose the backend (minter) wallet address, then:

```bash
cd contract
set MINTER_ADDRESS=0xYourBackendMinterAddress
npx hardhat run --network sepolia scripts/00-grant-minter.ts
```

## Create an example series

```bash
cd contract
set SERIES_ID=1
set MAX_SUPPLY=10
set SERIES_METADATA_ROOT=ipfs://<CID>/
npx hardhat run --network sepolia scripts/02-create-series.ts
```

## Mint one example token

The caller must have `MINTER_ROLE` (typically your backend wallet).

```bash
cd contract
set SERIES_ID=1
set TO_ADDRESS=0xRecipientAddress
set TOKEN_URI=ipfs://<CID>/metadata.json
npx hardhat run --network sepolia scripts/03-mint-example.ts
```

## Verify on Etherscan

Constructor args are:

1. Name: `TrendMint721`
2. Symbol: `TREND`
3. Admin: `<deployer-address>`

Example:

```bash
cd contract
npx hardhat verify --network sepolia <contractAddress> "TrendMint721" "TREND" <deployerAddress>
```

## Deployed Addresses (filled)

- **Network**: Sepolia
- **Contract**: TrendMint721
- **Address**: `0xa97a9dA0A4E1214E6784fCA0453A5cC141D0c7dA`
- **Deployer**: `0xEC0152efFBe7C948f5567c31bdC23905Df9ab5F2`
- **Deployment tx hash**: `0xa276a0e0b8586dabd33e24f5374797be7655df9b38c0b8b4fd9705b7d9f863da`
- **Verified**: yes
- **Etherscan**: `https://sepolia.etherscan.io/address/0xa97a9dA0A4E1214E6784fCA0453A5cC141D0c7dA#code`

## If `hardhat verify` fails

Two common failure modes:

- **Connect Timeout Error**: your machine can’t reach Etherscan’s API (firewall/proxy/DNS).
- **Invalid API key**: `ETHERSCAN_API_KEY` is missing/incorrect.

### Manual verification fallback (Etherscan UI)

If automated verification fails (timeout **or** v1 deprecation), verify via Etherscan’s “Verify and Publish” page:

- **Compiler**: `v0.8.20`
- **Optimization**: enabled, **runs = 200**
- **License**: MIT
- **Constructor args**:
  - `TrendMint721`
  - `TREND`
  - `0xEC0152efFBe7C948f5567c31bdC23905Df9ab5F2`

