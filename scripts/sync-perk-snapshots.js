import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = "https://stats.overlooker.app/api/perks";
const outputDirectory = new URL("../src/data/perk-snapshots/", import.meta.url);
const modes = {
  all: null,
  quickplay: "QUICKPLAY",
  competitive: "COMPETITIVE",
};

await mkdir(outputDirectory, { recursive: true });

for (const [mode, queueType] of Object.entries(modes)) {
  const url = new URL(baseUrl);
  if (queueType) url.searchParams.set("queue_type", queueType);
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "ow-perk-api-snapshot/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${mode} snapshot failed: HTTP ${response.status}`);
  const data = await response.json();
  const snapshot = { fetched_at: new Date().toISOString(), ...data };
  await writeFile(new URL(`${mode}.json`, outputDirectory), `${JSON.stringify(snapshot)}\n`);
  console.log(`[snapshot] ${mode}: ${snapshot.heroes?.length ?? 0} heroes`);
}
