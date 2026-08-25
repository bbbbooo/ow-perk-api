import { validateRelationData } from "../src/relations.js";

const errors = validateRelationData();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("[relations] 관계 데이터 검증 완료");
}
