import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { InMemoryStore } from "../src/store/inMemoryStore";
import { createServices } from "../src/services/serviceContainer";

function setup() {
  const db = new InMemoryStore();
  const services = createServices(db, { forceMock: true });
  const app = createApp(services);
  return { app, services };
}

describe("TrendMint Milestone 2 backend", () => {
  it("runs an automated mint cycle end-to-end", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/admin/run-cycle")
      .send({ recipient: "0x000000000000000000000000000000000000dEaD", seriesId: 1 });

    expect(response.status).toBe(200);
    expect(response.body.listing).toBeDefined();
    expect(response.body.pinned.metadataUri).toContain("ipfs://");
    expect(response.body.minterMode).toBeDefined();
  });

  it("blocks bulk transfer before payment is confirmed", async () => {
    const { app } = setup();

    const createPayment = await request(app)
      .post("/api/partner/bulk-purchase")
      .set("x-idempotency-key", "idem-key-0001")
      .send({
        buyerWallet: "0xbuyer",
        amountUsd: 10,
        currency: "USD",
        tokenIds: [1]
      });

    expect(createPayment.status).toBe(201);

    const blocked = await request(app).post("/api/partner/bulk-transfer").send({
      paymentExternalRef: createPayment.body.externalRef,
      fromWallet: "0xfrom",
      toWallet: "0xto",
      tokenIds: [1]
    });

    expect(blocked.status).toBe(409);
  });

  it("allows transfer after payment webhook confirmation", async () => {
    const { app } = setup();

    await request(app)
      .post("/api/admin/run-cycle")
      .send({ recipient: "0xfrom", seriesId: 1 });

    const createPayment = await request(app)
      .post("/api/partner/bulk-purchase")
      .set("x-idempotency-key", "idem-key-0002")
      .send({
        buyerWallet: "0xbuyer",
        amountUsd: 20,
        currency: "USD",
        tokenIds: [1]
      });

    await request(app).post("/api/webhooks/payment").send({
      externalRef: createPayment.body.externalRef,
      status: "confirmed"
    });

    const transfer = await request(app).post("/api/partner/bulk-transfer").send({
      paymentExternalRef: createPayment.body.externalRef,
      fromWallet: "0xfrom",
      toWallet: "0xto",
      tokenIds: [1]
    });

    expect(transfer.status).toBe(200);
    expect(transfer.body.transferred).toBe(1);
  });
});
