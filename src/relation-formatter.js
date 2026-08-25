import { EmbedBuilder } from "discord.js";
import { koreanName } from "./heroes.js";

const TYPE_LABELS = {
  counter: "카운터",
  synergy: "시너지",
  competition: "경쟁 픽",
};

export function strengthLabel(value) {
  if (value >= 0.75) return "강함";
  if (value >= 0.5) return "보통";
  return "약함";
}

export function confidenceLabel(value) {
  if (value >= 0.8) return "높음";
  if (value >= 0.55) return "중간";
  return "낮음";
}

function truncate(value, limit = 1024) {
  return value.length <= limit ? value : `${value.slice(0, limit - 3)}...`;
}

function otherHero(relation, hero) {
  return relation.source_hero === hero ? relation.target_hero : relation.source_hero;
}

function relationLine(relation, hero) {
  const target = otherHero(relation, hero);
  const reason = relation.reasons[0]?.summary_ko ?? "상세 이유 검토 중";
  return `**${koreanName(target) ?? target}** · 영향 ${strengthLabel(relation.strength)} · 근거 ${confidenceLabel(relation.confidence)}\n↳ ${reason}`;
}

function relationField(name, relations, hero) {
  const value = relations.length
    ? relations.map((relation) => relationLine(relation, hero)).join("\n\n")
    : "검수 완료된 관계가 아직 없습니다.";
  return { name, value: truncate(value) };
}

export function buildRelationOverviewEmbed(data) {
  return new EmbedBuilder()
    .setColor(0x4f8cff)
    .setTitle(`${data.hero_name} 영웅 관계`)
    .setDescription(`영향 강도와 근거 신뢰도는 별개이며, 어느 쪽도 승률이나 승리 확률을 뜻하지 않습니다.`)
    .addFields(
      relationField("유리한 상호작용", data.counters, data.hero),
      relationField("주의할 상대", data.countered_by, data.hero),
      relationField("시너지", data.synergies, data.hero),
      relationField("경쟁 픽", data.competitions, data.hero),
    )
    .setFooter({ text: `관계 데이터 ${data.data_version} · 최종 검수 ${data.last_reviewed_at}` });
}

function pairRelationField(relation) {
  const source = koreanName(relation.source_hero) ?? relation.source_hero;
  const target = koreanName(relation.target_hero) ?? relation.target_hero;
  const direction = relation.type === "counter" ? `${source} → ${target}` : `${source} ↔ ${target}`;
  const details = [
    `**영향:** ${strengthLabel(relation.strength)} · **근거 신뢰도:** ${confidenceLabel(relation.confidence)}`,
    ...relation.reasons.map((reason) => `• ${reason.summary_ko}`),
    relation.caveats_ko ? `⚠️ ${relation.caveats_ko}` : null,
  ].filter(Boolean).join("\n");
  return { name: `${TYPE_LABELS[relation.type]} · ${direction}`, value: truncate(details) };
}

export function buildPairRelationEmbed(data) {
  const embed = new EmbedBuilder()
    .setColor(0x9b6cff)
    .setTitle(`${data.source.hero_name} ↔ ${data.target.hero_name} 상성`)
    .setDescription("기술 상호작용과 조건을 정리한 자료이며 통계적 승률이나 정답을 뜻하지 않습니다.")
    .setFooter({ text: `관계 데이터 ${data.data_version} · 최종 검수 ${data.last_reviewed_at}` });

  if (data.relations.length) {
    embed.addFields(data.relations.map(pairRelationField));
    const sources = data.sources
      .map((source) => `[${source.name}](${source.url}) · ${source.checked_at}`)
      .join("\n");
    if (sources) embed.addFields({ name: "출처 및 확인일", value: truncate(sources) });
  } else {
    embed.addFields({ name: "검수 결과", value: "두 영웅 사이에 공개된 검수 완료 관계가 아직 없습니다." });
  }
  return embed;
}
