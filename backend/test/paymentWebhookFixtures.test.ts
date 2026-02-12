import request from "supertest";
import { describe, expect, it } from "vitest";
import vellisConfirmedFixture from "./fixtures/payment-webhooks/vellis-confirmed.json";
import wertFailedFixture from "./fixtures/payment-webhooks/wert-failed.json";
import { createApp } from "../src/app";
import { InMemoryStore } from "../src/store/inMemoryStore";
import { PaymentService } from "../src/services/paymentService";
import { VellisPaymentAdapter, WertPaymentAdapter } from "../src/services/payment/adapters";
import { createServices } from "../src/services/serviceContainer";

function setupWithPaymentProvider(provider: "vellis" | "wert") {
  const db = new InMemoryStore();
  const services = createServices(db);
  services.payment =
    provider === "vellis"
      ? new PaymentService(db, new VellisPaymentAdapter("https://example.com", "key", "/sessions"))
      : new PaymentService(db, new WertPaymentAdapter("https://example.com", "key", "/sessions"));
  const app = createApp(services);
  return { app, db };
}

describe("Payment webhook provider smoke tests", () => {
  it("applies Vellis fixture and confirms payment", async () => {
    const { app, db } = setupWithPaymentProvider("vellis");
    db.createPayment({
      externalRef: "vellis_tx_001",
      amountUsd: 50,
      currency: "USD",
      status: "pending"
    });

    const response = await request(app).post("/api/webhooks/payment").send(vellisConfirmedFixture);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("confirmed");
  });

  it("applies Wert fixture and marks payment failed", async () => {
    const { app, db } = setupWithPaymentProvider("wert");
    db.createPayment({
      externalRef: "wert_order_001",
      amountUsd: 75,
      currency: "USD",
      status: "pending"
    });

    const response = await request(app).post("/api/webhooks/payment").send(wertFailedFixture);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("failed");
  });
});
