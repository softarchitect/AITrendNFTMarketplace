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
  ADMIN_PRIVATE_KEY: z.string().optional(),
  MINT_CAP_PER_DAY: z.coerce.number().default(50),
  MINT_CAP_PER_HOUR: z.coerce.number().default(10),
  DEFAULT_SERIES_ID: z.coerce.number().default(1),
  DEFAULT_EDITION_SIZE: z.coerce.number().default(25),
  ENABLE_MOCK_AI: z.string().default("true"),
  ENABLE_MOCK_IPFS: z.string().default("true"),
  ENABLE_MOCK_PAYMENT: z.string().default("true"),
  PAYMENT_PROVIDER: z.enum(["mock", "generic", "vellis", "wert", "nowpayments"]).default("mock"),
  PAYMENT_API_BASE_URL: z.string().url().optional(),
  PAYMENT_API_KEY: z.string().optional(),
  PAYMENT_CREATE_SESSION_PATH: z.string().default("/sessions"),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SIGNATURE_HEADER: z.string().default("x-payment-signature"),
  ALLOW_INSECURE_WEBHOOKS: z.string().default("false"),
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
  IPFS_PIN_JSON_PATH: z.string().default("/pin/json"),
  ADMIN_EMAIL: z.string().default("admin@affordablenft.local"),
  ADMIN_PASSWORD: z.string().default("admin123"),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_SESSION_TTL_MINUTES: z.coerce.number().default(720),
  ADMIN_LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  ADMIN_LOGIN_WINDOW_MINUTES: z.coerce.number().default(15),
  ADMIN_LOGIN_BLOCK_MINUTES: z.coerce.number().default(15),
  PERSISTENCE_DRIVER: z.enum(["file", "postgres"]).default("postgres"),
  ENABLE_FILE_PERSISTENCE: z.string().default("true"),
  STORE_FILE_PATH: z.string().default("./data/store.json"),
  DATABASE_URL: z.string().optional(),
  PG_HOST: z.string().default("localhost"),
  PG_PORT: z.coerce.number().default(5432),
  PG_USER: z.string().default("postgres"),
  PG_PASSWORD: z.string().default("123456"),
  PG_DATABASE: z.string().default("trendmint"),
  PG_SSL_MODE: z.enum(["disable", "require", "no-verify"]).default("disable"),
  TWITTER_BEARER_TOKEN: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  REDDIT_USER_AGENT: z.string().default("AffordableNFT/1.0"),
  GOOGLE_TRENDS_API_BASE_URL: z.string().url().optional(),
  GOOGLE_TRENDS_API_KEY: z.string().optional(),
  TREND_FETCH_LIMIT: z.coerce.number().default(10),
  TREND_POLL_INTERVAL_MINUTES: z.coerce.number().default(15)
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
const asUrl = (value: string): URL => {
  try {
    return new URL(value);
  } catch {
    throw new Error("Invalid DATABASE_URL: expected valid postgres connection URL");
  }
};

const databaseUrl = env.DATABASE_URL?.trim() ? env.DATABASE_URL.trim() : undefined;
const parsedDatabaseUrl = databaseUrl ? asUrl(databaseUrl) : undefined;
const sslModeFromUrl = parsedDatabaseUrl?.searchParams.get("sslmode")?.toLowerCase();
const resolvedPgSslMode =
  env.PG_SSL_MODE !== "disable"
    ? env.PG_SSL_MODE
    : sslModeFromUrl === "require" || sslModeFromUrl === "verify-ca" || sslModeFromUrl === "verify-full"
      ? "require"
      : "disable";

const postgresHost = parsedDatabaseUrl?.hostname || env.PG_HOST;
const postgresPort = parsedDatabaseUrl?.port ? Number(parsedDatabaseUrl.port) : env.PG_PORT;
const postgresUser = parsedDatabaseUrl?.username
  ? decodeURIComponent(parsedDatabaseUrl.username)
  : env.PG_USER;
const postgresPassword = parsedDatabaseUrl?.password
  ? decodeURIComponent(parsedDatabaseUrl.password)
  : env.PG_PASSWORD;
const postgresDatabase =
  parsedDatabaseUrl?.pathname && parsedDatabaseUrl.pathname !== "/"
    ? decodeURIComponent(parsedDatabaseUrl.pathname.slice(1))
    : env.PG_DATABASE;

const postgresSsl =
  resolvedPgSslMode === "disable"
    ? false
    : {
        rejectUnauthorized: resolvedPgSslMode !== "no-verify"
      };

const isLivePaymentMode = !asBool(env.ENABLE_MOCK_PAYMENT) && env.PAYMENT_PROVIDER !== "mock";
if (isLivePaymentMode && !env.PAYMENT_WEBHOOK_SECRET && !asBool(env.ALLOW_INSECURE_WEBHOOKS)) {
  throw new Error(
    "PAYMENT_WEBHOOK_SECRET is required in live payment mode. Set ALLOW_INSECURE_WEBHOOKS=true only for temporary non-production testing."
  );
}

export const config = {
  port: env.PORT,
  publicBaseUrl: env.BACKEND_PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`,
  nodeEnv: env.NODE_ENV,
  chainId: env.CHAIN_ID,
  rpcUrl: env.RPC_URL,
  contractAddress: env.CONTRACT_ADDRESS,
  minterPrivateKey: env.MINTER_PRIVATE_KEY,
  adminPrivateKey: env.ADMIN_PRIVATE_KEY,
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
    webhookSignatureHeader: env.PAYMENT_WEBHOOK_SIGNATURE_HEADER.toLowerCase(),
    allowInsecureWebhooks: asBool(env.ALLOW_INSECURE_WEBHOOKS)
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
  },
  admin: {
    email: env.ADMIN_EMAIL.toLowerCase(),
    password: env.ADMIN_PASSWORD,
    passwordHash: env.ADMIN_PASSWORD_HASH,
    sessionTtlMinutes: env.ADMIN_SESSION_TTL_MINUTES,
    loginMaxAttempts: env.ADMIN_LOGIN_MAX_ATTEMPTS,
    loginWindowMinutes: env.ADMIN_LOGIN_WINDOW_MINUTES,
    loginBlockMinutes: env.ADMIN_LOGIN_BLOCK_MINUTES
  },
  persistence: {
    driver: env.PERSISTENCE_DRIVER,
    enabled: asBool(env.ENABLE_FILE_PERSISTENCE) && env.NODE_ENV !== "test",
    storeFilePath: env.STORE_FILE_PATH,
    postgres: {
      connectionString: databaseUrl,
      host: postgresHost,
      port: postgresPort,
      user: postgresUser,
      password: postgresPassword,
      database: postgresDatabase,
      ssl: postgresSsl
    }
  },
  trends: {
    twitterBearerToken: env.TWITTER_BEARER_TOKEN,
    redditClientId: env.REDDIT_CLIENT_ID,
    redditClientSecret: env.REDDIT_CLIENT_SECRET,
    redditUserAgent: env.REDDIT_USER_AGENT,
    googleTrendsApiBaseUrl: env.GOOGLE_TRENDS_API_BASE_URL,
    googleTrendsApiKey: env.GOOGLE_TRENDS_API_KEY,
    fetchLimit: env.TREND_FETCH_LIMIT,
    pollIntervalMinutes: env.TREND_POLL_INTERVAL_MINUTES
  }
};

export type AppConfig = typeof config;
