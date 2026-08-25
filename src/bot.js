import { Client, Events, GatewayIntentBits } from "discord.js";
import { buildPerkEmbed } from "./formatter.js";
import { resolveHero, resolveKnownHero } from "./heroes.js";
import { parseDirectPerkCommand, parsePerkCommand } from "./message-command.js";
import { getHeroMetadata, getHeroPerks, getHeroes } from "./overlooker.js";
import { parseRelationCommand } from "./relation-command.js";
import { buildPairRelationEmbed, buildRelationOverviewEmbed } from "./relation-formatter.js";
import {
  getHeroRelations,
  getPairRelations,
  resolveDirectRelationHeroPair,
  resolveRelationHero,
  resolveRelationHeroPair,
} from "./relations.js";

const DIRECT_COMMAND_COOLDOWN_MS = 3_000;

function getPerkChannelIds() {
  return new Set(
    String(process.env.PERK_CHANNEL_ID ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

async function handlePerkCommand(message, { heroQuery, mode }) {
  let hero = resolveKnownHero(heroQuery);
  if (!hero) {
    const heroes = await getHeroes(mode);
    hero = resolveHero(heroQuery, heroes);
  }
  if (!hero) {
    await message.reply("영웅을 찾지 못했습니다. 이름을 확인해 주세요. 예: `/특전 아나`");
    return;
  }

  const [data, metadata] = await Promise.all([
    getHeroPerks(hero.hero, mode),
    getHeroMetadata(hero.hero),
  ]);
  await message.reply({ embeds: [buildPerkEmbed(data, mode, metadata)] });
}

async function handleRelationCommand(message, command) {
  if (command.error) {
    await message.reply(command.error);
    return;
  }
  if (command.kind === "overview" || command.kind === "suffix") {
    const heroQuery = command.kind === "suffix" ? command.query : command.heroQuery;
    const directHero = resolveRelationHero(heroQuery);
    if (directHero) {
      const data = getHeroRelations(directHero.hero);
      await message.reply({ embeds: [buildRelationOverviewEmbed(data)] });
      return;
    }
    if (command.kind === "suffix") {
      const suffixPair = resolveRelationHeroPair(command.query);
      if (suffixPair) {
        const data = getPairRelations(suffixPair[0].hero, suffixPair[1].hero);
        await message.reply({ embeds: [buildPairRelationEmbed(data)] });
        return;
      }
    }
    const data = getHeroRelations(heroQuery);
    if (!data) {
      await message.reply("영웅을 찾지 못했습니다. 예: `아나 상성`");
      return;
    }
    await message.reply({ embeds: [buildRelationOverviewEmbed(data)] });
    return;
  }

  const pair = resolveRelationHeroPair(command.pairQuery);
  if (!pair) {
    await message.reply("두 영웅을 구분할 수 없습니다. 예: `/상성 아나 로드호그`");
    return;
  }
  const data = getPairRelations(pair[0].hero, pair[1].hero);
  await message.reply({ embeds: [buildPairRelationEmbed(data)] });
}

export async function startBot(token) {
  const perkChannelIds = getPerkChannelIds();
  const directCommandCooldowns = new Map();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    const relationCommand = parseRelationCommand(message.content);
    if (relationCommand) {
      try {
        await handleRelationCommand(message, relationCommand);
      } catch (error) {
        console.error("[discord] relation command error:", error);
        await message.reply("영웅 관계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.").catch(() => {});
      }
      return;
    }
    const isPerkChannel = perkChannelIds.has(message.channelId);
    const directPair = isPerkChannel ? resolveDirectRelationHeroPair(message.content) : null;
    if (directPair) {
      try {
        const data = getPairRelations(directPair[0].hero, directPair[1].hero);
        await message.reply({ embeds: [buildPairRelationEmbed(data)] });
      } catch (error) {
        console.error("[discord] direct relation command error:", error);
        await message.reply("두 영웅의 상성을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.").catch(() => {});
      }
      return;
    }
    const prefixedCommand = parsePerkCommand(message.content);
    const command = prefixedCommand ?? (isPerkChannel ? parseDirectPerkCommand(message.content) : null);
    if (!command) return;

    if (!prefixedCommand) {
      const cooldownKey = `${message.guildId ?? "dm"}:${message.author.id}`;
      const now = Date.now();
      if ((directCommandCooldowns.get(cooldownKey) ?? 0) > now) return;
      directCommandCooldowns.set(cooldownKey, now + DIRECT_COMMAND_COOLDOWN_MS);
    }

    try {
      if (command.error) await message.reply(command.error);
      else await handlePerkCommand(message, command);
    } catch (error) {
      console.error("[discord] message command error:", error);
      await message.reply("통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.").catch(() => {});
    }
  });
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`[discord] ${readyClient.user.tag} 로그인 완료`);
    if (perkChannelIds.size) {
      console.log(`[discord] 특전 전용 채널 ${[...perkChannelIds].join(", ")} 활성화`);
    } else {
      console.warn("[discord] PERK_CHANNEL_ID가 없어 영웅명 직접 입력 기능을 비활성화합니다.");
    }
  });
  await client.login(token);
  return client;
}
