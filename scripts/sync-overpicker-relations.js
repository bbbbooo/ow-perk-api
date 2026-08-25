import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolveKnownHero } from "../src/heroes.js";

const endpoints = {
  counters: "https://api.overpicker.com/hero-counters",
  synergies: "https://api.overpicker.com/hero-synergies",
};
const outputDirectory = new URL("../work/relation-sync/", import.meta.url);

function slugFor(name) {
  const hero = resolveKnownHero(name);
  if (!hero) throw new Error(`OverPicker 영웅 이름을 변환할 수 없습니다: ${name}`);
  return hero.hero;
}

function normalizeCounters(matrix) {
  const candidates = [];
  for (const [sourceName, targets] of Object.entries(matrix)) {
    const sourceHero = slugFor(sourceName);
    for (const [targetName, score] of Object.entries(targets)) {
      const targetHero = slugFor(targetName);
      if (sourceHero === targetHero || score === 0) continue;
      candidates.push({ source_hero: sourceHero, target_hero: targetHero, type: "counter", observed_score: score });
    }
  }
  return candidates.sort((a, b) => `${a.source_hero}:${a.target_hero}`.localeCompare(`${b.source_hero}:${b.target_hero}`));
}

function normalizeSynergies(matrix) {
  const pairs = new Map();
  for (const [sourceName, targets] of Object.entries(matrix)) {
    const sourceHero = slugFor(sourceName);
    for (const [targetName, score] of Object.entries(targets)) {
      const targetHero = slugFor(targetName);
      if (sourceHero === targetHero || score === 0) continue;
      const [first, second] = [sourceHero, targetHero].sort();
      const key = `${first}:${second}`;
      const pair = pairs.get(key) ?? { source_hero: first, target_hero: second, type: "synergy", observations: [] };
      pair.observations.push({ from: sourceHero, observed_score: score });
      pairs.set(key, pair);
    }
  }
  return [...pairs.values()]
    .map((pair) => ({ ...pair, observations: pair.observations.sort((a, b) => a.from.localeCompare(b.from)) }))
    .sort((a, b) => `${a.source_hero}:${a.target_hero}`.localeCompare(`${b.source_hero}:${b.target_hero}`));
}

function candidateKey(candidate) {
  return `${candidate.type}:${candidate.source_hero}:${candidate.target_hero}`;
}

function printDiff(previous, current) {
  const oldItems = new Map((previous?.candidates ?? []).map((item) => [candidateKey(item), JSON.stringify(item)]));
  const newItems = new Map(current.candidates.map((item) => [candidateKey(item), JSON.stringify(item)]));
  const added = [...newItems.keys()].filter((key) => !oldItems.has(key));
  const removed = [...oldItems.keys()].filter((key) => !newItems.has(key));
  const changed = [...newItems.keys()].filter((key) => oldItems.has(key) && oldItems.get(key) !== newItems.get(key));
  console.log(`[relations-sync] added=${added.length} removed=${removed.length} changed=${changed.length}`);
  for (const key of added.slice(0, 20)) console.log(`+ ${key}`);
  for (const key of removed.slice(0, 20)) console.log(`- ${key}`);
  for (const key of changed.slice(0, 20)) console.log(`~ ${key}`);
}

async function fetchMatrix(kind, url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "ow-perk-api-relation-sync/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${kind}: HTTP ${response.status}`);
  const text = await response.text();
  const data = JSON.parse(text);
  return {
    source_url: url,
    fetched_at: new Date().toISOString(),
    sha256: createHash("sha256").update(text).digest("hex"),
    data,
  };
}

await mkdir(outputDirectory, { recursive: true });
const snapshots = {};
for (const [kind, url] of Object.entries(endpoints)) {
  snapshots[kind] = await fetchMatrix(kind, url);
  await writeFile(new URL(`overpicker-${kind}.json`, outputDirectory), `${JSON.stringify(snapshots[kind], null, 2)}\n`);
}

const candidateDocument = {
  generated_at: new Date().toISOString(),
  source: "overpicker_candidate_api",
  candidates: [
    ...normalizeCounters(snapshots.counters.data),
    ...normalizeSynergies(snapshots.synergies.data),
  ],
};
const candidatePath = new URL("relation-candidates.json", outputDirectory);
let previous = null;
try {
  previous = JSON.parse(await readFile(candidatePath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
printDiff(previous, candidateDocument);
await writeFile(candidatePath, `${JSON.stringify(candidateDocument, null, 2)}\n`);
console.log(`[relations-sync] 후보 ${candidateDocument.candidates.length}개를 로컬 작업 폴더에 저장했습니다.`);
