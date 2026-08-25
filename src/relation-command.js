export function parseRelationCommand(content) {
  const value = String(content ?? "").trim();
  const overview = value.match(/^\/?관계(?:\s+(.+))?$/i);
  if (overview) {
    if (!overview[1]) return { error: "사용법: `/관계 아나`" };
    return { kind: "overview", heroQuery: overview[1].trim() };
  }

  const matchup = value.match(/^\/?상성(?:\s+(.+))?$/i);
  if (matchup) {
    if (!matchup[1]) return { error: "사용법: `/상성 아나 로드호그`" };
    return { kind: "matchup", pairQuery: matchup[1].trim() };
  }
  return null;
}
