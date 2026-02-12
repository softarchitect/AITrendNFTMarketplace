import path from "path";
import { readFile } from "fs/promises";
import request from "supertest";
import { createApp } from "../src/app";
import { InMemoryStore } from "../src/store/inMemoryStore";
import { PaymentService } from "../src/services/paymentService";
import { VellisPaymentAdapter, WertPaymentAdapter } from "../src/services/payment/adapters";
import { createServices } from "../src/services/serviceContainer";

type Provider = "vellis" | "wert";

interface FixtureCase {
  provider: Provider;
  fixturePath: string;
  externalRef: string;
  initialStatus: "pending";
}

const FIXTURE_CASES: FixtureCase[] = [
  {
    provider: "vellis",
    fixturePath: "test/fixtures/payment-webhooks/vellis-confirmed.json",
    externalRef: "vellis_tx_001",
    initialStatus: "pending"
  },
  {
    provider: "wert",
    fixturePath: "test/fixtures/payment-webhooks/wert-failed.json",
    externalRef: "wert_order_001",
    initialStatus: "pending"
  }
];

async function main() {
  const args = new Set(process.argv.slice(2).map((value) => value.toLowerCase()));
  const selectedProvider = args.has("--provider=vellis")
    ? "vellis"
    : args.has("--provider=wert")
      ? "wert"
      : undefined;

  const scenarios = selectedProvider
    ? FIXTURE_CASES.filter((item) => item.provider === selectedProvider)
    : FIXTURE_CASES;

  if (scenarios.length === 0) {
    console.error("No demo scenario selected.");
    process.exit(1);
  }

  for (const scenario of scenarios) {
    await runScenario(scenario);
  }
}

async function runScenario(scenario: FixtureCase) {
  const db = new InMemoryStore();
  const services = createServices(db);
  services.payment =
    scenario.provider === "vellis"
      ? new PaymentService(db, new VellisPaymentAdapter("https://example.com", "key", "/sessions"))
      : new PaymentService(db, new WertPaymentAdapter("https://example.com", "key", "/sessions"));

  const app = createApp(services);

  const created = db.createPayment({
    externalRef: scenario.externalRef,
    amountUsd: 100,
    currency: "USD",
    status: scenario.initialStatus
  });

  const fixtureAbsolutePath = path.resolve(process.cwd(), scenario.fixturePath);
  const fixtureData = JSON.parse(await readFile(fixtureAbsolutePath, "utf8")) as Record<string, unknown>;

  const before = db.payments.get(created.id);
  console.log(`\n=== ${scenario.provider.toUpperCase()} webhook demo ===`);
  console.log("Before:", {
    paymentId: before?.id,
    externalRef: before?.externalRef,
    status: before?.status
  });

  const response = await request(app).post("/api/webhooks/payment").send(fixtureData);

  if (response.status !== 200) {
    console.error("Webhook call failed:", response.status, response.body);
    process.exit(1);
  }

  const after = db.payments.get(created.id);
  console.log("After:", {
    paymentId: after?.id,
    externalRef: after?.externalRef,
    status: after?.status
  });
}

main().catch((error) => {
  console.error("Demo failed:", error);
  process.exit(1);
});
