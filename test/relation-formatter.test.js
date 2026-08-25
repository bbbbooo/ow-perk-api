import test from "node:test";
import assert from "node:assert/strict";
import { buildPairRelationEmbed, buildRelationOverviewEmbed, confidenceLabel, strengthLabel } from "../src/relation-formatter.js";
import { getHeroRelations, getPairRelations } from "../src/relations.js";

test("강도와 신뢰도를 서로 다른 등급으로 표시한다", () => {
  assert.equal(strengthLabel(0.8), "강함");
  assert.equal(strengthLabel(0.6), "보통");
  assert.equal(confidenceLabel(0.85), "높음");
  assert.equal(confidenceLabel(0.6), "중간");
});

test("관계 개요 Embed가 Discord 필드 제한을 지킨다", () => {
  const json = buildRelationOverviewEmbed(getHeroRelations("아나")).toJSON();
  assert.ok(json.fields.every((field) => field.value.length <= 1024));
  assert.match(json.description, /승률/);
});

test("두 영웅 상성 Embed에 이유와 출처를 표시한다", () => {
  const json = buildPairRelationEmbed(getPairRelations("아나", "로드호그")).toJSON();
  assert.ok(json.fields.some((field) => field.name.includes("카운터")));
  assert.ok(json.fields.some((field) => field.name === "출처 및 확인일"));
  assert.ok(json.fields.every((field) => field.value.length <= 1024));
});
