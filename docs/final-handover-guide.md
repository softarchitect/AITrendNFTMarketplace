# Affordable NFT Final Handover Guide

## 1) CMS-style content control

- Public pages are now managed from `Admin -> Content CMS`.
- Managed slugs: `faq`, `terms`, `privacy`, `contact`.
- Public routes read from CMS:
  - `/faq`
  - `/legal/terms`
  - `/legal/privacy`
  - `/contact`

## 2) Admin wallet handover checklist

Check current wallet readiness in `Admin -> Content CMS -> Admin Wallet Handover`.

Required steps:

1. Provide target admin wallet address (same network as `CHAIN_ID`).
2. Grant `DEFAULT_ADMIN_ROLE` on `TrendMint721` to that wallet.
3. Set backend `ADMIN_PRIVATE_KEY` to that wallet.
4. Restart backend (`pm2 restart api --update-env`).
5. Verify `hasDefaultAdminRole=yes` in dashboard handover card.

## 3) API walkthrough and UAT credentials

Generate/rotate a demo end-user from `Admin -> Content CMS -> UAT End-User Credentials`.

Suggested account:

- Email: `demo.buyer@affordablenft.com`
- Display name: `Demo Buyer`
- Password: set in admin panel when generating

Manual purchase API flow (example):

1. Login as user:
   - `POST /api/auth/login`
2. Create payment session:
   - `POST /api/marketplace/purchase-session`
3. Poll payment:
   - `GET /api/marketplace/purchase-session/:paymentId`
4. Settle transfer:
   - `POST /api/marketplace/purchase-session/:paymentId/settle`
5. Verify receipt:
   - `GET /api/marketplace/receipts/:wallet`

Partner bulk API smoke:

- Endpoint: `POST /api/v1/bulk-purchase`
- Auth: `Authorization: Bearer <partner_api_key>`
- Validate success + audit logs in admin dashboard.

## 4) NFT naming behavior

- Metadata names are normalized at mint-time to avoid noisy/raw topic strings.
- Frontend display names are now coherent and deterministic:
  - Format: `<Theme> <Descriptor> #<TokenId>`
  - Example: `Medical Edition #22`
