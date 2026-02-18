import { createHmac, randomUUID } from "crypto";
import { timingSafeEqual } from "crypto";
import { config } from "../../config";
import { PaymentStatus } from "../../types";

export interface CreateSessionInput {
  amountUsd: number;
  currency: string;
}

export interface PaymentAdapter {
  providerName: string;
  createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus; checkoutUrl?: string }>;
  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus };
  probeConnection(): Promise<{ ok: boolean; detail: string }>;
}

export class MockPaymentAdapter implements PaymentAdapter {
  public readonly providerName = "mock";

  async createSession(): Promise<{ externalRef: string; status: PaymentStatus; checkoutUrl?: string }> {
    const externalRef = `mock_${randomUUID()}`;
    return {
      externalRef,
      status: "pending",
      checkoutUrl: `https://sandbox-gateway.local/session/${externalRef}`
    };
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    return parseWebhookDefault(payload);
  }

  async probeConnection(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: "Mock adapter active" };
  }
}

export class GenericHttpPaymentAdapter implements PaymentAdapter {
  public readonly providerName: string;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly createSessionPath: string,
    providerName = "generic"
  ) {
    this.providerName = providerName;
  }

  async createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus; checkoutUrl?: string }> {
    const response = await fetch(`${this.baseUrl}${this.createSessionPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        amount: input.amountUsd,
        currency: input.currency,
        metadata: {
          purpose: "trendmint_purchase"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Payment session creation failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const externalRef =
      (payload.externalRef as string | undefined) ??
      (payload.sessionId as string | undefined) ??
      (payload.id as string | undefined);

    if (!externalRef) {
      throw new Error("Payment provider response missing external reference");
    }

    const rawStatus = String(payload.status ?? "pending");
    const status = normalizePaymentStatus(rawStatus);
    const checkoutUrl =
      (payload.checkoutUrl as string | undefined) ??
      (payload.checkout_url as string | undefined) ??
      (payload.url as string | undefined) ??
      (payload.paymentUrl as string | undefined);
    return { externalRef, status, checkoutUrl };
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    return parseWebhookDefault(payload);
  }

  async probeConnection(): Promise<{ ok: boolean; detail: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          authorization: `Bearer ${this.apiKey}`
        }
      });
      return {
        ok: response.status < 500,
        detail: `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "Probe failed"
      };
    }
  }
}

export class VellisPaymentAdapter implements PaymentAdapter {
  public readonly providerName = "vellis";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly createSessionPath: string
  ) {}

  async createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus; checkoutUrl?: string }> {
    const response = await fetch(`${this.baseUrl}${this.createSessionPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        amount: input.amountUsd,
        currency: input.currency,
        intent: "nft_purchase",
        metadata: {
          project: "trendmint"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Vellis session creation failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const externalRef =
      (payload.transactionId as string | undefined) ??
      (payload.sessionId as string | undefined) ??
      (payload.id as string | undefined);

    if (!externalRef) {
      throw new Error("Vellis response missing transaction reference");
    }

    const status = normalizePaymentStatus(String(payload.status ?? payload.state ?? "pending"));
    const checkoutUrl =
      (payload.checkoutUrl as string | undefined) ??
      (payload.checkout_url as string | undefined) ??
      (payload.url as string | undefined) ??
      (payload.paymentUrl as string | undefined);
    return { externalRef, status, checkoutUrl };
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    const parsed = objectFromUnknown(payload);
    const event = objectFromUnknown(parsed.event);
    const data = objectFromUnknown(parsed.data);
    const externalRef =
      asString(event.transactionId) ??
      asString(data.transactionId) ??
      asString(parsed.transactionId) ??
      asString(parsed.externalRef);
    const statusRaw =
      asString(event.status) ?? asString(data.status) ?? asString(parsed.status) ?? asString(parsed.state);

    if (!externalRef || !statusRaw) {
      throw new Error("Invalid Vellis webhook payload");
    }
    return { externalRef, status: normalizePaymentStatus(statusRaw) };
  }

  async probeConnection(): Promise<{ ok: boolean; detail: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          authorization: `Bearer ${this.apiKey}`
        }
      });
      return {
        ok: response.status < 500,
        detail: `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "Probe failed"
      };
    }
  }
}

export class WertPaymentAdapter implements PaymentAdapter {
  public readonly providerName = "wert";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly createSessionPath: string
  ) {}

  async createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus; checkoutUrl?: string }> {
    const response = await fetch(`${this.baseUrl}${this.createSessionPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify({
        amount: input.amountUsd,
        currency: input.currency,
        commodity: "nft",
        metadata: {
          marketplace: "trendmint"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Wert session creation failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const externalRef =
      (payload.order_id as string | undefined) ??
      (payload.orderId as string | undefined) ??
      (payload.id as string | undefined);

    if (!externalRef) {
      throw new Error("Wert response missing order reference");
    }

    const status = normalizePaymentStatus(String(payload.status ?? "pending"));
    const checkoutUrl =
      (payload.checkoutUrl as string | undefined) ??
      (payload.checkout_url as string | undefined) ??
      (payload.url as string | undefined) ??
      (payload.paymentUrl as string | undefined);
    return { externalRef, status, checkoutUrl };
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    const parsed = objectFromUnknown(payload);
    const order = objectFromUnknown(parsed.order);
    const payment = objectFromUnknown(parsed.payment);
    const externalRef =
      asString(order.id) ??
      asString(order.order_id) ??
      asString(parsed.order_id) ??
      asString(parsed.externalRef);
    const statusRaw = asString(payment.status) ?? asString(parsed.status) ?? asString(order.status);

    if (!externalRef || !statusRaw) {
      throw new Error("Invalid Wert webhook payload");
    }
    return { externalRef, status: normalizePaymentStatus(statusRaw) };
  }

  async probeConnection(): Promise<{ ok: boolean; detail: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey
        }
      });
      return {
        ok: response.status < 500,
        detail: `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "Probe failed"
      };
    }
  }
}

export class NowPaymentsAdapter implements PaymentAdapter {
  public readonly providerName = "nowpayments";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly createSessionPath: string
  ) {}

  async createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus; checkoutUrl?: string }> {
    const response = await fetch(`${this.baseUrl}${this.createSessionPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify({
        price_amount: Number(input.amountUsd.toFixed(2)),
        price_currency: input.currency.toLowerCase(),
        order_description: "TrendMint NFT purchase",
        is_fixed_rate: true,
        is_fee_paid_by_user: false
      })
    });

    if (!response.ok) {
      const details = await safeResponseText(response);
      throw new Error(`NowPayments session creation failed with status ${response.status}${details ? ` - ${details}` : ""}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const externalRef =
      (payload.id as string | undefined) ??
      (payload.order_id as string | undefined) ??
      (payload.orderId as string | undefined);
    const checkoutUrl =
      (payload.invoice_url as string | undefined) ??
      (payload.invoiceUrl as string | undefined) ??
      (payload.payment_url as string | undefined) ??
      (payload.paymentUrl as string | undefined) ??
      (payload.url as string | undefined);

    if (!externalRef) {
      throw new Error("NowPayments response missing transaction reference");
    }
    if (!checkoutUrl) {
      throw new Error("NowPayments response missing checkout URL");
    }

    const status = normalizePaymentStatus(String(payload.payment_status ?? payload.status ?? "pending"));
    return { externalRef, status, checkoutUrl };
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    const parsed = objectFromUnknown(payload);
    const externalRef =
      asString(parsed.payment_id) ??
      asString(parsed.id) ??
      asString(parsed.order_id) ??
      asString(parsed.externalRef);
    const statusRaw = asString(parsed.payment_status) ?? asString(parsed.status);
    if (!externalRef || !statusRaw) {
      throw new Error("Invalid NowPayments webhook payload");
    }
    return { externalRef, status: normalizePaymentStatus(statusRaw) };
  }

  async probeConnection(): Promise<{ ok: boolean; detail: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey
        }
      });
      return {
        ok: response.status < 500,
        detail: `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        ok: false,
        detail: error instanceof Error ? error.message : "Probe failed"
      };
    }
  }
}

export function normalizePaymentStatus(value: string): PaymentStatus {
  const normalized = value.toLowerCase();
  if (normalized === "confirmed" || normalized === "succeeded" || normalized === "paid") {
    return "confirmed";
  }
  if (normalized === "failed" || normalized === "cancelled") {
    return "failed";
  }
  if (normalized === "refunded") {
    return "refunded";
  }
  if (normalized === "created") {
    return "created";
  }
  return "pending";
}

export function signWebhookPayload(payload: unknown, secret: string): string {
  return createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

export function verifyWebhookSignature(payload: unknown, signature: string | undefined): boolean {
  if (!config.payment.webhookSecret) {
    return config.features.mockPayment || config.payment.provider === "mock" || config.payment.allowInsecureWebhooks;
  }
  if (!signature) {
    return false;
  }

  const expected = signWebhookPayload(payload, config.payment.webhookSecret);
  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function parseWebhookDefault(payload: unknown): { externalRef: string; status: PaymentStatus } {
  const parsed = objectFromUnknown(payload);
  const externalRef =
    asString(parsed.externalRef) ?? asString(parsed.sessionId) ?? asString(parsed.id) ?? asString(parsed.paymentId);
  const statusRaw =
    asString(parsed.status) ??
    asString(parsed.paymentStatus) ??
    asString(parsed.state) ??
    asString(parsed.eventStatus);

  if (!externalRef || !statusRaw) {
    throw new Error("Invalid generic webhook payload");
  }

  return { externalRef, status: normalizePaymentStatus(statusRaw) };
}

function objectFromUnknown(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

async function safeResponseText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}
