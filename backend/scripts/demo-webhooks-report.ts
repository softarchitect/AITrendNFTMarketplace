import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import request from "supertest";
import { createApp } from "../src/app";
import { logger } from "../src/logger";
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

interface DemoResult {
  provider: Provider;
  externalRef: string;
  httpStatus: number;
  beforeStatus: string | undefined;
  afterStatus: string | undefined;
  success: boolean;
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
  logger.level = "silent";

  const { selectedProvider, outFilePath } = parseCliArgs(process.argv.slice(2));

  const scenarios = selectedProvider
    ? FIXTURE_CASES.filter((item) => item.provider === selectedProvider)
    : FIXTURE_CASES;

  if (scenarios.length === 0) {
    throw new Error("No report scenario selected.");
  }

  const results: DemoResult[] = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(scenario));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    scenarios: results,
    success: results.every((item) => item.success)
  };

  const jsonOutput = JSON.stringify(output, null, 2);
  console.log(jsonOutput);
  if (outFilePath) {
    const absolutePath = path.resolve(process.cwd(), outFilePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, `${jsonOutput}\n`, "utf8");
  }

  if (!output.success) {
    process.exit(1);
  }
}

async function runScenario(scenario: FixtureCase): Promise<DemoResult> {
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
  const response = await request(app).post("/api/webhooks/payment").send(fixtureData);
  const after = db.payments.get(created.id);

  return {
    provider: scenario.provider,
    externalRef: scenario.externalRef,
    httpStatus: response.status,
    beforeStatus: before?.status,
    afterStatus: after?.status,
    success: response.status === 200 && before?.status !== after?.status
  };
}

function parseCliArgs(args: string[]): {
  selectedProvider?: Provider;
  outFilePath?: string;
} {
  let selectedProvider: Provider | undefined;
  let outFilePath: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const raw = args[i];
    if (!raw) {
      continue;
    }
    const value = raw.toLowerCase();
    if (value === "--provider=vellis") {
      selectedProvider = "vellis";
      continue;
    }
    if (value === "--provider=wert") {
      selectedProvider = "wert";
      continue;
    }
    if (value === "--out") {
      const nextValue = args[i + 1];
      if (!nextValue || nextValue.startsWith("--")) {
        throw new Error("Missing file path after --out");
      }
      outFilePath = nextValue;
      i += 1;
      continue;
    }
    if (value.startsWith("--out=")) {
      outFilePath = raw.slice("--out=".length);
      continue;
    }
  }

  return { selectedProvider, outFilePath };
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false
      },
      null,
      2
    )
  );
  process.exit(1);
});
