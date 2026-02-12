import { describe, expect, it } from "vitest";
import {
  GenericHttpPaymentAdapter,
  MockPaymentAdapter,
  VellisPaymentAdapter,
  WertPaymentAdapter
} from "../src/services/payment/adapters";

describe("Payment adapter webhook parsing", () => {
  it("parses generic webhook payload", () => {
    const adapter = new GenericHttpPaymentAdapter("https://example.com", "key", "/sessions");
    const parsed = adapter.parseWebhook({
      externalRef: "gen_123",
      status: "paid"
    });
    expect(parsed.externalRef).toBe("gen_123");
    expect(parsed.status).toBe("confirmed");
  });

  it("parses vellis webhook payload", () => {
    const adapter = new VellisPaymentAdapter("https://example.com", "key", "/sessions");
    const parsed = adapter.parseWebhook({
      event: {
        transactionId: "vellis_tx_1",
        status: "succeeded"
      }
    });
    expect(parsed.externalRef).toBe("vellis_tx_1");
    expect(parsed.status).toBe("confirmed");
  });

  it("parses wert webhook payload", () => {
    const adapter = new WertPaymentAdapter("https://example.com", "key", "/sessions");
    const parsed = adapter.parseWebhook({
      order: {
        id: "wert_order_1"
      },
      payment: {
        status: "failed"
      }
    });
    expect(parsed.externalRef).toBe("wert_order_1");
    expect(parsed.status).toBe("failed");
  });

  it("keeps mock webhook parser compatibility", () => {
    const adapter = new MockPaymentAdapter();
    const parsed = adapter.parseWebhook({
      externalRef: "mock_abc",
      status: "pending"
    });
    expect(parsed.externalRef).toBe("mock_abc");
    expect(parsed.status).toBe("pending");
  });
});
