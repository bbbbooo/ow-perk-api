import test from "node:test";
import assert from "node:assert/strict";
import { millisecondsUntilNextKoreanMidnight } from "../src/overlooker.js";

test("한국시간 자정 1분 전에는 캐시가 1분 뒤 만료된다", () => {
  const at2359Kst = Date.parse("2026-08-25T14:59:00.000Z");
  assert.equal(millisecondsUntilNextKoreanMidnight(at2359Kst), 60_000);
});

test("한국시간 자정에는 캐시가 다음 자정까지 24시간 유지된다", () => {
  const atMidnightKst = Date.parse("2026-08-25T15:00:00.000Z");
  assert.equal(millisecondsUntilNextKoreanMidnight(atMidnightKst), 24 * 60 * 60 * 1000);
});
