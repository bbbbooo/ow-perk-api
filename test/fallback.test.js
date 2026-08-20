import test from "node:test";
import assert from "node:assert/strict";
import { getFallbackHeroPerks, getFallbackHeroes } from "../src/fallback.js";

test("모드별 저장 통계를 불러온다", () => {
  assert.ok(getFallbackHeroes("all").length > 0);
  assert.ok(getFallbackHeroes("quickplay").length > 0);
  assert.ok(getFallbackHeroes("competitive").length > 0);
});

test("저장 통계에서 영웅별 특전을 찾고 폴백 상태를 표시한다", () => {
  const ana = getFallbackHeroPerks("ana", "all");
  assert.equal(ana.hero, "ana");
  assert.equal(ana._fallback, true);
  assert.ok(ana._snapshotAt);
  assert.ok(ana.perks.length > 0);
});
