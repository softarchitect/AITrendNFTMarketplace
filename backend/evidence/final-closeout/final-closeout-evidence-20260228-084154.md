# Final Closeout Evidence Report

Generated: 2026-02-28T16:41:56.446Z

## Summary

- Overall: PASS
- Steps Passed: 15/15

## API Validation Steps

| Step | HTTP | Result |
| --- | --- | --- |
| health_check | 200 | PASS |
| admin_session_seeded | 200 | PASS |
| cms_pages_list | 200 | PASS |
| cms_page_write | 200 | PASS |
| wallet_handover_status | 200 | PASS |
| uat_user_create | 201 | PASS |
| manual_mint_cycle | 200 | PASS |
| gateway_set_live_generic | 200 | PASS |
| manual_purchase_session_create | 201 | PASS |
| manual_settle_before_confirm_blocked | 409 | PASS |
| manual_payment_webhook_confirm | 200 | PASS |
| manual_settle_after_confirm | 200 | PASS |
| manual_receipts_fetch | 200 | PASS |
| partner_api_key_create | 201 | PASS |
| partner_bulk_purchase | 201 | PASS |

## Manual Purchase Walkthrough Credentials

- Email: demo.buyer+20260228-084154@affordablenft.com
- Password: DemoBuyer#2026
- Display Name: Demo Buyer

## Manual Purchase Trace

- Listing ID: 618af2fd-cd16-456b-85c9-1410c786f02a
- Payment ID: bf4253e8-e797-4867-9fba-8cca6e7aefce
- External Ref: mock_20687ee9-2358-42a9-b531-89621e6481b9
- Checkout URL: https://sandbox-gateway.local/session/mock_20687ee9-2358-42a9-b531-89621e6481b9
- Settlement Tx Hash: 0xmocktransfer00000001

## Partner Bulk Purchase Trace

- Key Prefix: pk_live_lmkgb7j9
- Raw Key (masked): pk_***7gj
- /api/partner/bulk-purchase status: 201

## Wallet Switch Inputs Required To Execute Final Cutover

- Client admin wallet address
- Confirmation that DEFAULT_ADMIN_ROLE is granted on contract
- Secure method to receive/set ADMIN_PRIVATE_KEY on server
- Approved maintenance window for pm2 restart

## Artifacts

- JSON evidence: `evidence/final-closeout/final-closeout-evidence-20260228-084154.json`