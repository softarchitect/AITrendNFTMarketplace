import { randomBytes, randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";
import { hashPassword, validatePasswordComplexity, verifyPassword } from "../security/password";
import { Services } from "../services/serviceContainer";

const USER_SESSION_TTL_MINUTES = 60 * 24;

export function createAuthRoutes(services: Services): Router {
  const router = Router();

  function serializeCurrentUser(user: {
    id: string;
    email: string;
    displayName: string;
    role: "User";
    kycStatus: "NotStarted" | "Pending" | "Verified" | "Rejected";
    twoFAEnabled: boolean;
    walletAddresses: string[];
    notificationPreferences: {
      newDrops: boolean;
      purchaseConfirmations: boolean;
      transferUpdates: boolean;
      platformAnnouncements: boolean;
    };
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      kycStatus: user.kycStatus,
      twoFAEnabled: user.twoFAEnabled,
      walletAddresses: user.walletAddresses ?? [],
      notificationPreferences: {
        newDrops: user.notificationPreferences?.newDrops ?? true,
        purchaseConfirmations: user.notificationPreferences?.purchaseConfirmations ?? true,
        transferUpdates: user.notificationPreferences?.transferUpdates ?? true,
        platformAnnouncements: user.notificationPreferences?.platformAnnouncements ?? true
      }
    };
  }

  function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
  }

  function issueSession(input: { userId: string; email: string; displayName: string; role: "User" }) {
    const token = `usr_${randomUUID()}_${randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + USER_SESSION_TTL_MINUTES * 60 * 1000).toISOString();
    services.db.createUserSession({
      token,
      userId: input.userId,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      expiresAt
    });
    return { token, expiresAt };
  }

  router.post("/register", (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(2).max(80)
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const email = parsed.data.email.toLowerCase();
    const existing = services.db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const complexity = validatePasswordComplexity(parsed.data.password);
    if (!complexity.ok) {
      return res.status(400).json({ error: complexity.errors });
    }

    const user = services.db.upsertUser({
      email,
      passwordHash: hashPassword(parsed.data.password),
      displayName: parsed.data.displayName,
      role: "User",
      kycStatus: "NotStarted",
      twoFAEnabled: false,
      isActive: true
    });
    services.db.markUserLogin(user.id);
    const session = issueSession({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    });
    services.db.appendAuditLog("user_registered", user.email, { userId: user.id, email: user.email });
    return res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  });

  router.post("/login", (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const email = parsed.data.email.toLowerCase();
    const user = services.db.findUserByEmail(email);
    const credentialsOk = Boolean(
      user && user.isActive && verifyPassword(parsed.data.password, "", user.passwordHash)
    );
    if (!credentialsOk || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    services.db.markUserLogin(user.id);
    const session = issueSession({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    });
    services.db.appendAuditLog("user_login", user.email, { userId: user.id, email: user.email });
    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  });

  router.get("/session", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const session = services.db.getUserSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    return res.json({
      expiresAt: session.expiresAt,
      user: {
        id: session.userId,
        email: session.email,
        displayName: session.displayName,
        role: session.role
      }
    });
  });

  router.post("/logout", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (token) {
      services.db.removeUserSession(token);
    }
    return res.status(204).send();
  });

  router.get("/me", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const session = services.db.getUserSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    const user = services.db.users.get(session.userId);
    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      ...serializeCurrentUser(user)
    });
  });

  router.patch("/me", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const session = services.db.getUserSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    const current = services.db.users.get(session.userId);
    if (!current || !current.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    const schema = z.object({
      email: z.string().email().optional(),
      displayName: z.string().min(2).max(80).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (!parsed.data.email && !parsed.data.displayName) {
      return res.status(400).json({ error: "No profile fields provided" });
    }

    if (parsed.data.email) {
      const existingByEmail = services.db.findUserByEmail(parsed.data.email);
      if (existingByEmail && existingByEmail.id !== current.id) {
        return res.status(409).json({ error: "Another user already uses this email" });
      }
    }

    const updated = services.db.updateUser(current.id, {
      email: parsed.data.email?.toLowerCase(),
      displayName: parsed.data.displayName
    });
    services.db.createUserSession({
      token: session.token,
      userId: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      expiresAt: session.expiresAt
    });
    services.db.appendAuditLog("user_profile_updated", updated.email, {
      userId: updated.id,
      updatedFields: Object.keys(parsed.data)
    });
    return res.json({
      ...serializeCurrentUser(updated)
    });
  });

  router.patch("/me/security", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const session = services.db.getUserSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    const current = services.db.users.get(session.userId);
    if (!current || !current.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    const schema = z.object({
      twoFAEnabled: z.boolean()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const updated = services.db.updateUser(current.id, {
      twoFAEnabled: parsed.data.twoFAEnabled
    });
    services.db.appendAuditLog("user_2fa_updated", updated.email, {
      userId: updated.id,
      twoFAEnabled: updated.twoFAEnabled
    });
    return res.json({
      ...serializeCurrentUser(updated)
    });
  });

  router.patch("/me/wallets", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const session = services.db.getUserSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    const current = services.db.users.get(session.userId);
    if (!current || !current.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    const schema = z.object({
      action: z.enum(["add", "remove"]),
      walletAddress: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "walletAddress must be a valid EVM address")
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const normalized = parsed.data.walletAddress.toLowerCase();
    const currentWallets = Array.from(new Set((current.walletAddresses ?? []).map((item) => item.toLowerCase())));
    const nextWallets =
      parsed.data.action === "add"
        ? Array.from(new Set([...currentWallets, normalized]))
        : currentWallets.filter((item) => item !== normalized);
    const updated = services.db.updateUser(current.id, {
      walletAddresses: nextWallets
    });
    services.db.appendAuditLog(
      parsed.data.action === "add" ? "user_wallet_linked" : "user_wallet_removed",
      updated.email,
      { userId: updated.id, walletAddress: normalized }
    );
    return res.json(serializeCurrentUser(updated));
  });

  router.patch("/me/notifications", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const session = services.db.getUserSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    const current = services.db.users.get(session.userId);
    if (!current || !current.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    const schema = z.object({
      newDrops: z.boolean().optional(),
      purchaseConfirmations: z.boolean().optional(),
      transferUpdates: z.boolean().optional(),
      platformAnnouncements: z.boolean().optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "No notification fields provided" });
    }
    const currentPreferences = current.notificationPreferences ?? {
      newDrops: true,
      purchaseConfirmations: true,
      transferUpdates: true,
      platformAnnouncements: true
    };
    const updated = services.db.updateUser(current.id, {
      notificationPreferences: {
        ...currentPreferences,
        ...parsed.data
      }
    });
    services.db.appendAuditLog("user_notifications_updated", updated.email, {
      userId: updated.id,
      updatedFields: Object.keys(parsed.data)
    });
    return res.json(serializeCurrentUser(updated));
  });

  router.post("/change-password", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const session = services.db.getUserSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    const current = services.db.users.get(session.userId);
    if (!current || !current.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8)
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const currentPasswordValid = verifyPassword(parsed.data.currentPassword, "", current.passwordHash);
    if (!currentPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    const complexity = validatePasswordComplexity(parsed.data.newPassword);
    if (!complexity.ok) {
      return res.status(400).json({ error: complexity.errors });
    }

    services.db.updateUser(current.id, {
      passwordHash: hashPassword(parsed.data.newPassword)
    });
    services.db.appendAuditLog("user_password_changed", current.email, { userId: current.id });
    return res.status(204).send();
  });

  return router;
}
