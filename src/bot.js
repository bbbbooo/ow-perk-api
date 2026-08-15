import { Client, Events, GatewayIntentBits } from "discord.js";
import { buildPerkEmbed } from "./formatter.js";
import { resolveHero } from "./heroes.js";
import { parsePerkCommand } from "./message-command.js";
import { getHeroMetadata, getHeroPerks, getHeroes } from "./overlooker.js";

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
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    const command = parsePerkCommand(message.content);
    if (!command) return;
    try {
      if (command.error) await message.reply(command.error);
      else await handlePerkCommand(message, command);
    } catch (error) {
      console.error("[discord] message command error:", error);
      await message.reply("통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.").catch(() => {});
    }
  });
  client.once(Events.ClientReady, (readyClient) => console.log(`[discord] ${readyClient.user.tag} 로그인 완료`));
  await client.login(token);
  return client;
}
