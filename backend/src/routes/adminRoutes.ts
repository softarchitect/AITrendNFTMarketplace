import { Router } from "express";
import { z } from "zod";
import { Services } from "../services/serviceContainer";

export function createAdminRoutes(services: Services): Router {
  const router = Router();

  router.get("/config", (_req, res) => {
    res.json({
      trendSources: services.trends.getSources(),
      pinnedThemes: services.trends.getPinnedThemes(),
      mintCounters: services.db.mintCounters
    });
  });

  router.post("/trend-sources", (req, res) => {
    const schema = z.object({ sources: z.array(z.string().min(2)).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const sources = services.trends.setSources(parsed.data.sources);
    return res.json({ sources });
  });

  router.post("/pinned-themes", (req, res) => {
    const schema = z.object({ themes: z.array(z.string().min(2)).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const themes = services.trends.setPinnedThemes(parsed.data.themes);
    return res.json({ themes });
  });

  router.post("/run-cycle", async (req, res, next) => {
    const schema = z.object({
      recipient: z.string().optional(),
      seriesId: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(5).optional()
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const result = await services.pipeline.runAutomatedMintCycle(parsed.data);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/logs/mints", (_req, res) => {
    res.json([...services.db.mints.values()]);
  });

  router.get("/logs/payments", (_req, res) => {
    res.json([...services.db.payments.values()]);
  });

  return router;
}
