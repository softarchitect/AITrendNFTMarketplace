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
  createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus }>;
  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus };
}

export class MockPaymentAdapter implements PaymentAdapter {
  public readonly providerName = "mock";

  async createSession(): Promise<{ externalRef: string; status: PaymentStatus }> {
    return { externalRef: `mock_${randomUUID()}`, status: "pending" };
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    return parseWebhookDefault(payload);
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

  async createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus }> {
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
    return { externalRef, status };
  }

  parseWebhook(payload: unknown): { externalRef: string; status: PaymentStatus } {
    return parseWebhookDefault(payload);
  }
}

export class VellisPaymentAdapter implements PaymentAdapter {
  public readonly providerName = "vellis";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly createSessionPath: string
  ) {}

  async createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus }> {
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
    return { externalRef, status };
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
}

export class WertPaymentAdapter implements PaymentAdapter {
  public readonly providerName = "wert";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly createSessionPath: string
  ) {}

  async createSession(input: CreateSessionInput): Promise<{ externalRef: string; status: PaymentStatus }> {
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
    return { externalRef, status };
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
    return true;
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
