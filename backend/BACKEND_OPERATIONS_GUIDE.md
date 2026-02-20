# Backend Operations Guide

This guide explains how the marketplace automation behaves in production.

## 1) Creating a new NFT series

- Create a new series on the NFT contract side first (contract/admin wallet).
- Once the series exists on-chain, it appears in the admin series picker (via `/api/admin/series`).
- The mint pipeline can then target that series ID for manual or scheduled minting.
- You can also create series through admin API (`POST /api/admin/series`) when admin signer is configured.

## 1.1) Automated series lifecycle

- Enable in Admin Settings: **Auto-create next series when full/missing**.
- Configuration options:
  - `seriesIdTemplate` (supported: `next`, `start:<n>`, `list:a,b,c`, `range:x-y`)
  - `defaultSeriesMaxSupply`
  - `seriesMetadataRootTemplate` (supports `{seriesId}`)
- Behavior:
  - If selected/default series is unavailable or sold out, backend resolves next candidate based on template.
  - If candidate does not exist, backend creates it on-chain and continues minting.
- Requirement:
  - Backend must have `ADMIN_PRIVATE_KEY` with `DEFAULT_ADMIN_ROLE`.

## 2) Trending topic volume (up to 10)

- The number of trend topics considered per mint cycle is configurable in Admin Settings.
- Setting name: **Topic limit per cycle (1-10)**.
- Default is `3`; max is `10`.
- This value is persisted in database-backed admin controls.
- Topic selection now rotates over simulated trend pool so non-pinned themes vary over time.

## 3) Auto-suggest / auto-mint cadence

- Automated minting runs only when both toggles are enabled:
  - `pipelineEnabled`
  - `scheduleEnabled`
- Cadence is configurable in Admin Settings:
  - **Auto-mint interval (minutes)** (minimum `1`)
- On each automated cycle, backend pulls trend topics using the configured topic limit and creates one mint candidate from that cycle.
- Auto-mint can also run in batches:
  - **Auto-mint quantity per cycle (1-10)**
- A cycle means one scheduler execution at the configured interval.

## 3.1) Daily minimum (catch-up mode)

- Optional setting: **Daily minimum target** (`0` disables minimum enforcement).
- When enabled, scheduler increases batch size dynamically (within hourly/daily caps) if minted count is behind the minimum target pace.
- Validation rule: daily minimum target cannot exceed daily cap.
- This improves consistency toward minimum daily output, while still respecting all caps.

## 4) Manual minting

- Admin can still run a cycle manually (`/api/admin/run-cycle`) regardless of scheduler cadence.
- Manual cycle also respects mint caps and current pipeline controls.
- In **Admin > Minting Queue > Mint Now**, the **Topic limit** now supports `1-10`.
- The Mint Now form preloads the default value from Admin Settings.
- In **Mint Now**, you can optionally select a **Theme override** to force manual minting from a specific theme.

## 5) Persistence

- Controls are stored in `admin_controls`:
  - `daily_cap`
  - `hourly_cap`
  - `pipeline_enabled`
  - `schedule_enabled`
  - `trend_topic_limit`
  - `auto_mint_interval_minutes`

## 6) Where to adjust schedule, cadence, and caps

- Go to **Admin > Settings > Mint Controls**.
- Configure and save:
  - **Daily cap**
  - **Hourly cap**
  - **Topic limit per cycle (1-10)**
  - **Auto-mint interval (minutes)**
  - **Auto-mint quantity per cycle (1-10)**
  - **Daily minimum target (0 = disabled)**
  - **Pipeline enabled**
  - **Schedule enabled**

## 7) Pricing controls

- Go to **Admin > Settings > Pricing Controls**.
- Pricing order of precedence:
  1. listing override
  2. series override
  3. theme override
  4. base + token step fallback
- Configure:
  - **Base price (USD)**
  - **Token step (USD)**
  - **Theme overrides** (`theme=price`)
  - **Series overrides** (`seriesId=price`)
  - **Listing overrides** (`listingId=price`)

## 8) Trend intelligence sources

- Active sources can include `twitter`, `reddit`, and optional `googletrends`.
- Backend polls source adapters on configured interval and stores topic candidates.
- If a source fails, backend falls back to mock candidates for resilience.
- Source health telemetry is available via:
  - `GET /api/admin/trend-source-health`
  - `GET /api/admin/system-status` (Trend Sources component)
