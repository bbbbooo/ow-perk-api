import { normalize } from "./heroes.js";

const modeAliases = new Map([
  ["모든모드", "all"], ["전체", "all"], ["all", "all"],
  ["빠른대전", "quickplay"], ["빠대", "quickplay"], ["quickplay", "quickplay"], ["qp", "quickplay"],
  ["경쟁전", "competitive"], ["경쟁", "competitive"], ["competitive", "competitive"], ["comp", "competitive"],
]);

export function parsePerkCommand(content) {
  const match = String(content ?? "").trim().match(/^\/?특전(?:\s+(.+))?$/i);
  if (!match) return null;
  if (!match[1]) return { error: "사용법: `/특전 아나` 또는 `/특전 아나 경쟁전`" };

  const parts = match[1].trim().split(/\s+/);
  const requestedMode = modeAliases.get(normalize(parts.at(-1)));
  const mode = requestedMode ?? "all";
  if (requestedMode) parts.pop();
  const heroQuery = parts.join(" ").trim();
  if (!heroQuery) return { error: "영웅 이름을 입력해 주세요. 예: `/특전 아나`" };
  return { heroQuery, mode };
}
