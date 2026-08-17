import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OVERLOOKER_URL = "https://stats.overlooker.app/api/perks";
const BLIZZARD_BASE_URL = "https://overwatch.blizzard.com";
const OUTPUT_URL = new URL("../src/data/perk-names.ko.json", import.meta.url);

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function officialHeroSlug(slug) {
  return slug.replaceAll("_", "-");
}

function extractPerks(html) {
  const perks = new Map();
  const pattern = /<div class="perk-details [^"]*\b(?:minor|major)\s+([1-4])">[\s\S]*?<h3 slot="subheading">([\s\S]*?)<\/h3><div slot="description">([\s\S]*?)<\/div><\/blz-header>/g;
  for (const match of html.matchAll(pattern)) {
    perks.set(Number(match[1]), {
      name: decodeHtml(match[2]),
      description: decodeHtml(match[3]),
    });
  }
  return perks;
}

async function getText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "ow-perk-api localization sync" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function mapHero(hero) {
  const pageSlug = officialHeroSlug(hero.hero);
  const [englishHtml, koreanHtml] = await Promise.all([
    getText(`${BLIZZARD_BASE_URL}/en-us/heroes/${pageSlug}/`),
    getText(`${BLIZZARD_BASE_URL}/ko-kr/heroes/${pageSlug}/`),
  ]);
  const english = extractPerks(englishHtml);
  const korean = extractPerks(koreanHtml);
  if (english.size !== 4 || korean.size !== 4) {
    throw new Error(`${hero.hero}: official perk count mismatch (en=${english.size}, ko=${korean.size})`);
  }

  const localizedPerks = {};
  for (const perk of hero.perks) {
    const officialEnglish = english.get(perk.slot);
    const officialKorean = korean.get(perk.slot);
    if (!officialEnglish || !officialKorean) throw new Error(`${hero.hero}: missing slot ${perk.slot}`);
    localizedPerks[perk.slug] = {
      name: officialKorean.name,
      description: officialKorean.description,
      name_en: officialEnglish.name,
      description_en: officialEnglish.description,
    };
  }
  return [hero.hero, localizedPerks];
}

async function main() {
  const response = await fetch(OVERLOOKER_URL, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Overlooker returned ${response.status}`);
  const { heroes } = await response.json();

  const entries = [];
  for (let index = 0; index < heroes.length; index += 5) {
    const batch = heroes.slice(index, index + 5);
    entries.push(...await Promise.all(batch.map(mapHero)));
    console.log(`[sync] ${Math.min(index + batch.length, heroes.length)}/${heroes.length}`);
  }

  const output = {
    source: "https://overwatch.blizzard.com/ko-kr/heroes/",
    synced_at: new Date().toISOString(),
    heroes: Object.fromEntries(entries),
  };
  const outputPath = fileURLToPath(OUTPUT_URL);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`[sync] wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`[sync] failed: ${error.message}`);
  process.exitCode = 1;
});
