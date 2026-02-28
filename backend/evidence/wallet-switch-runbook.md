# Admin Wallet Switch Runbook (Final Cutover)

Use this runbook when replacing the current backend admin signer with the client wallet.

## Inputs required from client

1. Target admin wallet address (checksummed).
2. Confirmation of network (`CHAIN_ID`) and contract address.
3. Confirmation that `DEFAULT_ADMIN_ROLE` is granted on-chain to the target wallet.
4. Approved maintenance window for backend restart.

## Secure handling

- Never paste private keys into chat logs or source control.
- Set `ADMIN_PRIVATE_KEY` directly on server environment/secret manager.
- Do not commit `.env` files containing secrets.

## Cutover steps

1. Validate current readiness in admin:
   - `GET /api/admin/wallet-handover`
2. Update server env:
   - set `ADMIN_PRIVATE_KEY=<client_wallet_private_key>`
3. Restart backend with env refresh:
   - `pm2 restart api --update-env`
4. Verify:
   - `GET /api/admin/wallet-handover`
   - Expect `adminConfigured=true`
   - Expect `hasDefaultAdminRole=true` (if role already granted)
5. Functional check:
   - From admin settings, run `Preview Next Series ID`
   - Optionally run `Create Next Series Now`

## Rollback

If post-cutover checks fail:

1. Restore previous `ADMIN_PRIVATE_KEY`.
2. `pm2 restart api --update-env`.
3. Re-run wallet-handover status endpoint.
