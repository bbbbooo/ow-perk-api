import { readFile, writeFile } from "node:fs/promises";
import { koreanName } from "../src/heroes.js";

const sourceCommit = "99aff969544ee668b7af16eb9641e37f67306b54";
const checkedAt = "2026-08-25";
const dataVersion = "2026-08-25.3";
const sourceBase = `https://raw.githubusercontent.com/MaikBuse/minmax-watch/${sourceCommit}/data`;
const output = new URL("../src/data/relations/expanded-relations.json", import.meta.url);

const manualReasons = new Map([
  ["pharah:genji", "파라는 공중에 머물러 겐지의 느린 투사체와 질풍참이 닿기 어렵습니다."],
  ["pharah:anran", "안란은 공중의 적을 지속적으로 공격하기 어려워 파라가 안전한 고도에서 압박할 수 있습니다."],
  ["winston:genji", "윈스턴의 전기 공격은 튕겨내기로 막을 수 없고 점프 팩으로 도망가는 겐지를 추격할 수 있습니다."],
  ["symmetra:genji", "시메트라의 광선과 감시 포탑은 겐지의 튕겨내기를 무시하고 빠른 움직임을 제한합니다."],
  ["moira:genji", "모이라의 생체 손아귀는 정밀 조준 부담이 적고 튕겨내기로 막을 수 없어 겐지를 꾸준히 압박합니다."],
  ["dva:pharah", "디바는 부스터로 공중의 파라를 추격하고 방어 매트릭스로 로켓과 포화를 지울 수 있습니다."],
  ["cassidy:pharah", "캐서디의 히트스캔 공격은 공중에 떠 있는 파라를 안정적으로 압박할 수 있습니다."],
  ["soldier_76:pharah", "솔저: 76의 히트스캔 소총과 전술 조준경은 공중의 파라를 지속적으로 압박하기 좋습니다."],
  ["zarya:dva", "자리야의 광선은 방어 매트릭스로 막을 수 없어 디바가 정면에서 버티기 어렵습니다."],
  ["sombra:wrecking_ball", "솜브라의 해킹은 레킹볼의 구르기와 갈고리 기동을 끊어 진입 후 이탈을 어렵게 만듭니다."],
]);
const manualCounterplay = new Map([
  ["pharah:genji", "겐지는 실내와 고지대를 이용해 거리를 좁히고, 파라가 이동기를 사용한 뒤나 착지할 때를 노리는 편이 좋습니다."],
  ["pharah:anran", "안란은 엄폐와 실내 공간을 활용해 파라의 고도를 제한하고, 파라가 착지할 때 진입하는 편이 좋습니다."],
  ["dva:pharah", "파라는 디바의 부스터와 방어 매트릭스가 빠진 타이밍을 확인한 뒤 포화를 집중하는 편이 좋습니다."],
  ["cassidy:pharah", "파라는 엄폐물을 끼고 짧게 모습을 드러내며 캐서디의 시야와 유효 사거리를 피해야 합니다."],
  ["zarya:dva", "디바는 자리야의 방벽과 고에너지 광선을 정면에서 상대하기보다 기동력으로 다른 표적을 노리는 편이 좋습니다."],
]);

function parseTomlList(text, section) {
  return text.split(`[[${section}]]`).slice(1).map((block) => Object.fromEntries(
    [...block.matchAll(/^([a-z_]+)\s*=\s*(?:"([^"]*)"|(-?\d+)|(true|false))/gm)]
      .map((match) => [
        match[1],
        match[2] ?? (match[3] !== undefined ? Number(match[3]) : match[4] === "true"),
      ]),
  ));
}

function slug(value) {
  return String(value).replaceAll("-", "_");
}

function pairKey(first, second) {
  return [first, second].sort().join(":");
}

function strengthFromScore(score) {
  return Math.min(0.9, Math.max(0.55, 0.5 + Math.abs(score) / 200));
}

function confidenceFor(row) {
  const independentSources = Number(row.cpgg !== undefined) + Number(row.cwatch !== undefined);
  return row.disagreement ? 0.6 : independentSources >= 2 ? 0.78 : 0.68;
}

function withJosa(value, batchimJosa, noBatchimJosa) {
  const text = String(value);
  const last = text.at(-1);
  const codePoint = last?.codePointAt(0) ?? 0;
  const hangulBatchim = codePoint >= 0xac00 && codePoint <= 0xd7a3 && (codePoint - 0xac00) % 28 !== 0;
  const digitBatchim = /[013678]$/.test(text);
  return `${text}${hangulBatchim || digitBatchim ? batchimJosa : noBatchimJosa}`;
}

function genericCounterReason(source, target) {
  const sourceName = koreanName(source) ?? source;
  const targetName = koreanName(target) ?? target;
  return `${withJosa(sourceName, "은", "는")} ${withJosa(targetName, "을", "를")} 상대로 기술 구성과 교전 방식에서 유리한 영웅으로 평가됩니다.`;
}

function genericCounterplay(target) {
  const targetName = koreanName(target) ?? target;
  return `${withJosa(targetName, "은", "는")} 아군 지원과 엄폐를 활용하고, 상대의 핵심 기술이 빠진 타이밍에 교전하는 편이 좋습니다.`;
}

function evidenceFor(row, kind) {
  return [{
    source: kind === "counter" ? "minmax_watch_matchups" : "minmax_watch_synergy",
    kind: "aggregated_matchup_data",
    observed_score: row.value,
    checked_at: checkedAt,
  }];
}

async function fetchText(path) {
  const response = await fetch(`${sourceBase}/${path}`, {
    headers: { accept: "text/plain", "user-agent": "ow-perk-api-relation-sync/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

const [matchupText, synergyText, primaryText, rosterText] = await Promise.all([
  fetchText("matchups.toml"),
  fetchText("synergy.toml"),
  readFile(new URL("../src/data/relations/relations.json", import.meta.url), "utf8"),
  readFile(new URL("../src/data/relations/roster-relations.json", import.meta.url), "utf8"),
]);
const matchups = parseTomlList(matchupText, "matchup");
const synergies = parseTomlList(synergyText, "synergy");
const existing = [
  ...JSON.parse(primaryText).relations,
  ...JSON.parse(rosterText).relations,
];
const existingCounters = new Set(
  existing.filter((item) => item.type === "counter").map((item) => pairKey(item.source_hero, item.target_hero)),
);
const existingSynergies = new Set(
  existing.filter((item) => item.type === "synergy").map((item) => pairKey(item.source_hero, item.target_hero)),
);
const heroes = [...new Set(matchups.map((item) => item.hero))].sort();

const counterCandidates = new Map();
for (const hero of heroes) {
  const rows = matchups.filter((item) => item.hero === hero);
  const selected = [
    ...rows.filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 3),
    ...rows.filter((item) => item.value < 0).sort((a, b) => a.value - b.value).slice(0, 3),
  ];
  for (const row of selected) {
    const rowHero = slug(row.hero);
    const opponent = slug(row.vs);
    const sourceHero = row.value > 0 ? rowHero : opponent;
    const targetHero = row.value > 0 ? opponent : rowHero;
    const key = pairKey(sourceHero, targetHero);
    if (existingCounters.has(key)) continue;
    const previous = counterCandidates.get(key);
    if (!previous || Math.abs(row.value) > Math.abs(previous.row.value)) {
      counterCandidates.set(key, { sourceHero, targetHero, row });
    }
  }
}

const synergyCandidates = new Map();
for (const hero of heroes) {
  const selected = synergies
    .filter((item) => item.hero === hero && item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);
  for (const row of selected) {
    const [sourceHero, targetHero] = [slug(row.hero), slug(row.with)].sort();
    const key = pairKey(sourceHero, targetHero);
    if (existingSynergies.has(key)) continue;
    const previous = synergyCandidates.get(key);
    if (!previous || row.value > previous.row.value) synergyCandidates.set(key, { sourceHero, targetHero, row });
  }
}

const counterRelations = [...counterCandidates.values()].map(({ sourceHero, targetHero, row }) => ({
  id: `${sourceHero}__${targetHero}__counter`,
  source_hero: sourceHero,
  target_hero: targetHero,
  type: "counter",
  strength: strengthFromScore(row.value),
  confidence: confidenceFor(row),
  reasons: [{
    kind: "playstyle",
    source_ability: "matchup_advantage",
    target_trait: "matchup_disadvantage",
    summary_ko: manualReasons.get(`${sourceHero}:${targetHero}`) ?? genericCounterReason(sourceHero, targetHero),
  }],
  contexts: { modes: ["competitive_5v5"], ranks: [], maps: [] },
  caveats_ko: manualCounterplay.get(`${sourceHero}:${targetHero}`)
    ?? genericCounterplay(targetHero),
  evidence: evidenceFor(row, "counter"),
  status: "verified",
  valid_from_patch: null,
  valid_until_patch: null,
}));

const synergyRelations = [...synergyCandidates.values()].map(({ sourceHero, targetHero, row }) => ({
  id: `${sourceHero}__${targetHero}__synergy`,
  source_hero: sourceHero,
  target_hero: targetHero,
  type: "synergy",
  strength: strengthFromScore(row.value),
  confidence: 0.65,
  reasons: [{
    kind: "playstyle",
    source_ability: "team_composition",
    target_trait: "team_composition",
    summary_ko: "최신 조합 자료에서 함께 사용할 때 역할과 교전 흐름이 잘 맞는 조합으로 평가됩니다.",
  }],
  contexts: { modes: ["competitive_5v5"], ranks: [], maps: [] },
  caveats_ko: "나머지 팀 조합과 맵에 따라 시너지의 체감은 달라질 수 있습니다.",
  evidence: evidenceFor(row, "synergy"),
  status: "verified",
  valid_from_patch: null,
  valid_until_patch: null,
}));

const document = {
  schema_version: 1,
  data_version: dataVersion,
  last_reviewed_at: checkedAt,
  selection_rule: "각 영웅의 상위 카운터 3개, 피카운터 3개, 시너지 2개를 합친 뒤 중복 제거",
  relations: [...counterRelations, ...synergyRelations].sort((left, right) => left.id.localeCompare(right.id)),
};
await writeFile(output, `${JSON.stringify(document, null, 2)}\n`);
console.log(`[relations-sync] 확장 관계 ${document.relations.length}개 생성 (카운터 ${counterRelations.length}, 시너지 ${synergyRelations.length})`);
