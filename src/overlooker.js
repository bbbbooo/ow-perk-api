import { setDefaultResultOrder } from "node:dns";
import { MODE_CONFIG, OVERLOOKER_BASE_URL, OW_DATA_BASE_URL } from "./constants.js";
import { getFallbackHeroPerks, getFallbackHeroes } from "./fallback.js";

setDefaultResultOrder("ipv4first");

const cache = new Map();
const pendingRequests = new Map();
const ttl = Number.parseInt(process.env.CACHE_TTL_MS ?? "300000", 10);
const staleTtl = Number.parseInt(process.env.STALE_CACHE_TTL_MS ?? "21600000", 10);
const upstreamTimeout = Number.parseInt(process.env.UPSTREAM_TIMEOUT_MS ?? "12000", 10);
const upstreamRetries = Number.parseInt(process.env.UPSTREAM_RETRIES ?? "3", 10);

function cacheGet(key, allowStale = false) {
  const entry = cache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now >= entry.staleUntil) {
    cache.delete(key);
    return null;
  }
  if (!allowStale && now >= entry.expiresAt) return null;
  return entry.value;
}

function cacheSet(key, value, customTtl = ttl, customStaleTtl = staleTtl) {
  const expiresAt = Date.now() + customTtl;
  cache.set(key, { value, expiresAt, staleUntil: expiresAt + customStaleTtl });
  return value;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url) {
  let lastError;
  for (let attempt = 0; attempt < upstreamRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "ow-perk-api/1.0" },
        signal: AbortSignal.timeout(upstreamTimeout),
      });
      if (!response.ok) {
        const error = new Error(`Upstream returned ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      const retryable = !error.status || error.status === 429 || error.status >= 500;
      if (retryable && attempt < upstreamRetries - 1) {
        await wait(400 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function getWithCache(key, loader, customTtl = ttl, customStaleTtl = staleTtl, fallback = null) {
  const cached = cacheGet(key);
  if (cached) return cached;
  if (pendingRequests.has(key)) return pendingRequests.get(key);

  const request = (async () => {
    try {
      return cacheSet(key, await loader(), customTtl, customStaleTtl);
    } catch (error) {
      const stale = cacheGet(key, true);
      if (stale) {
        console.warn(`[upstream] ${key} 요청 실패, 만료된 캐시를 사용합니다:`, error.message);
        return stale;
      }
      const fallbackValue = fallback?.();
      if (fallbackValue) {
        console.warn(`[upstream] ${key} 요청 실패, 저장된 스냅샷을 사용합니다:`, error.message);
        return cacheSet(key, fallbackValue, 60_000, customStaleTtl);
      }
      throw error;
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, request);
  return request;
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
  return getWithCache(key, async () => {
    const data = await getJson(urlFor("", mode));
    return data.heroes ?? [];
  }, ttl, staleTtl, () => getFallbackHeroes(mode));
}

export async function getHeroPerks(slug, mode = "all") {
  const key = `hero:${slug}:${mode}`;
  return getWithCache(
    key,
    () => getJson(urlFor(encodeURIComponent(slug), mode)),
    ttl,
    staleTtl,
    () => getFallbackHeroPerks(slug, mode),
  );
}

export async function getHeroMetadata(slug) {
  const key = "ow-data:heroes";
  let heroes = cacheGet(key);
  if (!heroes) {
    try {
      heroes = await getWithCache(
        key,
        () => getJson(`${OW_DATA_BASE_URL}/heroes.json`),
        24 * 60 * 60 * 1000,
        7 * 24 * 60 * 60 * 1000,
      );
    } catch {
      return null;
    }
  }
  return heroes.find((hero) => hero.slug === slug) ?? null;
}

export function clearCache() {
  cache.clear();
  pendingRequests.clear();
}
