import { EmbedBuilder } from "discord.js";
import { koreanName } from "./heroes.js";

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

function overviewRelationLabel(kind, strength) {
  if (kind === "counter") {
    if (strength >= 0.75) return "강한 카운터";
    if (strength >= 0.5) return "카운터";
    return "약한 카운터";
  }
  if (kind === "synergy") {
    if (strength >= 0.75) return "궁합 매우 좋음";
    if (strength >= 0.5) return "궁합 좋음";
    return "상황에 따라 좋음";
  }
  if (strength >= 0.75) return "역할이 매우 비슷함";
  if (strength >= 0.5) return "역할이 비슷함";
  return "일부 역할이 겹침";
}

function relationLine(relation, hero, kind) {
  const target = otherHero(relation, hero);
  const reason = relation.reasons[0]?.summary_ko ?? "상세 이유 검토 중";
  return `**${koreanName(target) ?? target}** · ${overviewRelationLabel(kind, relation.strength)}\n↳ ${reason}`;
}

function relationField(name, relations, hero, kind) {
  const sorted = [...relations]
    .sort((left, right) => right.strength - left.strength || right.confidence - left.confidence);
  const value = sorted.length
    ? sorted
      .slice(0, 5)
      .map((relation) => relationLine(relation, hero, kind))
      .concat(sorted.length > 5 ? [`외 ${sorted.length - 5}명은 두 영웅 비교로 확인할 수 있어요.`] : [])
      .join("\n\n")
    : "아직 확인된 상성 정보가 없어요.";
  return { name, value: truncate(value) };
}

function withJosa(value, batchimJosa, noBatchimJosa) {
  const text = String(value);
  const last = text.at(-1);
  const codePoint = last?.codePointAt(0) ?? 0;
  const hangulBatchim = codePoint >= 0xac00 && codePoint <= 0xd7a3 && (codePoint - 0xac00) % 28 !== 0;
  const digitBatchim = /[013678]$/.test(text);
  return `${text}${hangulBatchim || digitBatchim ? batchimJosa : noBatchimJosa}`;
}

export function buildRelationOverviewEmbed(data) {
  return new EmbedBuilder()
    .setColor(0x4f8cff)
    .setTitle(`${data.hero_name} 상성 요약`)
    .setDescription("카운터부터 확인해 보세요. 맵과 조합에 따라 실제 상성은 달라질 수 있어요.")
    .addFields(
      relationField(`🚨 ${data.hero_name}의 카운터`, data.countered_by, data.hero, "counter"),
      relationField(`🎯 ${withJosa(data.hero_name, "이", "가")} 카운터하는 영웅`, data.counters, data.hero, "counter"),
      relationField(`🤝 ${withJosa(data.hero_name, "과", "와")} 잘 맞는 영웅`, data.synergies, data.hero, "synergy"),
      relationField("🔄 같은 역할의 대체·경쟁 영웅", data.competitions, data.hero, "competition"),
    )
    .setFooter({ text: `출처: 공식 기술 정보·CounterPickGG·Counterwatch 종합 · ${data.data_version} · ${data.last_reviewed_at}` });
}

function pairRelationField(relation) {
  const source = koreanName(relation.source_hero) ?? relation.source_hero;
  const target = koreanName(relation.target_hero) ?? relation.target_hero;
  if (relation.type === "counter") {
    const advantage = [
      `**${source} 우세 · ${overviewRelationLabel("counter", relation.strength)}**`,
      ...relation.reasons.map((reason) => `↳ ${reason.summary_ko}`),
    ].join("\n");
    const fields = [{ name: `⚔️ ${source} ➜ ${target}`, value: truncate(advantage) }];
    if (relation.caveats_ko) {
      fields.push({
        name: `🛡️ ${target} ➜ ${source} 대응 방법`,
        value: truncate(`↳ ${relation.caveats_ko}`),
      });
    }
    return fields;
  }

  const name = relation.type === "synergy"
    ? `🤝 ${source} ↔ ${target}`
    : `🔄 ${source} ↔ ${target} 역할 비교`;
  const details = [
    `**${overviewRelationLabel(relation.type, relation.strength)}**`,
    ...relation.reasons.map((reason) => `↳ ${reason.summary_ko}`),
    relation.caveats_ko ? `※ ${relation.caveats_ko}` : null,
  ].filter(Boolean).join("\n");
  return [{ name, value: truncate(details) }];
}

export function buildPairRelationEmbed(data) {
  const embed = new EmbedBuilder()
    .setColor(0x9b6cff)
    .setTitle(`${data.source.hero_name} vs ${data.target.hero_name} 상성`)
    .setDescription("누가 누구를 카운터하는지와 그 이유를 정리했어요. 맵과 조합에 따라 달라질 수 있습니다.")
    .setFooter({ text: `관계 데이터 ${data.data_version} · 최종 검수 ${data.last_reviewed_at}` });

  if (data.relations.length) {
    embed.addFields(data.relations.flatMap(pairRelationField));
    const sources = data.sources
      .map((source) => `[${source.name}](${source.url}) · ${source.checked_at}`)
      .join("\n");
    if (sources) embed.addFields({ name: "출처 및 확인일", value: truncate(sources) });
  } else {
    embed.addFields({ name: "상성 정보", value: "두 영웅 사이에서 확인된 직접적인 카운터나 궁합 정보가 아직 없어요." });
  }
  return embed;
}
