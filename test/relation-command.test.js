import test from "node:test";
import assert from "node:assert/strict";
import { parseRelationCommand } from "../src/relation-command.js";

test("관계 명령을 해석한다", () => {
  assert.deepEqual(parseRelationCommand("/관계 아나"), { kind: "overview", heroQuery: "아나" });
  assert.deepEqual(parseRelationCommand("관계 할머니"), { kind: "overview", heroQuery: "할머니" });
});

test("상성 명령의 두 영웅 입력을 보존한다", () => {
  assert.deepEqual(parseRelationCommand("/상성 아나 로드호그"), {
    kind: "matchup",
    pairQuery: "아나 로드호그",
  });
});

test("인수가 없으면 사용법을 반환하고 다른 메시지는 무시한다", () => {
  assert.match(parseRelationCommand("/관계").error, /사용법/);
  assert.match(parseRelationCommand("상성").error, /사용법/);
  assert.equal(parseRelationCommand("아나"), null);
});
