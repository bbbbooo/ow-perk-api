import test from "node:test";
import assert from "node:assert/strict";
import { percent, tierLines } from "../src/formatter.js";

test("선택률을 백분율 한 자리로 표시한다", () => assert.equal(percent(0.586), "58.6%"));

test("선호 특전을 먼저 표시한다", () => {
  const lines = tierLines([
    { name: "A", tier: "minor", pick_rate: 0.4, picks: 4 },
    { name: "B", tier: "minor", pick_rate: 0.6, picks: 6 },
  ], "minor");
  assert.match(lines, /^🏆 \*\*B\*\*/);
});
