import path from "path";
import { mkdir, writeFile } from "fs/promises";
import request from "supertest";
import { createApp } from "../src/app";
import { createServices } from "../src/services/serviceContainer";
import { InMemoryStore } from "../src/store/inMemoryStore";

interface StepEvidence {
  step: string;
  status: number;
  ok: boolean;
  detail?: string;
}

function timestampTag(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function mask(value: string): string {
  if (!value) return "";
  if (value.length <= 6) return "*".repeat(value.length);
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

async function main() {
  const backendDir = process.cwd();
  const stamp = timestampTag();
  const outDir = path.resolve(backendDir, "evidence", "final-closeout");
  await mkdir(outDir, { recursive: true });

  const db = new InMemoryStore();
  const services = createServices(db, { forceMock: true });
  const app = createApp(services);
  const steps: StepEvidence[] = [];

  const health = await request(app).get("/health");
  steps.push({
    step: "health_check",
    status: health.status,
    ok: health.status === 200
  });

  const adminToken = "evidence-admin-token";
  services.db.upsertAdminUser({
    id: "evidence-admin",
    email: "evidence-admin@affordablenft.local",
    passwordHash: "not-used-in-evidence-script",
    displayName: "Evidence Admin",
    role: "Admin",
    isActive: true
  });
  services.db.createAdminSession({
    token: adminToken,
    userId: "evidence-admin",
    email: "evidence-admin@affordablenft.local",
    displayName: "Evidence Admin",
    role: "Admin",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });
  const authHeader = { Authorization: `Bearer ${adminToken}` };
  steps.push({
    step: "admin_session_seeded",
    status: 200,
    ok: true
  });

  const cmsList = await request(app).get("/api/admin/content-pages").set(authHeader);
  steps.push({
    step: "cms_pages_list",
    status: cmsList.status,
    ok: cmsList.status === 200
  });
  const faqPage = (cmsList.body as Array<{ slug: string; title: string; content: string }>).find(
    (item) => item.slug === "faq"
  );
  const cmsWrite = await request(app).post("/api/admin/content-pages/faq").set(authHeader).send({
    title: faqPage?.title ?? "FAQ",
    content: faqPage?.content ?? "Q: Example\nA: Example"
  });
  steps.push({
    step: "cms_page_write",
    status: cmsWrite.status,
    ok: cmsWrite.status === 200
  });

  const walletStatus = await request(app).get("/api/admin/wallet-handover").set(authHeader);
  steps.push({
    step: "wallet_handover_status",
    status: walletStatus.status,
    ok: walletStatus.status === 200
  });

  const uatEmail = `demo.buyer+${stamp}@affordablenft.com`;
  const uatPassword = "DemoBuyer#2026";
  const uatCreate = await request(app).post("/api/admin/uat/demo-user").set(authHeader).send({
    email: uatEmail,
    password: uatPassword,
    displayName: "Demo Buyer"
  });
  steps.push({
    step: "uat_user_create",
    status: uatCreate.status,
    ok: uatCreate.status === 201
  });

  const runCycle = await request(app).post("/api/admin/run-cycle").set(authHeader).send({
    recipient: "0x000000000000000000000000000000000000dEaD",
    limit: 3
  });
  if (runCycle.status !== 200 || !runCycle.body?.listing?.id) {
    throw new Error(`Mint cycle failed (status=${runCycle.status}).`);
  }
  steps.push({
    step: "manual_mint_cycle",
    status: runCycle.status,
    ok: true
  });
  const listingId = String(runCycle.body.listing.id);

  const gatewayLive = await request(app).post("/api/admin/gateway-config").set(authHeader).send({
    provider: "generic",
    mode: "live",
    webhookVerificationEnabled: false,
    webhookSignatureHeader: "x-payment-signature"
  });
  steps.push({
    step: "gateway_set_live_generic",
    status: gatewayLive.status,
    ok: gatewayLive.status === 200
  });

  const manualIdem = `manual-${stamp}`;
  const purchaseSession = await request(app).post("/api/marketplace/purchase-session").send({
    listingId,
    buyerAddress: "0x000000000000000000000000000000000000bEEF",
    idempotencyKey: manualIdem,
    amountUsd: 120,
    currency: "USD"
  });
  if (purchaseSession.status !== 201) {
    throw new Error(`Manual purchase-session failed (status=${purchaseSession.status}).`);
  }
  const paymentId = String(purchaseSession.body.paymentId);
  const externalRef = String(purchaseSession.body.externalRef);
  steps.push({
    step: "manual_purchase_session_create",
    status: purchaseSession.status,
    ok: true
  });

  const settleBeforeConfirm = await request(app).post(`/api/marketplace/purchase-session/${paymentId}/settle`);
  steps.push({
    step: "manual_settle_before_confirm_blocked",
    status: settleBeforeConfirm.status,
    ok: settleBeforeConfirm.status === 409
  });

  const webhookConfirm = await request(app).post("/api/webhooks/payment").send({
    externalRef,
    status: "confirmed"
  });
  steps.push({
    step: "manual_payment_webhook_confirm",
    status: webhookConfirm.status,
    ok: webhookConfirm.status === 200
  });

  const settleAfterConfirm = await request(app).post(`/api/marketplace/purchase-session/${paymentId}/settle`);
  steps.push({
    step: "manual_settle_after_confirm",
    status: settleAfterConfirm.status,
    ok: settleAfterConfirm.status === 200
  });

  const receipts = await request(app).get("/api/marketplace/receipts/0x000000000000000000000000000000000000bEEF");
  steps.push({
    step: "manual_receipts_fetch",
    status: receipts.status,
    ok: receipts.status === 200
  });

  const apiKeyCreate = await request(app).post("/api/admin/api-keys").set(authHeader).send({
    label: `final-evidence-${stamp}`,
    permissions: ["BulkPurchase", "Transfer", "Relist"]
  });
  if (apiKeyCreate.status !== 201 || !apiKeyCreate.body?.key) {
    throw new Error(`Partner API key creation failed (status=${apiKeyCreate.status}).`);
  }
  const partnerRawKey = String(apiKeyCreate.body.key);
  steps.push({
    step: "partner_api_key_create",
    status: apiKeyCreate.status,
    ok: true
  });

  const bulkIdem = `bulk-${stamp}`;
  const bulkPurchase = await request(app)
    .post("/api/partner/bulk-purchase")
    .set("Authorization", `Bearer ${partnerRawKey}`)
    .set("x-idempotency-key", bulkIdem)
    .send({
      buyerWallet: "0x000000000000000000000000000000000000bEEF",
      amountUsd: 50,
      currency: "USD",
      tokenIds: [1]
    });
  steps.push({
    step: "partner_bulk_purchase",
    status: bulkPurchase.status,
    ok: bulkPurchase.status === 201 || bulkPurchase.status === 200
  });

  const evidence = {
    generatedAt: new Date().toISOString(),
    summary: {
      allPassed: steps.every((item) => item.ok),
      passed: steps.filter((item) => item.ok).length,
      total: steps.length
    },
    steps,
    handover: {
      walletStatus: walletStatus.body,
      requiredInputsForFinalSwitch: [
        "Client admin wallet address",
        "Confirmation that DEFAULT_ADMIN_ROLE is granted on contract",
        "Secure method to receive/set ADMIN_PRIVATE_KEY on server",
        "Approved maintenance window for pm2 restart"
      ]
    },
    uat: {
      email: uatEmail,
      password: uatPassword,
      displayName: "Demo Buyer"
    },
    partner: {
      keyPrefix: String(apiKeyCreate.body.partnerKey?.keyPrefix ?? ""),
      rawKeyMasked: mask(partnerRawKey),
      bulkPurchaseStatus: bulkPurchase.status
    },
    manualPurchase: {
      listingId,
      paymentId,
      externalRef,
      checkoutUrl: String(purchaseSession.body.checkoutUrl ?? ""),
      settleTxHash: String(settleAfterConfirm.body.txHash ?? "")
    }
  };

  const jsonPath = path.resolve(outDir, `final-closeout-evidence-${stamp}.json`);
  const mdPath = path.resolve(outDir, `final-closeout-evidence-${stamp}.md`);
  await writeFile(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(mdPath, buildMarkdown(evidence, path.relative(backendDir, jsonPath).replace(/\\/g, "/")), "utf8");

  console.log("Final closeout evidence generated:");
  console.log(`- ${path.relative(backendDir, jsonPath).replace(/\\/g, "/")}`);
  console.log(`- ${path.relative(backendDir, mdPath).replace(/\\/g, "/")}`);
}

function buildMarkdown(
  evidence: {
    generatedAt: string;
    summary: { allPassed: boolean; passed: number; total: number };
    steps: StepEvidence[];
    uat: { email: string; password: string; displayName: string };
    partner: { keyPrefix: string; rawKeyMasked: string; bulkPurchaseStatus: number };
    manualPurchase: { listingId: string; paymentId: string; externalRef: string; checkoutUrl: string; settleTxHash: string };
    handover: { requiredInputsForFinalSwitch: string[] };
  },
  jsonArtifactPath: string
): string {
  const stepRows = evidence.steps
    .map((item) => `| ${item.step} | ${item.status} | ${item.ok ? "PASS" : "FAIL"} |`)
    .join("\n");

  const inputs = evidence.handover.requiredInputsForFinalSwitch.map((item) => `- ${item}`).join("\n");
  return [
    "# Final Closeout Evidence Report",
    "",
    `Generated: ${evidence.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Overall: ${evidence.summary.allPassed ? "PASS" : "FAIL"}`,
    `- Steps Passed: ${evidence.summary.passed}/${evidence.summary.total}`,
    "",
    "## API Validation Steps",
    "",
    "| Step | HTTP | Result |",
    "| --- | --- | --- |",
    stepRows,
    "",
    "## Manual Purchase Walkthrough Credentials",
    "",
    `- Email: ${evidence.uat.email}`,
    `- Password: ${evidence.uat.password}`,
    `- Display Name: ${evidence.uat.displayName}`,
    "",
    "## Manual Purchase Trace",
    "",
    `- Listing ID: ${evidence.manualPurchase.listingId}`,
    `- Payment ID: ${evidence.manualPurchase.paymentId}`,
    `- External Ref: ${evidence.manualPurchase.externalRef}`,
    `- Checkout URL: ${evidence.manualPurchase.checkoutUrl || "n/a"}`,
    `- Settlement Tx Hash: ${evidence.manualPurchase.settleTxHash || "n/a"}`,
    "",
    "## Partner Bulk Purchase Trace",
    "",
    `- Key Prefix: ${evidence.partner.keyPrefix || "n/a"}`,
    `- Raw Key (masked): ${evidence.partner.rawKeyMasked || "n/a"}`,
    `- /api/partner/bulk-purchase status: ${evidence.partner.bulkPurchaseStatus}`,
    "",
    "## Wallet Switch Inputs Required To Execute Final Cutover",
    "",
    inputs,
    "",
    "## Artifacts",
    "",
    `- JSON evidence: \`${jsonArtifactPath}\``
  ].join("\n");
}

main().catch((error) => {
  console.error(`Final closeout evidence generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exit(1);
});
