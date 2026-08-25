import { readFileSync } from "node:fs";
import { knownHeroSlugs, koreanName, resolveKnownHero } from "./heroes.js";

export const RELATION_TYPES = Object.freeze(["counter", "synergy", "competition"]);
export const RELATION_STATUSES = Object.freeze(["candidate", "needs_review", "verified"]);
export const REASON_KINDS = Object.freeze(["mechanic", "playstyle", "role_slot"]);

const primaryRelationData = JSON.parse(readFileSync(new URL("./data/relations/relations.json", import.meta.url), "utf8"));
const rosterRelationData = JSON.parse(readFileSync(new URL("./data/relations/roster-relations.json", import.meta.url), "utf8"));
const relationData = {
  ...primaryRelationData,
  data_version: rosterRelationData.data_version,
  last_reviewed_at: rosterRelationData.last_reviewed_at,
  relations: [...primaryRelationData.relations, ...rosterRelationData.relations],
};
const sourceData = JSON.parse(readFileSync(new URL("./data/relations/relation-sources.json", import.meta.url), "utf8"));
const sourceById = new Map(sourceData.sources.map((source) => [source.id, source]));

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

export function validateRelationData(relationsDocument = relationData, sourcesDocument = sourceData) {
  const errors = [];
  const heroSlugs = new Set(knownHeroSlugs);
  const sourceIds = new Set();

  requireCondition(Number.isInteger(relationsDocument.schema_version), "schema_version은 정수여야 합니다.", errors);
  requireCondition(typeof relationsDocument.data_version === "string", "data_version이 필요합니다.", errors);
  requireCondition(isDate(relationsDocument.last_reviewed_at), "last_reviewed_at은 YYYY-MM-DD여야 합니다.", errors);
  requireCondition(Array.isArray(relationsDocument.relations), "relations는 배열이어야 합니다.", errors);
  requireCondition(Array.isArray(sourcesDocument.sources), "sources는 배열이어야 합니다.", errors);

  for (const source of sourcesDocument.sources ?? []) {
    requireCondition(typeof source.id === "string" && source.id.length > 0, "출처 id가 필요합니다.", errors);
    requireCondition(!sourceIds.has(source.id), `중복 출처 id: ${source.id}`, errors);
    sourceIds.add(source.id);
    requireCondition(typeof source.name === "string" && source.name.length > 0, `${source.id}: 출처 이름이 필요합니다.`, errors);
    requireCondition(/^https:\/\//.test(source.url ?? ""), `${source.id}: HTTPS 출처 URL이 필요합니다.`, errors);
    requireCondition(isDate(source.checked_at), `${source.id}: checked_at은 YYYY-MM-DD여야 합니다.`, errors);
  }

  const ids = new Set();
  const relationshipKeys = new Set();
  const strongCounters = new Map();
  for (const relation of relationsDocument.relations ?? []) {
    const prefix = relation.id || "(id 없음)";
    requireCondition(typeof relation.id === "string" && relation.id.length > 0, "관계 id가 필요합니다.", errors);
    requireCondition(!ids.has(relation.id), `중복 관계 id: ${relation.id}`, errors);
    ids.add(relation.id);
    requireCondition(heroSlugs.has(relation.source_hero), `${prefix}: 알 수 없는 source_hero ${relation.source_hero}`, errors);
    requireCondition(heroSlugs.has(relation.target_hero), `${prefix}: 알 수 없는 target_hero ${relation.target_hero}`, errors);
    requireCondition(relation.source_hero !== relation.target_hero, `${prefix}: 자기 자신과 관계를 만들 수 없습니다.`, errors);
    requireCondition(RELATION_TYPES.includes(relation.type), `${prefix}: 잘못된 type ${relation.type}`, errors);
    requireCondition(RELATION_STATUSES.includes(relation.status), `${prefix}: 잘못된 status ${relation.status}`, errors);
    requireCondition(Number.isFinite(relation.strength) && relation.strength >= 0 && relation.strength <= 1, `${prefix}: strength는 0~1이어야 합니다.`, errors);
    requireCondition(Number.isFinite(relation.confidence) && relation.confidence >= 0 && relation.confidence <= 1, `${prefix}: confidence는 0~1이어야 합니다.`, errors);

    const key = `${relation.type}:${relation.source_hero}:${relation.target_hero}`;
    requireCondition(!relationshipKeys.has(key), `${prefix}: 중복 관계 ${key}`, errors);
    relationshipKeys.add(key);

    if (["synergy", "competition"].includes(relation.type)) {
      requireCondition(relation.source_hero < relation.target_hero, `${prefix}: 양방향 관계는 slug 사전순으로 저장해야 합니다.`, errors);
    }

    requireCondition(Array.isArray(relation.reasons), `${prefix}: reasons는 배열이어야 합니다.`, errors);
    for (const reason of relation.reasons ?? []) {
      requireCondition(REASON_KINDS.includes(reason.kind), `${prefix}: 잘못된 reason kind ${reason.kind}`, errors);
      requireCondition(typeof reason.summary_ko === "string" && reason.summary_ko.length > 0, `${prefix}: 한국어 이유가 필요합니다.`, errors);
    }
    requireCondition(relation.contexts && Array.isArray(relation.contexts.modes) && Array.isArray(relation.contexts.ranks) && Array.isArray(relation.contexts.maps), `${prefix}: contexts의 modes/ranks/maps 배열이 필요합니다.`, errors);
    requireCondition(Array.isArray(relation.evidence), `${prefix}: evidence는 배열이어야 합니다.`, errors);
    for (const evidence of relation.evidence ?? []) {
      requireCondition(sourceIds.has(evidence.source), `${prefix}: 알 수 없는 출처 ${evidence.source}`, errors);
      requireCondition(isDate(evidence.checked_at), `${prefix}: evidence checked_at이 잘못되었습니다.`, errors);
    }
    if (relation.status === "verified") {
      requireCondition((relation.reasons?.length ?? 0) > 0, `${prefix}: verified 관계에는 이유가 필요합니다.`, errors);
      requireCondition((relation.evidence?.length ?? 0) > 0, `${prefix}: verified 관계에는 근거가 필요합니다.`, errors);
    }
    if (relation.confidence >= 0.8) {
      requireCondition((relation.evidence?.length ?? 0) >= 2, `${prefix}: 높은 신뢰도에는 근거가 2개 이상 필요합니다.`, errors);
    }
    if (relation.type === "counter" && relation.strength >= 0.75) {
      strongCounters.set(`${relation.source_hero}:${relation.target_hero}`, relation.id);
    }
  }

  for (const [direction, id] of strongCounters) {
    const [source, target] = direction.split(":");
    const reverse = strongCounters.get(`${target}:${source}`);
    requireCondition(!reverse, `${id}와 ${reverse}: 양방향 강한 카운터는 허용하지 않습니다.`, errors);
  }
  const coveredHeroes = new Set(
    (relationsDocument.relations ?? [])
      .filter((relation) => relation.status === "verified")
      .flatMap((relation) => [relation.source_hero, relation.target_hero]),
  );
  for (const hero of heroSlugs) {
    requireCondition(coveredHeroes.has(hero), `검수 완료 관계가 없는 영웅: ${hero}`, errors);
  }
  return errors;
}

const validationErrors = validateRelationData();
if (validationErrors.length) throw new Error(`관계 데이터 검증 실패:\n${validationErrors.join("\n")}`);

function publicStatuses(includeCandidates) {
  return includeCandidates ? new Set(RELATION_STATUSES) : new Set(["verified"]);
}

function sourcesFor(relations) {
  const ids = new Set(relations.flatMap((relation) => relation.evidence.map((item) => item.source)));
  return [...ids].map((id) => sourceById.get(id)).filter(Boolean);
}

function heroSummary(slug) {
  return { hero: slug, hero_name: koreanName(slug) ?? slug };
}

export function resolveRelationHero(input) {
  return resolveKnownHero(input);
}

export function resolveRelationHeroPair(input) {
  const parts = String(input ?? "").trim().split(/\s+/).filter(Boolean);
  const matches = [];
  for (let index = 1; index < parts.length; index += 1) {
    const source = resolveRelationHero(parts.slice(0, index).join(" "));
    const target = resolveRelationHero(parts.slice(index).join(" "));
    if (source && target && source.hero !== target.hero) matches.push([source, target]);
  }
  const unique = new Map(matches.map(([source, target]) => [`${source.hero}:${target.hero}`, [source, target]]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

export function getHeroRelations(heroInput, { type = null, includeCandidates = false } = {}) {
  const hero = resolveRelationHero(heroInput);
  if (!hero) return null;
  const statuses = publicStatuses(includeCandidates);
  const matches = relationData.relations.filter((relation) => {
    const involvesHero = relation.source_hero === hero.hero || relation.target_hero === hero.hero;
    return involvesHero && statuses.has(relation.status) && (!type || relation.type === type);
  });
  return {
    ...heroSummary(hero.hero),
    data_version: relationData.data_version,
    last_reviewed_at: relationData.last_reviewed_at,
    counters: matches.filter((item) => item.type === "counter" && item.source_hero === hero.hero),
    countered_by: matches.filter((item) => item.type === "counter" && item.target_hero === hero.hero),
    synergies: matches.filter((item) => item.type === "synergy"),
    competitions: matches.filter((item) => item.type === "competition"),
    sources: sourcesFor(matches),
  };
}

export function getPairRelations(sourceInput, targetInput, { includeCandidates = false } = {}) {
  const source = resolveRelationHero(sourceInput);
  const target = resolveRelationHero(targetInput);
  if (!source || !target || source.hero === target.hero) return null;
  const statuses = publicStatuses(includeCandidates);
  const matches = relationData.relations.filter((relation) => {
    const samePair = (relation.source_hero === source.hero && relation.target_hero === target.hero)
      || (relation.source_hero === target.hero && relation.target_hero === source.hero);
    return samePair && statuses.has(relation.status);
  });
  return {
    source: heroSummary(source.hero),
    target: heroSummary(target.hero),
    data_version: relationData.data_version,
    last_reviewed_at: relationData.last_reviewed_at,
    relations: matches,
    sources: sourcesFor(matches),
  };
}

export function relationMetadata() {
  return {
    schema_version: relationData.schema_version,
    data_version: relationData.data_version,
    last_reviewed_at: relationData.last_reviewed_at,
  };
}
