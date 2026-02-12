import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  BACKEND_PUBLIC_BASE_URL: z.string().url().optional(),
  NODE_ENV: z.string().default("development"),
  CHAIN_ID: z.coerce.number().default(11155111),
  RPC_URL: z.string().url().optional(),
  CONTRACT_ADDRESS: z.string().default(""),
  MINTER_PRIVATE_KEY: z.string().optional(),
  MINT_CAP_PER_DAY: z.coerce.number().default(50),
  MINT_CAP_PER_HOUR: z.coerce.number().default(10),
  DEFAULT_SERIES_ID: z.coerce.number().default(1),
  DEFAULT_EDITION_SIZE: z.coerce.number().default(25),
  ENABLE_MOCK_AI: z.string().default("true"),
  ENABLE_MOCK_IPFS: z.string().default("true"),
  ENABLE_MOCK_PAYMENT: z.string().default("true"),
  PAYMENT_PROVIDER: z.enum(["mock", "generic", "vellis", "wert"]).default("mock"),
  PAYMENT_API_BASE_URL: z.string().url().optional(),
  PAYMENT_API_KEY: z.string().optional(),
  PAYMENT_CREATE_SESSION_PATH: z.string().default("/sessions"),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SIGNATURE_HEADER: z.string().default("x-payment-signature"),
  AI_PROVIDER: z.enum(["mock", "generic", "huggingface"]).default("mock"),
  AI_API_BASE_URL: z.string().url().optional(),
  AI_API_KEY: z.string().optional(),
  AI_GENERATE_PATH: z.string().default("/generate"),
  AI_HF_MODEL_ID: z.string().default("stabilityai/stable-diffusion-xl-base-1.0"),
  AI_HF_MODEL_PATH_PREFIX: z.string().default("/hf-inference/models"),
  AI_IMAGE_WIDTH: z.coerce.number().default(512),
  AI_IMAGE_HEIGHT: z.coerce.number().default(512),
  IPFS_PROVIDER: z.enum(["mock", "generic", "pinata"]).default("pinata"),
  IPFS_API_BASE_URL: z.string().url().optional(),
  IPFS_API_KEY: z.string().optional(),
  IPFS_API_SECRET: z.string().optional(),
  IPFS_API_JWT: z.string().optional(),
  IPFS_PIN_JSON_PATH: z.string().default("/pin/json")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

const env = parsed.data;

const asBool = (value: string): boolean => value.toLowerCase() === "true";

export const config = {
  port: env.PORT,
  publicBaseUrl: env.BACKEND_PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`,
  nodeEnv: env.NODE_ENV,
  chainId: env.CHAIN_ID,
  rpcUrl: env.RPC_URL,
  contractAddress: env.CONTRACT_ADDRESS,
  minterPrivateKey: env.MINTER_PRIVATE_KEY,
  mintCapPerDay: env.MINT_CAP_PER_DAY,
  mintCapPerHour: env.MINT_CAP_PER_HOUR,
  defaultSeriesId: env.DEFAULT_SERIES_ID,
  defaultEditionSize: env.DEFAULT_EDITION_SIZE,
  features: {
    mockAi: asBool(env.ENABLE_MOCK_AI),
    mockIpfs: asBool(env.ENABLE_MOCK_IPFS),
    mockPayment: asBool(env.ENABLE_MOCK_PAYMENT)
  },
  payment: {
    provider: env.PAYMENT_PROVIDER,
    apiBaseUrl: env.PAYMENT_API_BASE_URL,
    apiKey: env.PAYMENT_API_KEY,
    createSessionPath: env.PAYMENT_CREATE_SESSION_PATH,
    webhookSecret: env.PAYMENT_WEBHOOK_SECRET,
    webhookSignatureHeader: env.PAYMENT_WEBHOOK_SIGNATURE_HEADER.toLowerCase()
  },
  ai: {
    provider: env.AI_PROVIDER,
    apiBaseUrl: env.AI_API_BASE_URL,
    apiKey: env.AI_API_KEY,
    generatePath: env.AI_GENERATE_PATH,
    hfModelId: env.AI_HF_MODEL_ID,
    hfModelPathPrefix: env.AI_HF_MODEL_PATH_PREFIX,
    imageWidth: env.AI_IMAGE_WIDTH,
    imageHeight: env.AI_IMAGE_HEIGHT
  },
  ipfs: {
    provider: env.IPFS_PROVIDER,
    apiBaseUrl: env.IPFS_API_BASE_URL,
    apiKey: env.IPFS_API_KEY,
    apiSecret: env.IPFS_API_SECRET,
    apiJwt: env.IPFS_API_JWT,
    pinJsonPath: env.IPFS_PIN_JSON_PATH
  }
};

export type AppConfig = typeof config;
