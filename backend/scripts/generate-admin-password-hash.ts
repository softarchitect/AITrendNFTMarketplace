import { pbkdf2Sync, randomBytes } from "crypto";

const password = process.argv[2];
const iterations = Number(process.argv[3] ?? 210000);

if (!password) {
  console.error("Usage: npm run admin:hash -- <password> [iterations]");
  process.exit(1);
}

if (!Number.isFinite(iterations) || iterations <= 0) {
  console.error("Iterations must be a positive number.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hashHex = pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
console.log(`pbkdf2$${iterations}$${salt}$${hashHex}`);

