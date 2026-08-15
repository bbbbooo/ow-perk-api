import test from "node:test";
import assert from "node:assert/strict";
import { parsePerkCommand } from "../src/message-command.js";

test("영웅 옵션 이름 없이 명령어를 해석한다", () => {
  assert.deepEqual(parsePerkCommand("/특전 아나"), { heroQuery: "아나", mode: "all" });
});

test("마지막 단어로 모드를 선택한다", () => {
  assert.deepEqual(parsePerkCommand("/특전 솔저 76 경쟁전"), { heroQuery: "솔저 76", mode: "competitive" });
  assert.deepEqual(parsePerkCommand("특전 디바 빠대"), { heroQuery: "디바", mode: "quickplay" });
});

test("영웅이 없으면 사용법을 반환한다", () => {
  assert.match(parsePerkCommand("/특전").error, /사용법/);
});
