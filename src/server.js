import express from "express";
import { rateLimit } from "express-rate-limit";
import { MODE_CONFIG, REGION_NOTICE, SOURCE_URL } from "./constants.js";
import { resolveHero } from "./heroes.js";
import { localizationSource, localizePerkData } from "./localization.js";
import { getHeroPerks, getHeroes } from "./overlooker.js";
import { getHeroRelations, getPairRelations, RELATION_TYPES } from "./relations.js";

function parseMode(value) {
  return Object.hasOwn(MODE_CONFIG, value) ? value : null;
}

function candidateAccess(request) {
  const requested = request.query.include_candidates === "true";
  if (!requested) return { requested: false, allowed: true };
  const expected = process.env.RELATIONS_ADMIN_TOKEN;
  const supplied = request.get("x-relations-admin-token");
  return { requested: true, allowed: Boolean(expected && supplied === expected) };
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

  app.get("/", (_request, response) => response.json({
    name: "OW Perk API",
    endpoints: [
      "GET /health",
      "GET /api/heroes?mode=all",
      "GET /api/perks/:hero?mode=all",
      "GET /api/relations/:hero",
      "GET /api/relations/:hero/:target",
    ],
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
      const data = localizePerkData(await getHeroPerks(hero.hero, mode));
      return response.json({
        mode,
        ...data,
        source: SOURCE_URL,
        localization_source: localizationSource(),
        notice: REGION_NOTICE,
      });
    } catch (error) { return next(error); }
  });

  app.get("/api/relations/:hero/:target", (request, response) => {
    const access = candidateAccess(request);
    if (!access.allowed) return response.status(403).json({ error: "후보 관계 조회 권한이 없습니다." });
    const data = getPairRelations(request.params.hero, request.params.target, { includeCandidates: access.requested });
    if (!data) return response.status(404).json({ error: "영웅을 찾지 못했거나 같은 영웅을 지정했습니다." });
    return response.json(data);
  });

  app.get("/api/relations/:hero", (request, response) => {
    const type = request.query.type ?? null;
    if (type && !RELATION_TYPES.includes(type)) {
      return response.status(400).json({ error: "type은 counter, synergy, competition 중 하나여야 합니다." });
    }
    const access = candidateAccess(request);
    if (!access.allowed) return response.status(403).json({ error: "후보 관계 조회 권한이 없습니다." });
    const data = getHeroRelations(request.params.hero, { type, includeCandidates: access.requested });
    if (!data) return response.status(404).json({ error: "영웅을 찾지 못했습니다." });
    return response.json(data);
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
