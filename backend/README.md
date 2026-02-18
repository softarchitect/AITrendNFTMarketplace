# TrendMint Backend — Milestone 2

This workspace implements the Milestone 2 backend stack for the agreed Phase 1 architecture:

- trend ingestion (including pinned themes),
- prompt building + AI adapter,
- metadata/IPFS adapter,
- minter orchestration,
- indexer/listing state,
- partner/marketplace/admin REST APIs,
- payment abstraction + webhook confirmation.

## Quick Start

```bash
cd backend
npm install
copy .env.example .env
npm run start
```

Server starts on `http://localhost:4000` by default.

Set `BACKEND_PUBLIC_BASE_URL` in `.env` so generated asset URLs are returned as full absolute links.

## Key Endpoints

- `GET /health`
- `GET /milestone2/status`
- `POST /api/admin/trend-sources`
- `POST /api/admin/pinned-themes`
- `POST /api/admin/run-cycle` (trend -> AI -> IPFS -> mint -> listing)
- `GET /api/marketplace/listings`
- `POST /api/marketplace/purchase-session`
- `POST /api/partner/bulk-purchase`
- `POST /api/partner/bulk-transfer`
- `POST /api/partner/relist`
- `POST /api/webhooks/payment`
- `GET /generated/<filename>` (saved AI images when provider returns base64 data URLs)

## Provider Smoke Tests

Run fixture-based payment provider smoke tests:

```bash
npm run test:smoke:payments
```

Fixtures are in `test/fixtures/payment-webhooks/` and include sample Vellis/Wert webhook payloads.

Run a terminal-friendly webhook demo (prints before/after payment state):

```bash
npm run demo:webhooks
```

Optional provider filter:

```bash
npm run demo:webhooks -- --provider=vellis
npm run demo:webhooks -- --provider=wert
```

Run JSON-only report (no request logs), useful for client updates:

```bash
npm run demo:webhooks:json
```

Optional provider filter:

```bash
npm run demo:webhooks:json -- --provider=vellis
npm run demo:webhooks:json -- --provider=wert
```

Write report to a file (directories are created automatically):

```bash
npm run demo:webhooks:json -- --out docs/milestones/m2-webhook-demo-report.json
```

Generate a complete Milestone 2 evidence bundle (tests + webhook JSON report + summary):

```bash
npm run evidence:m2
```

Artifacts are written to `docs/milestones/evidence/` with timestamped filenames, including a client-friendly markdown report.

## Notes

- By default, Milestone 2 runs with mock adapters (`AI`, `IPFS`, `Payment`) to keep setup reproducible.
- If `RPC_URL`, `MINTER_PRIVATE_KEY`, and `CONTRACT_ADDRESS` are configured, mint/transfer uses chain mode.
- Payment confirmation is enforced before transfer settlement in partner APIs.
- AI adapters are provider-based:
  - mock mode (`AI_PROVIDER=mock`), or
  - generic HTTP mode (`AI_PROVIDER=generic`) via `AI_API_BASE_URL` + `AI_API_KEY`, or
  - Hugging Face mode (`AI_PROVIDER=huggingface`) with:
    - `AI_API_KEY`
    - `AI_API_BASE_URL=https://router.huggingface.co`
    - `AI_HF_MODEL_ID` (example: `stabilityai/stable-diffusion-xl-base-1.0`)
    - `AI_HF_MODEL_PATH_PREFIX=/hf-inference/models`
    - adjustable resolution via `AI_IMAGE_WIDTH` / `AI_IMAGE_HEIGHT` (default low: `512x512`).
- IPFS adapters are provider-based:
  - mock mode (`IPFS_PROVIDER=mock`), or
  - generic HTTP mode (`IPFS_PROVIDER=generic`) via `IPFS_API_BASE_URL` + `IPFS_API_KEY`, or
  - Pinata mode (`IPFS_PROVIDER=pinata`) using:
    - `IPFS_API_BASE_URL=https://api.pinata.cloud`
    - `IPFS_PIN_JSON_PATH=/pinning/pinJSONToIPFS`
    - either `IPFS_API_JWT`, or `IPFS_API_KEY` + `IPFS_API_SECRET`.
- Payment adapters are provider-based:
  - mock mode (`PAYMENT_PROVIDER=mock`), or
  - generic HTTP provider (`PAYMENT_PROVIDER=generic|vellis|wert`) via `PAYMENT_API_BASE_URL` + `PAYMENT_API_KEY`.
- Webhook signature verification is strict in live payment mode (non-mock). If you intentionally need temporary insecure mode for testing, set `ALLOW_INSECURE_WEBHOOKS=true`.
- Webhook parsing is provider-aware (dedicated payload extraction for `vellis` and `wert`).
- Admin auth hardening supports:
  - login rate limiting/temporary lockout (`ADMIN_LOGIN_*`),
  - configurable session TTL (`ADMIN_SESSION_TTL_MINUTES`),
  - optional PBKDF2 hashed password (`ADMIN_PASSWORD_HASH` in `pbkdf2$iterations$salt$hex` format).
- Generate a secure admin password hash:
  - `npm run admin:hash -- "your-strong-password"`
- File persistence can be enabled with `ENABLE_FILE_PERSISTENCE=true` and `STORE_FILE_PATH=./data/store.json` to keep state across restarts.
- PostgreSQL persistence is supported for local/dev and production-like persistence:
  - `PERSISTENCE_DRIVER=postgres`
  - `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`
  - backend auto-creates `trendmint_store_snapshot` and stores a single JSON snapshot row.
- For Hugging Face responses that return `data:image/...;base64,...`, backend saves the image into `backend/generated/` and returns `asset.mediaUrl` as `/generated/<filename>`.
