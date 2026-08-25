import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getHeroRelations,
  getPairRelations,
  resolveDirectRelationHeroPair,
  resolveRelationHeroPair,
  validateRelationData,
} from "../src/relations.js";
import { knownHeroSlugs } from "../src/heroes.js";

test("관계 데이터가 스키마 검증을 통과한다", () => {
  assert.deepEqual(validateRelationData(), []);
});

test("잘못된 slug, 자기 관계, 점수, 중복과 근거 누락을 거부한다", () => {
  const relations = JSON.parse(readFileSync(new URL("../src/data/relations/relations.json", import.meta.url), "utf8"));
  const sources = JSON.parse(readFileSync(new URL("../src/data/relations/relation-sources.json", import.meta.url), "utf8"));
  const invalid = structuredClone(relations.relations[0]);
  invalid.id = "invalid_relation";
  invalid.source_hero = "not_a_hero";
  invalid.target_hero = "not_a_hero";
  invalid.strength = 2;
  invalid.reasons = [];
  invalid.evidence = [];
  relations.relations.push(invalid, structuredClone(invalid));
  const errors = validateRelationData(relations, sources).join("\n");
  assert.match(errors, /알 수 없는 source_hero/);
  assert.match(errors, /자기 자신/);
  assert.match(errors, /strength는 0~1/);
  assert.match(errors, /중복 관계 id/);
  assert.match(errors, /verified 관계에는 이유/);
  assert.match(errors, /높은 신뢰도에는 근거가 2개/);
});

test("한국어 별칭으로 영웅 관계를 조회한다", () => {
  const data = getHeroRelations("할머니");
  assert.equal(data.hero, "ana");
  assert.ok(data.counters.some((item) => item.target_hero === "roadhog"));
  assert.ok(data.countered_by.some((item) => item.source_hero === "kiriko"));
  assert.ok(data.synergies.some((item) => item.target_hero === "winston"));
  assert.ok(data.sources.length > 0);
});

test("관계 type 필터를 적용한다", () => {
  const data = getHeroRelations("디바", { type: "competition" });
  assert.equal(data.counters.length, 0);
  assert.equal(data.synergies.length, 0);
  assert.ok(data.competitions.some((item) =>
    [item.source_hero, item.target_hero].includes("winston")
  ));
});

test("모든 영웅이 카운터·피카운터 3명과 시너지 2명 이상을 가진다", () => {
  for (const slug of knownHeroSlugs) {
    const data = getHeroRelations(slug);
    assert.ok(data.counters.length >= 3, `${slug}가 카운터하는 영웅이 부족합니다.`);
    assert.ok(data.countered_by.length >= 3, `${slug}의 카운터 영웅이 부족합니다.`);
    assert.ok(data.synergies.length >= 2, `${slug}의 시너지 영웅이 부족합니다.`);
  }
});

test("겐지-파라와 안란-파라의 직접 상성을 제공한다", () => {
  const genjiPharah = getPairRelations("겐지", "파라");
  assert.ok(genjiPharah.relations.some((item) => item.source_hero === "pharah" && item.target_hero === "genji"));
  const anranPharah = getPairRelations("안란", "파라");
  assert.ok(anranPharah.relations.some((item) => item.source_hero === "pharah" && item.target_hero === "anran"));
});

test("두 영웅 사이의 방향별 관계를 반환한다", () => {
  const data = getPairRelations("아나", "로드호그");
  assert.deepEqual(data.relations.map((item) => item.type).sort(), ["counter", "synergy"]);
  assert.equal(data.relations.find((item) => item.type === "counter").source_hero, "ana");
});

test("공백이 포함된 영웅 이름 두 개를 구분한다", () => {
  assert.deepEqual(resolveRelationHeroPair("디바 윈스턴").map((hero) => hero.hero), ["dva", "winston"]);
  assert.equal(resolveRelationHeroPair("아나"), null);
});

test("전용 채널의 두 영웅 입력을 구분하고 공백이 있는 한 영웅은 제외한다", () => {
  assert.deepEqual(resolveDirectRelationHeroPair("아나 디바").map((hero) => hero.hero), ["ana", "dva"]);
  assert.deepEqual(resolveDirectRelationHeroPair("볼 윈스").map((hero) => hero.hero), ["wrecking_ball", "winston"]);
  assert.equal(resolveDirectRelationHeroPair("솔저 76"), null);
  assert.equal(resolveDirectRelationHeroPair("레킹 볼"), null);
});
