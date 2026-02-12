import { config } from "../config";
import { InMemoryStore } from "../store/inMemoryStore";
import { PaymentRecord, PaymentStatus } from "../types";
import {
  CreateSessionInput,
  GenericHttpPaymentAdapter,
  MockPaymentAdapter,
  PaymentAdapter,
  VellisPaymentAdapter,
  WertPaymentAdapter,
  normalizePaymentStatus,
  verifyWebhookSignature
} from "./payment/adapters";

export class PaymentService {
  private readonly adapter: PaymentAdapter;

  constructor(
    private readonly db: InMemoryStore,
    adapter?: PaymentAdapter
  ) {
    if (adapter) {
      this.adapter = adapter;
      return;
    }

    if (config.features.mockPayment || config.payment.provider === "mock") {
      this.adapter = new MockPaymentAdapter();
      return;
    }

    if (!config.payment.apiBaseUrl || !config.payment.apiKey) {
      throw new Error("Payment provider is enabled but PAYMENT_API_BASE_URL / PAYMENT_API_KEY are missing.");
    }
    if (config.payment.provider === "vellis") {
      this.adapter = new VellisPaymentAdapter(
        config.payment.apiBaseUrl,
        config.payment.apiKey,
        config.payment.createSessionPath
      );
      return;
    }
    if (config.payment.provider === "wert") {
      this.adapter = new WertPaymentAdapter(
        config.payment.apiBaseUrl,
        config.payment.apiKey,
        config.payment.createSessionPath
      );
      return;
    }

    this.adapter = new GenericHttpPaymentAdapter(config.payment.apiBaseUrl, config.payment.apiKey, config.payment.createSessionPath);
  }

  async createPaymentSession(input: CreateSessionInput): Promise<PaymentRecord> {
    const session = await this.adapter.createSession(input);
    return this.db.createPayment({
      externalRef: session.externalRef,
      amountUsd: input.amountUsd,
      currency: input.currency,
      status: session.status
    });
  }

  updateByExternalRef(externalRef: string, status: PaymentStatus): PaymentRecord {
    const payment = [...this.db.payments.values()].find((item) => item.externalRef === externalRef);
    if (!payment) {
      throw new Error(`Payment for externalRef ${externalRef} not found`);
    }
    return this.db.updatePayment(payment.id, { status });
  }

  isValidWebhookSignature(payload: unknown, signature: string | undefined): boolean {
    return verifyWebhookSignature(payload, signature);
  }

  normalizeStatus(statusValue: string): PaymentStatus {
    return normalizePaymentStatus(statusValue);
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    return this.adapter.parseWebhook(payload);
  }
}
