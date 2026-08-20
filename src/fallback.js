import { readFileSync } from "node:fs";

const snapshots = new Map();

for (const mode of ["all", "quickplay", "competitive"]) {
  try {
    const path = new URL(`./data/perk-snapshots/${mode}.json`, import.meta.url);
    snapshots.set(mode, JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    console.warn(`[fallback] ${mode} 스냅샷을 읽지 못했습니다:`, error.message);
  }
}

export function getFallbackHeroes(mode) {
  return snapshots.get(mode)?.heroes ?? null;
}

export function getFallbackHeroPerks(slug, mode) {
  const snapshot = snapshots.get(mode);
  const hero = snapshot?.heroes?.find((candidate) => candidate.hero === slug);
  if (!hero) return null;
  return {
    ...hero,
    filters: snapshot.filters,
    _fallback: true,
    _snapshotAt: snapshot.fetched_at,
  };
}
