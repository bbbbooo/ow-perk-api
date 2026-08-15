import express from "express";
import { rateLimit } from "express-rate-limit";
import { MODE_CONFIG, REGION_NOTICE, SOURCE_URL } from "./constants.js";
import { resolveHero } from "./heroes.js";
import { getHeroPerks, getHeroes } from "./overlooker.js";

function parseMode(value) {
  return Object.hasOwn(MODE_CONFIG, value) ? value : null;
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

  app.get("/", (_request, response) => response.json({
    name: "OW Perk API",
    endpoints: ["GET /health", "GET /api/heroes?mode=all", "GET /api/perks/:hero?mode=all"],
    source: SOURCE_URL,
    notice: REGION_NOTICE,
  }));
  app.get("/health", (_request, response) => response.json({ ok: true, uptime: process.uptime() }));

  app.get("/api/heroes", async (request, response, next) => {
    try {
      const mode = parseMode(request.query.mode ?? "all");
      if (!mode) return response.status(400).json({ error: "mode는 all, quickplay, competitive 중 하나여야 합니다." });
      const heroes = await getHeroes(mode);
      return response.json({ mode, heroes, source: SOURCE_URL, notice: REGION_NOTICE });
    } catch (error) { return next(error); }
  });

  app.get("/api/perks/:hero", async (request, response, next) => {
    try {
      const mode = parseMode(request.query.mode ?? "all");
      if (!mode) return response.status(400).json({ error: "mode는 all, quickplay, competitive 중 하나여야 합니다." });
      const heroes = await getHeroes(mode);
      const hero = resolveHero(request.params.hero, heroes);
      if (!hero) return response.status(404).json({ error: "영웅을 찾지 못했습니다." });
      const data = await getHeroPerks(hero.hero, mode);
      return response.json({ mode, ...data, source: SOURCE_URL, notice: REGION_NOTICE });
    } catch (error) { return next(error); }
  });

  app.use((error, _request, response, _next) => {
    console.error("[api] request error:", error);
    response.status(error.status === 404 ? 404 : 502).json({ error: "Overlooker 통계를 불러오지 못했습니다." });
  });
  return app;
}

export function startServer(port = Number(process.env.PORT ?? 3000)) {
  return createApp().listen(port, "0.0.0.0", () => console.log(`[api] http://0.0.0.0:${port}`));
}
