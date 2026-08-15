import { MODE_CONFIG, OVERLOOKER_BASE_URL, OW_DATA_BASE_URL } from "./constants.js";

const cache = new Map();
const ttl = Number.parseInt(process.env.CACHE_TTL_MS ?? "300000", 10);

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry || Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value, customTtl = ttl) {
  cache.set(key, { value, expiresAt: Date.now() + customTtl });
  return value;
}

async function getJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "ow-perk-api/1.0" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        const error = new Error(`Upstream returned ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === 0 && (!error.status || error.status >= 500)) continue;
      throw error;
    }
  }
  throw lastError;
}

function urlFor(path = "", mode = "all") {
  const config = MODE_CONFIG[mode];
  if (!config) throw new Error(`Unsupported mode: ${mode}`);
  const url = new URL(path ? `${OVERLOOKER_BASE_URL}/${path}` : OVERLOOKER_BASE_URL);
  if (config.queueType) url.searchParams.set("queue_type", config.queueType);
  return url;
}

export async function getHeroes(mode = "all") {
  const key = `heroes:${mode}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const data = await getJson(urlFor("", mode));
  return cacheSet(key, data.heroes ?? []);
}

export async function getHeroPerks(slug, mode = "all") {
  const key = `hero:${slug}:${mode}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  return cacheSet(key, await getJson(urlFor(encodeURIComponent(slug), mode)));
}

export async function getHeroMetadata(slug) {
  const key = "ow-data:heroes";
  let heroes = cacheGet(key);
  if (!heroes) {
    try {
      heroes = cacheSet(key, await getJson(`${OW_DATA_BASE_URL}/heroes.json`), 24 * 60 * 60 * 1000);
    } catch {
      return null;
    }
  }
  return heroes.find((hero) => hero.slug === slug) ?? null;
}

export function clearCache() {
  cache.clear();
}
