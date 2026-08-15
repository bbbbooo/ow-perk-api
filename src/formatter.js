import { EmbedBuilder } from "discord.js";
import { MODE_CONFIG, OW_DATA_BASE_URL, REGION_NOTICE, SOURCE_URL } from "./constants.js";
import { koreanName } from "./heroes.js";
import { koreanPerkName } from "./localization.js";

export function percent(rate) {
  return `${(Number(rate) * 100).toFixed(1)}%`;
}

export function tierLines(perks, tier, heroSlug = "") {
  const tierPerks = perks.filter((perk) => perk.tier === tier).sort((a, b) => b.pick_rate - a.pick_rate);
  if (!tierPerks.length) return "집계된 선택 기록이 없습니다.";
  return tierPerks.map((perk, index) => `${index === 0 ? "🏆" : "▫️"} **${koreanPerkName(heroSlug, perk)}** — ${percent(perk.pick_rate)} (${perk.picks.toLocaleString("ko-KR")}회)`).join("\n");
}

export function buildPerkEmbed(data, mode, metadata = null) {
  const displayName = koreanName(data.hero) ?? data.hero_name;
  const sampleWarning = data.sample_size < 100 ? "\n⚠️ 표본이 100게임 미만이므로 결과를 참고용으로만 봐주세요." : "";
  const embed = new EmbedBuilder()
    .setColor(metadata?.color ?? 0xf06414)
    .setTitle(`${displayName} (${data.hero_name}) 특전 선택률`)
    .setDescription(`**${MODE_CONFIG[mode].label}** · 표본 ${data.sample_size.toLocaleString("ko-KR")}게임${sampleWarning}`)
    .addFields(
      { name: "소형 특전", value: tierLines(data.perks, "minor", data.hero) },
      { name: "주요 특전", value: tierLines(data.perks, "major", data.hero) },
      { name: "안내", value: REGION_NOTICE },
    )
    .setFooter({ text: "통계: Overlooker · 특전명: Blizzard Entertainment · 선택률은 승률이나 정답을 뜻하지 않습니다." })
    .setURL(`${SOURCE_URL}/perks`)
    .setTimestamp();

  if (metadata?.portrait) embed.setThumbnail(`${OW_DATA_BASE_URL}/${metadata.portrait}`);
  return embed;
}
