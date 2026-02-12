import { createHash } from "crypto";

export interface IpfsProvider {
  pinJson(payload: unknown): Promise<{ cid: string }>;
}

export class MockIpfsProvider implements IpfsProvider {
  async pinJson(payload: unknown): Promise<{ cid: string }> {
    const cid = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex")
      .slice(0, 46);
    return { cid: `bafy${cid}` };
  }
}

export class GenericHttpIpfsProvider implements IpfsProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly pinJsonPath: string
  ) {}

  async pinJson(payload: unknown): Promise<{ cid: string }> {
    const response = await fetch(`${this.baseUrl}${this.pinJsonPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ data: payload })
    });

    if (!response.ok) {
      throw new Error(`IPFS pin failed with status ${response.status}`);
    }

    const body = (await response.json()) as Record<string, unknown>;
    const cid = (body.cid as string | undefined) ?? (body.IpfsHash as string | undefined);
    if (!cid) {
      throw new Error("IPFS provider response missing CID");
    }
    return { cid };
  }
}

export class PinataIpfsProvider implements IpfsProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly pinJsonPath: string,
    private readonly credentials: {
      jwt?: string;
      apiKey?: string;
      apiSecret?: string;
    }
  ) {}

  async pinJson(payload: unknown): Promise<{ cid: string }> {
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (this.credentials.jwt) {
      headers.authorization = `Bearer ${this.credentials.jwt}`;
    } else if (this.credentials.apiKey && this.credentials.apiSecret) {
      headers.pinata_api_key = this.credentials.apiKey;
      headers.pinata_secret_api_key = this.credentials.apiSecret;
    } else {
      throw new Error("Pinata credentials missing. Provide IPFS_API_JWT or IPFS_API_KEY + IPFS_API_SECRET.");
    }

    const response = await fetch(`${this.baseUrl}${this.pinJsonPath}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        pinataContent: payload
      })
    });

    if (!response.ok) {
      const details = await safeResponseText(response);
      throw new Error(`Pinata pin failed with status ${response.status}${details ? ` - ${details}` : ""}`);
    }

    const body = (await response.json()) as Record<string, unknown>;
    const cid = (body.IpfsHash as string | undefined) ?? (body.cid as string | undefined);
    if (!cid) {
      throw new Error("Pinata response missing IpfsHash");
    }
    return { cid };
  }
}

async function safeResponseText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}
