import test from "node:test";
import assert from "node:assert/strict";
import { percent, tierLines } from "../src/formatter.js";
import { localizePerkData } from "../src/localization.js";

test("선택률을 백분율 한 자리로 표시한다", () => assert.equal(percent(0.586), "58.6%"));

test("선호 특전을 먼저 표시하고 공식 한국어 이름을 사용한다", () => {
  const lines = tierLines([
    { slug: "groggy", name: "Groggy", tier: "minor", pick_rate: 0.4, picks: 4 },
    { slug: "speed_serum", name: "Speed Serum", tier: "minor", pick_rate: 0.6, picks: 6 },
  ], "minor", "ana");
  assert.match(lines, /^🏆 \*\*가속 혈청\*\*/);
  assert.match(lines, /수면총에서 깨어난 적/);
});

test("API 데이터는 공식 한국어 이름과 원문 이름을 함께 제공한다", () => {
  const data = localizePerkData({
    hero: "ana",
    perks: [{ slug: "groggy", name: "Groggy" }],
  });
  assert.equal(data.perks[0].name, "혼미");
  assert.equal(data.perks[0].name_en, "Groggy");
  assert.match(data.perks[0].description, /수면총/);
  assert.match(data.perks[0].description_en, /Sleep Dart/);
});
