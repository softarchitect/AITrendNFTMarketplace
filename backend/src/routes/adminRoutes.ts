import { Router } from "express";
import { createHash, randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import { config } from "../config";
import { hashPassword, validatePasswordComplexity, verifyPassword } from "../security/password";
import { Services } from "../services/serviceContainer";
import { checkPersistenceHealth } from "../store/inMemoryStore";

export function createAdminRoutes(services: Services): Router {
  const router = Router();
  const seriesSnapshotCache: {
    seriesIds: number[];
    updatedAt: number;
  } = {
    seriesIds: [],
    updatedAt: 0
  };
  const loginAttempts = new Map<
    string,
    {
      firstAttemptAt: number;
      count: number;
      blockedUntil?: number;
    }
  >();

  function appendAuditLog(action: string, details: Record<string, unknown>, actor = "admin") {
    services.db.appendAuditLog(action, actor, details);
  }

  function serializeAdminUser(user: {
    id: string;
    email: string;
    displayName: string;
    role: "Admin";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  function serializeUser(user: {
    id: string;
    email: string;
    displayName: string;
    role: "User";
    kycStatus: "NotStarted" | "Pending" | "Verified" | "Rejected";
    twoFAEnabled: boolean;
    walletAddresses: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      kycStatus: user.kycStatus,
      twoFAEnabled: user.twoFAEnabled,
      isActive: user.isActive,
      walletAddresses: user.walletAddresses ?? [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  function serializePartnerApiKey(item: {
    id: string;
    label: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt: string;
    permissions: Array<"BulkPurchase" | "Transfer" | "Relist">;
  }) {
    return {
      id: item.id,
      label: item.label,
      keyPrefix: item.keyPrefix,
      createdAt: item.createdAt,
      lastUsedAt: item.lastUsedAt,
      permissions: item.permissions
    };
  }

  function extractPartnerKeyUsage(lastDays = 7): Array<{
    keyId: string;
    requests: number;
    errors: number;
    lastCallAt: string;
  }> {
    const since = Date.now() - lastDays * 24 * 60 * 60 * 1000;
    const usage = new Map<string, { requests: number; errors: number; lastCallAt: string }>();
    for (const entry of services.db.auditLogs) {
      if (entry.action !== "partner_api_call") continue;
      const createdAtMs = new Date(entry.createdAt).getTime();
      if (!Number.isFinite(createdAtMs) || createdAtMs < since) continue;
      const keyId = typeof entry.details.keyId === "string" ? entry.details.keyId : "";
      if (!keyId) continue;
      const ok = entry.details.ok === true;
      const current = usage.get(keyId) ?? { requests: 0, errors: 0, lastCallAt: entry.createdAt };
      current.requests += 1;
      if (!ok) current.errors += 1;
      if (entry.createdAt > current.lastCallAt) current.lastCallAt = entry.createdAt;
      usage.set(keyId, current);
    }
    return [...usage.entries()].map(([keyId, data]) => ({
      keyId,
      requests: data.requests,
      errors: data.errors,
      lastCallAt: data.lastCallAt
    }));
  }

  function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
  }

  function loginKey(ip: string, email: string): string {
    return `${ip}:${email}`;
  }

  function isLoginBlocked(key: string): boolean {
    const current = loginAttempts.get(key);
    if (!current?.blockedUntil) return false;
    if (Date.now() >= current.blockedUntil) {
      loginAttempts.delete(key);
      return false;
    }
    return true;
  }

  function registerFailedLogin(key: string): void {
    const now = Date.now();
    const windowMs = config.admin.loginWindowMinutes * 60 * 1000;
    const blockMs = config.admin.loginBlockMinutes * 60 * 1000;
    const current = loginAttempts.get(key);
    if (!current || now - current.firstAttemptAt > windowMs) {
      loginAttempts.set(key, { firstAttemptAt: now, count: 1 });
      return;
    }
    const nextCount = current.count + 1;
    if (nextCount >= config.admin.loginMaxAttempts) {
      loginAttempts.set(key, {
        firstAttemptAt: current.firstAttemptAt,
        count: nextCount,
        blockedUntil: now + blockMs
      });
      return;
    }
    loginAttempts.set(key, { ...current, count: nextCount });
  }

  function clearLoginFailures(key: string): void {
    loginAttempts.delete(key);
  }

  function updateSeriesSnapshotCache(seriesIds: number[]): void {
    const normalized = [...new Set(seriesIds.filter((id) => Number.isFinite(id) && id > 0))].sort((a, b) => a - b);
    if (normalized.length === 0) return;
    seriesSnapshotCache.seriesIds = normalized;
    seriesSnapshotCache.updatedAt = Date.now();
  }

  function getKnownSeriesIdsFromStore(): number[] {
    const fromListings = [...services.db.listings.values()]
      .map((item) => item.seriesId)
      .filter((id) => Number.isFinite(id) && id > 0);
    const fromMints = [...services.db.mints.values()]
      .map((item) => item.seriesId)
      .filter((id) => Number.isFinite(id) && id > 0);
    const fromAudit = services.db.auditLogs
      .filter(
        (entry) =>
          entry.action === "series_created_on_chain" || entry.action === "series_created_next_on_chain"
      )
      .map((entry) => Number(entry.details.seriesId))
      .filter((id) => Number.isFinite(id) && id > 0);
    return [...new Set([config.defaultSeriesId, ...fromListings, ...fromMints, ...fromAudit])].sort((a, b) => a - b);
  }

  function deriveSeriesCandidates(templateRaw: string, existingSeriesIds: number[]): number[] {
    const template = (templateRaw || "next").trim().toLowerCase();
    const sorted = [...existingSeriesIds].sort((a, b) => a - b);
    const maxCurrent = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
    const next = Math.max(1, maxCurrent + 1);
    if (template === "next") {
      return [next];
    }
    if (template.startsWith("start:")) {
      const start = Number(template.slice("start:".length));
      if (Number.isFinite(start) && start > 0) {
        return [Math.max(next, Math.trunc(start))];
      }
      return [next];
    }
    if (template.startsWith("list:")) {
      const values = template
        .slice("list:".length)
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.trunc(value));
      return [...new Set([...values, next])];
    }
    if (template.startsWith("range:")) {
      const [startRaw, endRaw] = template
        .slice("range:".length)
        .split("-")
        .map((item) => Number(item.trim()));
      if (Number.isFinite(startRaw) && Number.isFinite(endRaw) && startRaw > 0 && endRaw >= startRaw) {
        const range: number[] = [];
        for (let id = Math.trunc(startRaw); id <= Math.trunc(endRaw); id += 1) {
          range.push(id);
          if (range.length >= 300) break;
        }
        return [...new Set([...range, next])];
      }
      return [next];
    }
    return [next];
  }

  function resolveSeriesMetadataRoot(template: string | undefined, seriesId: number): string {
    const raw = template?.trim() ?? "";
    if (!raw) return "";
    return raw.replace(/\{seriesId\}/gi, String(seriesId));
  }

  async function getAvailableSeriesWithTimeout(
    maxSeries: number,
    timeoutMs = 8000
  ): Promise<Awaited<ReturnType<Services["minter"]["getAvailableSeries"]>>> {
    return Promise.race([
      services.minter.getAvailableSeries(maxSeries),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("RPC timeout while loading series data")), timeoutMs);
      })
    ]);
  }

  router.post("/auth/login", (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(3)
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const email = parsed.data.email.toLowerCase();
    const ipAddress = req.ip ?? "unknown";
    const attemptKey = loginKey(ipAddress, email);
    if (isLoginBlocked(attemptKey)) {
      appendAuditLog("admin_login_blocked", { email, ipAddress }, email);
      return res.status(429).json({ error: "Too many login attempts. Try again later." });
    }

    const adminUser = services.db.findAdminUserByEmail(email);
    const credentialsOk = Boolean(
      adminUser &&
      adminUser.isActive &&
      adminUser.role === "Admin" &&
      verifyPassword(parsed.data.password, config.admin.password, adminUser.passwordHash || config.admin.passwordHash)
    );
    if (!credentialsOk || !adminUser) {
      registerFailedLogin(attemptKey);
      appendAuditLog("admin_login_failed", { email, ipAddress }, email);
      return res.status(401).json({ error: "Invalid admin credentials" });
    }
    clearLoginFailures(attemptKey);
    services.db.markAdminLogin(adminUser.id);

    const token = `adm_${randomUUID()}_${randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + config.admin.sessionTtlMinutes * 60 * 1000).toISOString();
    services.db.createAdminSession({
      token,
      userId: adminUser.id,
      email,
      displayName: adminUser.displayName,
      role: adminUser.role,
      expiresAt
    });
    appendAuditLog("admin_login", { email, userId: adminUser.id }, email);
    return res.json({
      token,
      expiresAt,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        displayName: adminUser.displayName,
        role: adminUser.role
      }
    });
  });

  router.get("/auth/session", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }
    const session = services.db.getAdminSession(token);
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

  router.post("/auth/logout", (req, res) => {
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (token) {
      services.db.removeAdminSession(token);
    }
    return res.status(204).send();
  });

  router.use((req, res, next) => {
    if (config.nodeEnv === "test") {
      return next();
    }
    const token = extractBearerToken(req.headers.authorization as string | undefined);
    if (!token) {
      return res.status(401).json({ error: "Missing admin token" });
    }
    const session = services.db.getAdminSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    res.locals.adminActorEmail = session.email;
    res.locals.adminActorUserId = session.userId;
    return next();
  });

  router.get("/admin-users", (_req, res) => {
    const users = [...services.db.adminUsers.values()].map(serializeAdminUser);
    return res.json(users);
  });

  router.post("/admin-users", (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(2).max(80),
      isActive: z.boolean().optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const existing = services.db.findAdminUserByEmail(parsed.data.email);
    if (existing) {
      return res.status(409).json({ error: "Admin user with this email already exists" });
    }

    const complexity = validatePasswordComplexity(parsed.data.password);
    if (!complexity.ok) {
      return res.status(400).json({ error: complexity.errors });
    }

    const created = services.db.upsertAdminUser({
      email: parsed.data.email.toLowerCase(),
      passwordHash: hashPassword(parsed.data.password),
      displayName: parsed.data.displayName,
      role: "Admin",
      isActive: parsed.data.isActive ?? true
    });
    appendAuditLog(
      "admin_user_created",
      { userId: created.id, email: created.email },
      res.locals.adminActorEmail
    );
    return res.status(201).json(serializeAdminUser(created));
  });

  router.patch("/admin-users/:id", (req, res) => {
    const schema = z.object({
      email: z.string().email().optional(),
      displayName: z.string().min(2).max(80).optional(),
      password: z.string().min(8).optional(),
      isActive: z.boolean().optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const current = services.db.adminUsers.get(req.params.id);
    if (!current) {
      return res.status(404).json({ error: "Admin user not found" });
    }

    if (parsed.data.email) {
      const byEmail = services.db.findAdminUserByEmail(parsed.data.email);
      if (byEmail && byEmail.id !== current.id) {
        return res.status(409).json({ error: "Another admin user already uses this email" });
      }
    }

    if (parsed.data.isActive === false && current.id === res.locals.adminActorUserId) {
      return res.status(400).json({ error: "You cannot deactivate your own admin account" });
    }

    if (parsed.data.password) {
      const complexity = validatePasswordComplexity(parsed.data.password);
      if (!complexity.ok) {
        return res.status(400).json({ error: complexity.errors });
      }
    }

    const updated = services.db.updateAdminUser(current.id, {
      email: parsed.data.email?.toLowerCase(),
      displayName: parsed.data.displayName,
      isActive: parsed.data.isActive,
      passwordHash: parsed.data.password ? hashPassword(parsed.data.password) : undefined
    });
    appendAuditLog(
      "admin_user_updated",
      {
        userId: updated.id,
        updatedFields: Object.keys(parsed.data)
      },
      res.locals.adminActorEmail
    );
    return res.json(serializeAdminUser(updated));
  });

  router.get("/users", (_req, res) => {
    const users = [...services.db.users.values()].map(serializeUser);
    return res.json(users);
  });

  router.post("/users", (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(2).max(80),
      kycStatus: z.enum(["NotStarted", "Pending", "Verified", "Rejected"]).optional(),
      twoFAEnabled: z.boolean().optional(),
      isActive: z.boolean().optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const existing = services.db.findUserByEmail(parsed.data.email);
    if (existing) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const complexity = validatePasswordComplexity(parsed.data.password);
    if (!complexity.ok) {
      return res.status(400).json({ error: complexity.errors });
    }

    const created = services.db.upsertUser({
      email: parsed.data.email.toLowerCase(),
      passwordHash: hashPassword(parsed.data.password),
      displayName: parsed.data.displayName,
      role: "User",
      kycStatus: parsed.data.kycStatus ?? "NotStarted",
      twoFAEnabled: parsed.data.twoFAEnabled ?? false,
      isActive: parsed.data.isActive ?? true
    });
    appendAuditLog(
      "user_created_by_admin",
      { userId: created.id, email: created.email },
      res.locals.adminActorEmail
    );
    return res.status(201).json(serializeUser(created));
  });

  router.patch("/users/:id", (req, res) => {
    const schema = z.object({
      email: z.string().email().optional(),
      displayName: z.string().min(2).max(80).optional(),
      kycStatus: z.enum(["NotStarted", "Pending", "Verified", "Rejected"]).optional(),
      twoFAEnabled: z.boolean().optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "No user fields provided" });
    }

    const current = services.db.users.get(req.params.id);
    if (!current) {
      return res.status(404).json({ error: "User not found" });
    }

    if (parsed.data.email) {
      const byEmail = services.db.findUserByEmail(parsed.data.email);
      if (byEmail && byEmail.id !== current.id) {
        return res.status(409).json({ error: "Another user already uses this email" });
      }
    }

    if (parsed.data.password) {
      const complexity = validatePasswordComplexity(parsed.data.password);
      if (!complexity.ok) {
        return res.status(400).json({ error: complexity.errors });
      }
    }

    const patch: Partial<{
      email: string;
      displayName: string;
      kycStatus: "NotStarted" | "Pending" | "Verified" | "Rejected";
      twoFAEnabled: boolean;
      isActive: boolean;
      passwordHash: string;
    }> = {};
    if (parsed.data.email !== undefined) patch.email = parsed.data.email.toLowerCase();
    if (parsed.data.displayName !== undefined) patch.displayName = parsed.data.displayName;
    if (parsed.data.kycStatus !== undefined) patch.kycStatus = parsed.data.kycStatus;
    if (parsed.data.twoFAEnabled !== undefined) patch.twoFAEnabled = parsed.data.twoFAEnabled;
    if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive;
    if (parsed.data.password !== undefined) patch.passwordHash = hashPassword(parsed.data.password);

    const updated = services.db.updateUser(current.id, patch);

    appendAuditLog(
      "user_updated_by_admin",
      {
        userId: updated.id,
        updatedFields: Object.keys(parsed.data)
      },
      res.locals.adminActorEmail
    );
    return res.json(serializeUser(updated));
  });

  router.post("/auth/change-password", (req, res) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8)
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const actorUserId = res.locals.adminActorUserId as string | undefined;
    if (!actorUserId) {
      return res.status(401).json({ error: "Missing authenticated admin user" });
    }
    const currentUser = services.db.adminUsers.get(actorUserId);
    if (!currentUser) {
      return res.status(404).json({ error: "Admin user not found" });
    }

    const currentPasswordValid = verifyPassword(
      parsed.data.currentPassword,
      config.admin.password,
      currentUser.passwordHash || config.admin.passwordHash
    );
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

    services.db.updateAdminUser(currentUser.id, {
      passwordHash: hashPassword(parsed.data.newPassword)
    });
    appendAuditLog(
      "admin_password_changed",
      { userId: currentUser.id, email: currentUser.email },
      res.locals.adminActorEmail
    );
    return res.status(204).send();
  });

  router.get("/config", (_req, res) => {
    res.json({
      trendSources: services.trends.getSources(),
      trendSourceStatuses: services.trends.getSourceStatuses(),
      trendSourceSettings: services.trends.getSourceSettings(),
      pinnedThemes: services.trends.getPinnedThemes(),
      themes: services.trends.getThemes(),
      mintCounters: services.db.mintCounters,
      editionDefaults: {
        defaultSize: services.db.defaultEditionSize,
        overrides: [...services.db.editionOverrides.entries()].map(([seriesKey, size]) => ({ seriesKey, size }))
      },
      adminControls: services.db.adminControls,
      gatewaySettings: services.db.gatewaySettings,
      seriesLifecycle: services.db.seriesLifecycleConfig
    });
  });

  router.post("/trend-sources", (req, res) => {
    const schema = z.object({ sources: z.array(z.string().min(2)) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const sources = services.trends.setSources(parsed.data.sources);
    appendAuditLog("trend_sources_updated", { sources }, res.locals.adminActorEmail);
    return res.json({ sources });
  });

  router.patch("/trend-sources/:source", (req, res) => {
    const schema = z.object({
      status: z.enum(["Active", "Paused"]).optional(),
      rateLimitMode: z.enum(["Standard", "Aggressive", "Conservative"]).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (!parsed.data.status && !parsed.data.rateLimitMode) {
      return res.status(400).json({ error: "No trend source fields provided" });
    }
    const updated = services.db.updateTrendSourceSetting(req.params.source, parsed.data);
    appendAuditLog("trend_source_updated", updated, res.locals.adminActorEmail);
    return res.json(updated);
  });

  router.post("/trend-sources/:source/test", (req, res) => {
    const source = req.params.source.toLowerCase();
    const item = services.db.getTrendSourceSettings().find((entry) => entry.source === source);
    if (!item) {
      return res.status(404).json({ error: "Trend source not found" });
    }
    const health = services.trends.getSourceHealth().find((entry) => entry.source === source);
    const detail = health?.lastError
      ? `Source ${source} last error: ${health.lastError}`
      : `Source ${source} test passed (${item.rateLimitMode}).`;
    appendAuditLog(
      "trend_source_tested",
      { source, status: item.status, rateLimitMode: item.rateLimitMode, ok: !health?.lastError },
      res.locals.adminActorEmail
    );
    return res.json({
      source,
      ok: !health?.lastError,
      detail,
      testedAt: new Date().toISOString(),
      status: item.status,
      rateLimitMode: item.rateLimitMode
    });
  });

  router.get("/trend-source-health", (_req, res) => {
    return res.json(services.trends.getSourceHealth());
  });

  router.post("/pinned-themes", (req, res) => {
    const schema = z.object({ themes: z.array(z.string().min(2)) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const themes = services.trends.setPinnedThemes(parsed.data.themes);
    appendAuditLog("pinned_themes_updated", { themes }, res.locals.adminActorEmail);
    return res.json({ themes });
  });

  router.get("/themes", (_req, res) => {
    return res.json(services.trends.getThemes());
  });

  router.post("/themes", (req, res) => {
    const schema = z.object({
      name: z.string().min(2).max(80),
      type: z.enum(["Trending", "Pinned"]).default("Pinned"),
      description: z.string().max(200).optional(),
      active: z.boolean().optional(),
      priority: z.number().int().positive().optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const created = services.trends.createTheme(parsed.data);
      appendAuditLog("theme_created", { theme: created }, res.locals.adminActorEmail);
      return res.status(201).json(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create theme";
      return res.status(400).json({ error: message });
    }
  });

  router.patch("/themes/:id", (req, res) => {
    const schema = z.object({
      name: z.string().min(2).max(80).optional(),
      type: z.enum(["Trending", "Pinned"]).optional(),
      description: z.string().max(200).optional(),
      active: z.boolean().optional(),
      priority: z.number().int().positive().optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "No theme fields provided" });
    }
    try {
      const updated = services.trends.updateTheme(req.params.id, parsed.data);
      appendAuditLog("theme_updated", { theme: updated }, res.locals.adminActorEmail);
      return res.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update theme";
      if (message.toLowerCase().includes("not found")) {
        return res.status(404).json({ error: message });
      }
      return res.status(400).json({ error: message });
    }
  });

  router.delete("/themes/:id", (req, res) => {
    const removed = services.trends.deleteTheme(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "Theme not found" });
    }
    appendAuditLog("theme_deleted", { id: req.params.id }, res.locals.adminActorEmail);
    return res.status(204).send();
  });

  router.post("/run-cycle", async (req, res, next) => {
    const schema = z.object({
      recipient: z.string().optional(),
      seriesId: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(10).optional(),
      themeOverride: z.string().min(2).max(80).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      if (!services.db.adminControls.pipelineEnabled) {
        return res.status(409).json({ error: "Pipeline is disabled" });
      }
      const result = await services.pipeline.runAutomatedMintCycle(parsed.data);
      appendAuditLog("mint_cycle_triggered", parsed.data, res.locals.adminActorEmail);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/listings/:listingId/themes", (req, res) => {
    const schema = z.object({
      themes: z.array(z.string().min(2).max(80)).max(10)
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const listing = services.db.listings.get(req.params.listingId);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
    const normalized = Array.from(
      new Set(
        parsed.data.themes
          .map((theme) => theme.trim().replace(/\s+/g, " "))
          .filter((theme) => theme.length > 0)
      )
    );
    const updated = services.db.updateListing(listing.id, {
      themes: normalized
    });
    appendAuditLog(
      "listing_themes_updated",
      { listingId: listing.id, themes: normalized },
      res.locals.adminActorEmail
    );
    return res.json(updated);
  });

  router.get("/series", async (req, res, next) => {
    const schema = z.object({
      max: z.coerce.number().int().positive().max(200).optional()
    });
    const parsed = schema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const series = await services.minter.getAvailableSeries(parsed.data.max ?? 30);
      updateSeriesSnapshotCache(series.map((item) => item.seriesId));
      return res.json({
        mode: services.minter.mode,
        defaultSeriesId: config.defaultSeriesId,
        series
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/series", async (req, res, next) => {
    const schema = z.object({
      seriesId: z.number().int().positive(),
      maxSupply: z.number().int().positive(),
      metadataRoot: z.string().max(300).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const result = await services.minter.createSeries({
        seriesId: parsed.data.seriesId,
        maxSupply: parsed.data.maxSupply,
        metadataRoot: parsed.data.metadataRoot
      });
      appendAuditLog(
        "series_created_on_chain",
        { seriesId: parsed.data.seriesId, maxSupply: parsed.data.maxSupply, txHash: result.txHash },
        res.locals.adminActorEmail
      );
      updateSeriesSnapshotCache([...(seriesSnapshotCache.seriesIds ?? []), parsed.data.seriesId]);
      return res.status(201).json({
        seriesId: parsed.data.seriesId,
        maxSupply: parsed.data.maxSupply,
        metadataRoot: parsed.data.metadataRoot ?? "",
        txHash: result.txHash
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/series/preview-next", async (req, res, next) => {
    const schema = z.object({
      max: z.coerce.number().int().positive().max(120).optional(),
      seriesIdTemplate: z.string().min(1).max(120).optional()
    });
    const parsed = schema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const inspectMax = parsed.data.max ?? 4;
      let series: Awaited<ReturnType<Services["minter"]["getAvailableSeries"]>> = [];
      let chainReachable = true;
      try {
        series = await getAvailableSeriesWithTimeout(inspectMax, 1500);
        updateSeriesSnapshotCache(series.map((item) => item.seriesId));
      } catch {
        chainReachable = false;
      }
      const cachedIdsFresh =
        seriesSnapshotCache.updatedAt > 0 && Date.now() - seriesSnapshotCache.updatedAt < 30 * 60 * 1000
          ? seriesSnapshotCache.seriesIds
          : [];
      const knownFromStore = getKnownSeriesIdsFromStore();
      const existingIds =
        series.length > 0
          ? series.map((item) => item.seriesId)
          : cachedIdsFresh.length > 0
            ? cachedIdsFresh
            : knownFromStore.length > 0
              ? knownFromStore
              : [Math.max(1, config.defaultSeriesId)];
      const template = parsed.data.seriesIdTemplate ?? services.db.seriesLifecycleConfig.seriesIdTemplate;
      const existingSet = new Set(existingIds);
      const candidates = deriveSeriesCandidates(template, existingIds);
      const nextSeriesId = candidates.find((id) => !existingSet.has(id)) ?? Math.max(1, ...existingIds, 0) + 1;
      return res.json({
        mode: services.minter.mode,
        template,
        nextSeriesId,
        existsOnChain: existingSet.has(nextSeriesId),
        chainReachable,
        warning:
          chainReachable || services.minter.mode === "mock"
            ? undefined
            : cachedIdsFresh.length > 0
              ? "RPC scan is slow/unreachable. Showing preview from last known series snapshot."
              : knownFromStore.length > 0
                ? "RPC scan is slow/unreachable. Showing preview from persisted local records."
              : "RPC scan is slow/unreachable. Result is a template-only preview."
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/series/create-next", async (req, res, next) => {
    const schema = z.object({
      seriesIdTemplate: z.string().min(1).max(120).optional(),
      defaultSeriesMaxSupply: z.number().int().positive().optional(),
      seriesMetadataRootTemplate: z.string().max(300).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      let series: Awaited<ReturnType<Services["minter"]["getAvailableSeries"]>> = [];
      try {
        series = await getAvailableSeriesWithTimeout(12, 4000);
        updateSeriesSnapshotCache(series.map((item) => item.seriesId));
      } catch {
        series = [];
      }
      const existingIds =
        series.length > 0
          ? series.map((item) => item.seriesId)
          : [Math.max(1, config.defaultSeriesId)];
      const existingSet = new Set(existingIds);
      const template = parsed.data.seriesIdTemplate ?? services.db.seriesLifecycleConfig.seriesIdTemplate;
      const candidates = deriveSeriesCandidates(template, existingIds);
      let nextSeriesId = candidates.find((id) => !existingSet.has(id)) ?? Math.max(1, ...existingIds, 0) + 1;
      const maxSupply = parsed.data.defaultSeriesMaxSupply ?? services.db.seriesLifecycleConfig.defaultSeriesMaxSupply;
      const metadataRootTemplate =
        parsed.data.seriesMetadataRootTemplate ?? services.db.seriesLifecycleConfig.seriesMetadataRootTemplate;
      let created:
        | {
            txHash: string;
          }
        | undefined;
      let lastCreateError: unknown;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const metadataRoot = resolveSeriesMetadataRoot(metadataRootTemplate, nextSeriesId);
          created = await services.minter.createSeries({
            seriesId: nextSeriesId,
            maxSupply,
            metadataRoot
          });
          break;
        } catch (error) {
          lastCreateError = error;
          const msg = error instanceof Error ? error.message.toLowerCase() : "";
          if (msg.includes("already exists")) {
            nextSeriesId += 1;
            continue;
          }
          throw error;
        }
      }
      if (!created) {
        throw lastCreateError instanceof Error ? lastCreateError : new Error("Unable to create next series");
      }
      const metadataRoot = resolveSeriesMetadataRoot(metadataRootTemplate, nextSeriesId);
      appendAuditLog(
        "series_created_next_on_chain",
        { seriesId: nextSeriesId, maxSupply, metadataRoot, txHash: created.txHash },
        res.locals.adminActorEmail
      );
      updateSeriesSnapshotCache([...(seriesSnapshotCache.seriesIds ?? []), nextSeriesId]);
      return res.status(201).json({
        template,
        seriesId: nextSeriesId,
        maxSupply,
        metadataRoot,
        txHash: created.txHash
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.toLowerCase().includes("rpc timeout") ||
          error.message.toLowerCase().includes("timeout") ||
          error.message.toLowerCase().includes("code=timeout"))
      ) {
        return res.status(503).json({
          error: "Cannot reach blockchain RPC right now. Check RPC_URL and node health, then try again."
        });
      }
      return next(error);
    }
  });

  router.get("/logs/mints", (_req, res) => {
    res.json([...services.db.mints.values()]);
  });

  router.get("/logs/payments", (_req, res) => {
    res.json([...services.db.payments.values()]);
  });

  router.get("/payments", (_req, res) => {
    const rows = [...services.db.payments.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((payment) => {
        const session = services.db.paymentSessions.get(payment.id);
        const receipt = [...services.db.receipts.values()].find((item) => item.paymentId === payment.id);
        return {
          paymentId: payment.id,
          externalRef: payment.externalRef,
          amountUsd: payment.amountUsd,
          currency: payment.currency,
          paymentStatus: payment.status,
          settlementStatus: session?.settlementStatus ?? "pending",
          listingId: session?.listingId,
          tokenId: session?.tokenId,
          buyerAddress: session?.buyerAddress,
          sellerAddress: session?.sellerAddress,
          checkoutUrl: session?.checkoutUrl,
          txHash: session?.txHash ?? receipt?.txHash,
          receiptId: session?.receiptId ?? receipt?.id,
          gatewayProvider: services.db.gatewaySettings.provider,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        };
      });
    return res.json(rows);
  });

  router.post("/payments/:paymentId/settle", async (req, res, next) => {
    const payment = services.db.payments.get(req.params.paymentId);
    const session = services.db.paymentSessions.get(req.params.paymentId);
    if (!payment || !session) {
      return res.status(404).json({ error: "Payment session not found" });
    }
    if (session.settlementStatus === "completed" && session.txHash) {
      return res.json({
        paymentId: payment.id,
        settlementStatus: session.settlementStatus,
        txHash: session.txHash,
        receiptId: session.receiptId
      });
    }
    if (payment.status !== "confirmed") {
      return res.status(409).json({ error: "Payment is not confirmed yet" });
    }
    try {
      services.db.updatePaymentSession(payment.id, { settlementStatus: "processing", error: undefined });
      const transfer = await services.minter.transfer(session.sellerAddress, session.buyerAddress, session.tokenId);
      services.indexer.upsertListing({
        tokenId: session.tokenId,
        owner: session.buyerAddress,
        tokenUri: services.db.listings.get(session.listingId)?.tokenUri ?? "ipfs://unknown",
        status: "transferred"
      });
      const receipt = services.db.createReceipt({
        paymentId: payment.id,
        txHash: transfer.txHash,
        wallet: session.buyerAddress
      });
      const updated = services.db.updatePaymentSession(payment.id, {
        settlementStatus: "completed",
        txHash: transfer.txHash,
        receiptId: receipt.id
      });
      appendAuditLog(
        "payment_settled_by_admin",
        { paymentId: payment.id, listingId: session.listingId, tokenId: session.tokenId },
        res.locals.adminActorEmail
      );
      return res.json({
        paymentId: payment.id,
        settlementStatus: updated.settlementStatus,
        txHash: updated.txHash,
        receiptId: updated.receiptId
      });
    } catch (error) {
      services.db.updatePaymentSession(payment.id, {
        settlementStatus: "failed",
        error: error instanceof Error ? error.message : "Settlement failed"
      });
      appendAuditLog(
        "payment_settle_failed_by_admin",
        {
          paymentId: payment.id,
          reason: error instanceof Error ? error.message : "Settlement failed"
        },
        res.locals.adminActorEmail
      );
      return next(error);
    }
  });

  router.get("/logs/webhooks", (_req, res) => {
    res.json([...services.db.webhookEvents.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });

  router.get("/logs/audit", (_req, res) => {
    res.json(services.db.auditLogs);
  });

  router.get("/system-status", async (_req, res) => {
    const now = new Date().toISOString();
    const paymentHealth = await services.payment.healthCheck();
    const persistence = await checkPersistenceHealth();
    const recentWebhookEvents = [...services.db.webhookEvents.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);
    const rejectedWebhooks = recentWebhookEvents.filter((item) => item.status === "rejected").length;
    const hasWebhookFailures = rejectedWebhooks > 0;
    const listingsCount = services.db.listings.size;
    const sourceHealth = services.trends.getSourceHealth();
    const failedSources = sourceHealth.filter((entry) => entry.consecutiveFailures > 0);
    const currentHourKey = now.slice(0, 13);
    const currentHourCount = services.db.mintCounters.perHour[currentHourKey] ?? 0;
    const mintedToday = services.db.mintCounters.perDay;
    const dailyCap = services.db.adminControls.dailyCap;
    const hourlyCap = services.db.adminControls.hourlyCap;
    const dailyMinimumTarget = services.db.adminControls.dailyMinimumTarget;
    const remainingDailyCap = Math.max(0, dailyCap - mintedToday);
    const remainingHourlyCap = Math.max(0, hourlyCap - currentHourCount);
    const nextIntervalMinutes = Math.max(1, services.db.adminControls.autoMintIntervalMinutes);
    const trendRefreshHours = Math.max(1, services.db.adminControls.trendRefreshIntervalHours ?? 24);
    const recentTrends = [...services.db.trends.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    const distinctTopics24h = new Set(
      recentTrends
        .filter((item) => Date.now() - new Date(item.createdAt).getTime() <= 24 * 60 * 60 * 1000)
        .map((item) => item.topic.toLowerCase())
    ).size;
    const newestTrendAt = recentTrends[0]?.createdAt;
    const recentAuditFailure = services.db.auditLogs.find((item) =>
      ["admin_login_failed", "partner_api_call"].includes(item.action)
    );
    let nextSeriesIdPreview: number | undefined;
    try {
      const availableSeries = await getAvailableSeriesWithTimeout(40, 5000);
      const existingIds = availableSeries.map((item) => item.seriesId);
      const existingSet = new Set(existingIds);
      const candidates = deriveSeriesCandidates(services.db.seriesLifecycleConfig.seriesIdTemplate, existingIds);
      nextSeriesIdPreview =
        candidates.find((id) => !existingSet.has(id)) ?? Math.max(1, ...existingIds, config.defaultSeriesId) + 1;
    } catch {
      nextSeriesIdPreview = undefined;
    }
    const latestSeriesCreateAudit = services.db.auditLogs.find(
      (entry) =>
        entry.action === "series_created_next_on_chain" || entry.action === "series_created_on_chain"
    );
    const lastSeriesCreateTxHash =
      typeof latestSeriesCreateAudit?.details?.txHash === "string"
        ? (latestSeriesCreateAudit.details.txHash as string)
        : undefined;
    return res.json([
      {
        id: "api",
        name: "Admin API",
        status: "Operational",
        lastChecked: now,
        detail: "Express API is accepting admin requests"
      },
      {
        id: "payment",
        name: "Payment Gateway",
        status: paymentHealth.ok ? "Operational" : "Degraded",
        lastChecked: now,
        detail: paymentHealth.detail,
        lastIncident: paymentHealth.ok ? undefined : paymentHealth.detail
      },
      {
        id: "persistence",
        name: "Persistence",
        status: persistence.ok ? "Operational" : "Down",
        lastChecked: now,
        detail: persistence.detail,
        lastIncident: persistence.ok ? undefined : persistence.detail
      },
      {
        id: "webhooks",
        name: "Webhook Processing",
        status: hasWebhookFailures ? "Degraded" : "Operational",
        lastChecked: now,
        detail: hasWebhookFailures
          ? `${rejectedWebhooks} rejected webhook(s) in recent events`
          : `${recentWebhookEvents.length} recent webhook event(s) processed`,
        lastIncident: hasWebhookFailures ? `${rejectedWebhooks} rejected webhook(s) in recent events` : undefined
      },
      {
        id: "trend-sources",
        name: "Trend Sources",
        status: failedSources.length > 0 ? "Degraded" : "Operational",
        lastChecked: now,
        detail:
          sourceHealth.length === 0
            ? "No trend source polls yet"
            : `${sourceHealth.length} source(s) tracked, ${failedSources.length} degraded`,
        lastIncident:
          failedSources.length > 0
            ? failedSources
                .slice(0, 2)
                .map((entry) => `${entry.source}: ${entry.lastError ?? "fetch failed"}`)
                .join(" | ")
            : undefined
      },
      {
        id: "indexer",
        name: "Marketplace Indexer",
        status: "Operational",
        lastChecked: now,
        detail: listingsCount === 0 ? "No listings indexed yet" : `${listingsCount} listing(s) currently indexed`,
        lastIncident: listingsCount === 0 ? "No listings indexed yet" : `${listingsCount} listing(s) indexed`
      },
      {
        id: "scheduler",
        name: "Mint Scheduler",
        status:
          !services.db.adminControls.pipelineEnabled || !services.db.adminControls.scheduleEnabled
            ? "Degraded"
            : remainingDailyCap === 0 || remainingHourlyCap === 0
              ? "Degraded"
              : "Operational",
        lastChecked: now,
        detail: `interval=${nextIntervalMinutes}m, batch=${services.db.adminControls.autoMintBatchSize}, today=${mintedToday}/${dailyCap}, thisHour=${currentHourCount}/${hourlyCap}, minTarget=${dailyMinimumTarget}`,
        lastIncident:
          !services.db.adminControls.pipelineEnabled || !services.db.adminControls.scheduleEnabled
            ? "Pipeline or schedule toggle is disabled"
            : remainingDailyCap === 0
              ? "Daily cap reached"
              : remainingHourlyCap === 0
                ? "Hourly cap reached"
                : undefined
      },
      {
        id: "themes",
        name: "Theme Rotation",
        status: distinctTopics24h <= 1 ? "Degraded" : "Operational",
        lastChecked: now,
        detail: `activeThemes=${services.trends.getThemes().filter((item) => item.active).length}, themePool=${services.db.adminControls.trendTopicLimit}, refresh=${trendRefreshHours}h, distinctTopics24h=${distinctTopics24h}, latestTrend=${newestTrendAt ? new Date(newestTrendAt).toLocaleTimeString() : "none"}`,
        lastIncident: distinctTopics24h <= 1 ? "Low theme/topic variation detected in last 24h" : undefined
      },
      {
        id: "series-lifecycle",
        name: "Series Lifecycle",
        status: services.db.seriesLifecycleConfig.autoSeriesEnabled ? "Operational" : "Degraded",
        lastChecked: now,
        detail: `autoSeries=${services.db.seriesLifecycleConfig.autoSeriesEnabled ? "on" : "off"}, template=${services.db.seriesLifecycleConfig.seriesIdTemplate}, nextSeries=${nextSeriesIdPreview ?? "n/a"}`,
        lastIncident: services.db.seriesLifecycleConfig.autoSeriesEnabled
          ? undefined
          : "Auto-series creation is disabled",
        metadata: {
          nextSeriesIdPreview,
          lastSeriesCreateTxHash
        }
      },
      {
        id: "auth",
        name: "Admin Auth",
        status: "Operational",
        lastChecked: now,
        detail: "Session and credential checks are active",
        lastIncident: recentAuditFailure ? `Recent auth/security audit: ${recentAuditFailure.action}` : undefined
      }
    ]);
  });

  router.get("/mint-controls", (_req, res) => {
    return res.json(services.db.adminControls);
  });

  router.post("/mint-controls", (req, res) => {
    const schema = z.object({
      dailyCap: z.number().int().positive().optional(),
      hourlyCap: z.number().int().positive().optional(),
      pipelineEnabled: z.boolean().optional(),
      scheduleEnabled: z.boolean().optional(),
      trendTopicLimit: z.number().int().min(1).max(10).optional(),
      trendRefreshIntervalHours: z.number().int().min(1).max(168).optional(),
      autoMintIntervalMinutes: z.number().int().positive().optional(),
      autoMintBatchSize: z.number().int().min(1).max(10).optional(),
      dailyMinimumTarget: z.number().int().min(0).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const nextDailyCap = parsed.data.dailyCap ?? services.db.adminControls.dailyCap;
    const nextDailyMinimumTarget =
      parsed.data.dailyMinimumTarget ?? services.db.adminControls.dailyMinimumTarget ?? 0;
    if (nextDailyMinimumTarget > nextDailyCap) {
      return res.status(400).json({ error: "Daily minimum target cannot exceed daily cap" });
    }
    services.db.updateAdminControls(parsed.data);
    appendAuditLog("mint_controls_updated", parsed.data, res.locals.adminActorEmail);
    return res.json(services.db.adminControls);
  });

  router.get("/editions", (_req, res) => {
    return res.json({
      defaultSize: services.db.defaultEditionSize,
      overrides: [...services.db.editionOverrides.entries()].map(([seriesKey, size]) => ({ seriesKey, size }))
    });
  });

  router.post("/editions/default", (req, res) => {
    const schema = z.object({
      size: z.number().int().positive()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    services.db.defaultEditionSize = parsed.data.size;
    services.db.touch();
    appendAuditLog("edition_default_updated", parsed.data, res.locals.adminActorEmail);
    return res.json({ defaultSize: services.db.defaultEditionSize });
  });

  router.post("/editions/overrides", (req, res) => {
    const schema = z.object({
      seriesKey: z.string().min(1),
      size: z.number().int().positive()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    services.db.editionOverrides.set(parsed.data.seriesKey, parsed.data.size);
    services.db.touch();
    appendAuditLog("edition_override_set", parsed.data, res.locals.adminActorEmail);
    return res.json({
      seriesKey: parsed.data.seriesKey,
      size: parsed.data.size
    });
  });

  router.get("/api-keys", (_req, res) => {
    return res.json([...services.db.partnerApiKeys.values()].map(serializePartnerApiKey));
  });

  router.get("/api-keys/usage", (_req, res) => {
    return res.json(extractPartnerKeyUsage(7));
  });

  router.post("/api-keys", (req, res) => {
    const schema = z.object({
      label: z.string().min(1),
      permissions: z.array(z.enum(["BulkPurchase", "Transfer", "Relist"])).min(1)
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const id = randomUUID();
    const keyPrefix = `pk_live_${Math.random().toString(36).slice(2, 10)}`;
    const rawKey = `pk_live_${Math.random().toString(36).slice(2, 24)}`;
    const item = {
      id,
      label: parsed.data.label,
      keyPrefix,
      keyHash: createHash("sha256").update(rawKey).digest("hex"),
      createdAt: new Date().toISOString(),
      lastUsedAt: "",
      permissions: parsed.data.permissions
    };
    services.db.partnerApiKeys.set(id, item);
    services.db.touch();
    appendAuditLog("api_key_created", { keyId: id, label: parsed.data.label }, res.locals.adminActorEmail);
    return res.status(201).json({ key: rawKey, partnerKey: serializePartnerApiKey(item) });
  });

  router.patch("/api-keys/:id", (req, res) => {
    const schema = z.object({
      label: z.string().min(1).optional(),
      permissions: z.array(z.enum(["BulkPurchase", "Transfer", "Relist"])).min(1).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (!parsed.data.label && !parsed.data.permissions) {
      return res.status(400).json({ error: "No API key fields provided" });
    }
    try {
      const updated = services.db.updatePartnerApiKey(req.params.id, {
        label: parsed.data.label,
        permissions: parsed.data.permissions as Array<"BulkPurchase" | "Transfer" | "Relist"> | undefined
      });
      appendAuditLog(
        "api_key_updated",
        { keyId: updated.id, updatedFields: Object.keys(parsed.data) },
        res.locals.adminActorEmail
      );
      return res.json(serializePartnerApiKey(updated));
    } catch (error) {
      return res.status(404).json({ error: error instanceof Error ? error.message : "API key not found" });
    }
  });

  router.delete("/api-keys/:id", (req, res) => {
    const removed = services.db.partnerApiKeys.delete(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: "API key not found" });
    }
    services.db.touch();
    appendAuditLog("api_key_revoked", { keyId: req.params.id }, res.locals.adminActorEmail);
    return res.status(204).send();
  });

  router.get("/gateway-config", (_req, res) => {
    return res.json(services.db.gatewaySettings);
  });

  router.get("/pricing-config", (_req, res) => {
    return res.json(services.db.pricingConfig);
  });

  router.get("/series-lifecycle-config", (_req, res) => {
    return res.json(services.db.seriesLifecycleConfig);
  });

  router.post("/gateway-config", (req, res) => {
    const schema = z.object({
      provider: z.enum(["mock", "generic", "vellis", "wert", "nowpayments"]).optional(),
      mode: z.enum(["sandbox", "live"]).optional(),
      webhookVerificationEnabled: z.boolean().optional(),
      webhookSignatureHeader: z
        .string()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9-]+$/i, "Webhook signature header must contain only letters, numbers, and dashes")
        .optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "No gateway fields provided" });
    }
    const updated = services.db.updateGatewaySettings({
      provider: parsed.data.provider,
      mode: parsed.data.mode,
      webhookVerificationEnabled: parsed.data.webhookVerificationEnabled,
      webhookSignatureHeader: parsed.data.webhookSignatureHeader
    });
    appendAuditLog("gateway_config_updated", parsed.data, res.locals.adminActorEmail);
    return res.json(updated);
  });

  router.post("/pricing-config", (req, res) => {
    const schema = z.object({
      basePriceUsd: z.number().positive().optional(),
      tokenStepUsd: z.number().min(0).optional(),
      themeOverrides: z.record(z.string(), z.number().positive()).optional(),
      seriesOverrides: z.record(z.string(), z.number().positive()).optional(),
      listingOverrides: z.record(z.string(), z.number().positive()).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "No pricing fields provided" });
    }
    const updated = services.db.updatePricingConfig(parsed.data);
    appendAuditLog("pricing_config_updated", parsed.data, res.locals.adminActorEmail);
    return res.json(updated);
  });

  router.post("/series-lifecycle-config", (req, res) => {
    const schema = z.object({
      autoSeriesEnabled: z.boolean().optional(),
      seriesIdTemplate: z.string().min(1).max(120).optional(),
      defaultSeriesMaxSupply: z.number().int().positive().optional(),
      seriesMetadataRootTemplate: z.string().max(300).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: "No series lifecycle fields provided" });
    }
    const updated = services.db.updateSeriesLifecycleConfig(parsed.data);
    appendAuditLog("series_lifecycle_config_updated", parsed.data, res.locals.adminActorEmail);
    return res.json(updated);
  });

  router.get("/gateway-health", async (_req, res) => {
    const status = await services.payment.healthCheck();
    return res.json(status);
  });

  return router;
}
