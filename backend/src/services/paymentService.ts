import { config } from "../config";
import { InMemoryStore } from "../store/inMemoryStore";
import { PaymentRecord, PaymentStatus } from "../types";
import {
  CreateSessionInput,
  GenericHttpPaymentAdapter,
  MockPaymentAdapter,
  NowPaymentsAdapter,
  PaymentAdapter,
  VellisPaymentAdapter,
  WertPaymentAdapter,
  normalizePaymentStatus,
  verifyWebhookSignature
} from "./payment/adapters";

export class PaymentService {
  private readonly staticAdapter?: PaymentAdapter;

  constructor(
    private readonly db: InMemoryStore,
    adapter?: PaymentAdapter
  ) {
    if (adapter) {
      this.staticAdapter = adapter;
      return;
    }
  }

  private resolveAdapter(): PaymentAdapter {
    if (this.staticAdapter) {
      return this.staticAdapter;
    }

    const { provider, mode } = this.db.gatewaySettings;
    if (mode === "sandbox" || provider === "mock") {
      return new MockPaymentAdapter();
    }

    if (!config.payment.apiBaseUrl || !config.payment.apiKey) {
      throw new Error("Payment provider is enabled but PAYMENT_API_BASE_URL / PAYMENT_API_KEY are missing.");
    }
    if (provider === "vellis") {
      return new VellisPaymentAdapter(config.payment.apiBaseUrl, config.payment.apiKey, config.payment.createSessionPath);
    }
    if (provider === "wert") {
      return new WertPaymentAdapter(config.payment.apiBaseUrl, config.payment.apiKey, config.payment.createSessionPath);
    }
    if (provider === "nowpayments") {
      return new NowPaymentsAdapter(config.payment.apiBaseUrl, config.payment.apiKey, config.payment.createSessionPath);
    }
    if (provider === "generic") {
      return new GenericHttpPaymentAdapter(config.payment.apiBaseUrl, config.payment.apiKey, config.payment.createSessionPath);
    }
    return new MockPaymentAdapter();
  }

  getGatewayConfig(): { provider: string; mode: "sandbox" | "live" } {
    const settings = this.db.gatewaySettings;
    return {
      provider: settings.provider,
      mode: settings.mode
    };
  }

  async createPaymentSession(input: CreateSessionInput): Promise<{ payment: PaymentRecord; checkoutUrl?: string }> {
    const adapter = this.resolveAdapter();
    const session = await adapter.createSession(input);
    const payment = this.db.createPayment({
      externalRef: session.externalRef,
      amountUsd: input.amountUsd,
      currency: input.currency,
      status: session.status
    });
    return { payment, checkoutUrl: session.checkoutUrl };
  }

  updateByExternalRef(externalRef: string, status: PaymentStatus): PaymentRecord {
    const payment = [...this.db.payments.values()].find((item) => item.externalRef === externalRef);
    if (!payment) {
      throw new Error(`Payment for externalRef ${externalRef} not found`);
    }
    return this.db.updatePayment(payment.id, { status });
  }

  isValidWebhookSignature(payload: unknown, signature: string | undefined): boolean {
    if (!this.db.gatewaySettings.webhookVerificationEnabled) {
      return true;
    }
    return verifyWebhookSignature(payload, signature);
  }

  normalizeStatus(statusValue: string): PaymentStatus {
    return normalizePaymentStatus(statusValue);
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    return this.resolveAdapter().parseWebhook(payload);
  }

  async healthCheck(): Promise<{ provider: string; ok: boolean; detail: string }> {
    const adapter = this.resolveAdapter();
    const result = await adapter.probeConnection();
    return {
      provider: adapter.providerName,
      ok: result.ok,
      detail: result.detail
    };
  }
}
