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
  assert.match(json.description, /맵과 조합/);
  assert.match(json.title, /상성 요약/);
  assert.equal(json.fields[0].name, "🚨 아나의 카운터");
  assert.equal(json.fields[1].name, "🎯 아나가 카운터하는 영웅");
  assert.equal(json.fields[2].name, "🤝 아나와 잘 맞는 영웅");
  assert.match(json.fields[0].value, /키리코\*\* · 강한 카운터/);
  assert.match(json.fields[0].value, /↳ 정화의 방울/);
  assert.match(json.fields[2].value, /겐지\*\* · 궁합 매우 좋음/);
  assert.doesNotMatch(json.fields[0].value, /근거 높음/);
  assert.ok(json.fields[0].value.indexOf("키리코") < json.fields[0].value.indexOf("윈스턴"));
  assert.ok(json.fields[2].value.indexOf("겐지") < json.fields[2].value.indexOf("윈스턴"));
});

test("두 영웅 상성 Embed에 이유와 출처를 표시한다", () => {
  const json = buildPairRelationEmbed(getPairRelations("아나", "로드호그")).toJSON();
  assert.ok(json.fields.some((field) => field.name === "⚔️ 아나 ➜ 로드호그"));
  assert.ok(json.fields.some((field) => field.name === "🛡️ 로드호그 ➜ 아나 대응 방법"));
  assert.ok(json.fields.some((field) => field.name === "출처 및 확인일"));
  assert.ok(json.fields.every((field) => field.value.length <= 1024));
});

test("두 영웅 상성의 카운터 방향을 자연스럽게 표시한다", () => {
  const json = buildPairRelationEmbed(getPairRelations("아나", "디바")).toJSON();
  assert.equal(json.title, "아나 vs 디바 상성");
  assert.equal(json.fields[0].name, "⚔️ 디바 ➜ 아나");
  assert.equal(json.fields[1].name, "🛡️ 아나 ➜ 디바 대응 방법");
  assert.match(json.fields[0].value, /방어 매트릭스/);
});

test("다른 영웅도 화살표로 카운터 방향을 표시한다", () => {
  const json = buildPairRelationEmbed(getPairRelations("윈스턴", "아나")).toJSON();
  assert.ok(json.fields.some((field) => field.name === "⚔️ 윈스턴 ➜ 아나"));
});
