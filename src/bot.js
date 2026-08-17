import { Client, Events, GatewayIntentBits } from "discord.js";
import { buildPerkEmbed } from "./formatter.js";
import { resolveHero } from "./heroes.js";
import { parseDirectPerkCommand, parsePerkCommand } from "./message-command.js";
import { getHeroMetadata, getHeroPerks, getHeroes } from "./overlooker.js";

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
  const heroes = await getHeroes(mode);
  const hero = resolveHero(heroQuery, heroes);
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

export async function startBot(token) {
  const perkChannelIds = getPerkChannelIds();
  const directCommandCooldowns = new Map();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    const prefixedCommand = parsePerkCommand(message.content);
    const isPerkChannel = perkChannelIds.has(message.channelId);
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
