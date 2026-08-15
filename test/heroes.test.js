import test from "node:test";
import assert from "node:assert/strict";
import { resolveHero, searchHeroes } from "../src/heroes.js";

const heroes = [
  { hero: "ana", hero_name: "Ana" },
  { hero: "dva", hero_name: "D.Va" },
  { hero: "soldier_76", hero_name: "Soldier: 76" },
];

test("한국어·영문·구두점 없는 이름을 해석한다", () => {
  assert.equal(resolveHero("아나", heroes)?.hero, "ana");
  assert.equal(resolveHero("DVA", heroes)?.hero, "dva");
  assert.equal(resolveHero("솔저 76", heroes)?.hero, "soldier_76");
});

test("자동완성은 부분 문자열을 찾는다", () => {
  assert.deepEqual(searchHeroes("디", heroes).map((hero) => hero.hero), ["dva"]);
});
