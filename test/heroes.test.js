import test from "node:test";
import assert from "node:assert/strict";
import { resolveHero, resolveKnownHero, searchHeroes } from "../src/heroes.js";

const heroes = [
  { hero: "ana", hero_name: "Ana" },
  { hero: "dva", hero_name: "D.Va" },
  { hero: "soldier_76", hero_name: "Soldier: 76" },
  { hero: "wrecking_ball", hero_name: "Wrecking Ball" },
  { hero: "winston", hero_name: "Winston" },
  { hero: "widowmaker", hero_name: "Widowmaker" },
  { hero: "zenyatta", hero_name: "Zenyatta" },
];

test("한국어·영문·구두점 없는 이름을 해석한다", () => {
  assert.equal(resolveHero("아나", heroes)?.hero, "ana");
  assert.equal(resolveHero("DVA", heroes)?.hero, "dva");
  assert.equal(resolveHero("솔저 76", heroes)?.hero, "soldier_76");
});

test("한국 커뮤니티 별명과 축약형을 해석한다", () => {
  assert.equal(resolveHero("할머니", heroes)?.hero, "ana");
  assert.equal(resolveHero("레킹", heroes)?.hero, "wrecking_ball");
  assert.equal(resolveHero("볼", heroes)?.hero, "wrecking_ball");
  assert.equal(resolveHero("해먼드", heroes)?.hero, "wrecking_ball");
  assert.equal(resolveHero("원숭이", heroes)?.hero, "winston");
  assert.equal(resolveHero("위도", heroes)?.hero, "widowmaker");
  assert.equal(resolveHero("야타", heroes)?.hero, "zenyatta");
  assert.equal(resolveHero("김병장", heroes)?.hero, "soldier_76");
});

test("알려진 영웅은 API 목록 없이 바로 해석한다", () => {
  assert.equal(resolveKnownHero("할머니")?.hero, "ana");
  assert.equal(resolveKnownHero("볼")?.hero, "wrecking_ball");
  assert.equal(resolveKnownHero("Soldier 76")?.hero, "soldier_76");
  assert.equal(resolveKnownHero("존재하지 않는 영웅"), null);
});

test("자동완성은 부분 문자열을 찾는다", () => {
  assert.deepEqual(searchHeroes("디", heroes).map((hero) => hero.hero), ["dva"]);
});
