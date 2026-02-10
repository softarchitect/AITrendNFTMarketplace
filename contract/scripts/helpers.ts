import fs from "fs";
import path from "path";

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v.trim();
}

export function optionalEnv(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  if (!v || v.trim().length === 0) return fallback;
  return v.trim();
}

export function loadDeploymentAddress(networkName: string): string | undefined {
  const file = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(file)) return undefined;
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return parsed?.TrendMint721?.address;
}

