import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function verifyPassword(password: string, plainPassword: string, hashedPassword?: string): boolean {
  if (hashedPassword) {
    const parts = hashedPassword.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const expectedHex = parts[3];
    if (!Number.isFinite(iterations) || iterations <= 0 || !salt || !expectedHex) {
      return false;
    }
    const actualHex = pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
    return safeCompare(actualHex, expectedHex);
  }
  return safeCompare(password, plainPassword);
}

export function hashPassword(password: string, iterations = 210000, salt?: string): string {
  const saltValue = salt ?? randomBytes(16).toString("hex");
  const hashHex = pbkdf2Sync(password, saltValue, iterations, 64, "sha512").toString("hex");
  return `pbkdf2$${iterations}$${saltValue}$${hashHex}`;
}

export function validatePasswordComplexity(password: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 10) {
    errors.push("Password must be at least 10 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must include at least one number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must include at least one special character");
  }
  return { ok: errors.length === 0, errors };
}

