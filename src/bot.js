import { Client, Events, GatewayIntentBits } from "discord.js";
import { buildPerkEmbed } from "./formatter.js";
import { resolveHero, searchHeroes, koreanName } from "./heroes.js";
import { getHeroMetadata, getHeroPerks, getHeroes } from "./overlooker.js";

async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused();
  const heroes = await getHeroes("all");
  const results = searchHeroes(focused, heroes).map((hero) => ({
    name: `${koreanName(hero.hero) ?? hero.hero_name} (${hero.hero_name})`,
    value: hero.hero,
  }));
  await interaction.respond(results);
}

async function handlePerkCommand(interaction) {
  const query = interaction.options.getString("영웅", true);
  const mode = interaction.options.getString("모드") ?? "all";
  await interaction.deferReply();

  const heroes = await getHeroes(mode);
  const hero = resolveHero(query, heroes);
  if (!hero) {
    await interaction.editReply("영웅을 찾지 못했습니다. 자동완성 목록에서 영웅을 선택해 주세요.");
    return;
  }

  const [data, metadata] = await Promise.all([
    getHeroPerks(hero.hero, mode),
    getHeroMetadata(hero.hero),
  ]);
  await interaction.editReply({ embeds: [buildPerkEmbed(data, mode, metadata)] });
}

export async function startBot(token) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isAutocomplete() && interaction.commandName === "특전") {
        await handleAutocomplete(interaction);
      } else if (interaction.isChatInputCommand() && interaction.commandName === "특전") {
        await handlePerkCommand(interaction);
      }
    } catch (error) {
      console.error("[discord] interaction error:", error);
      if (!interaction.isRepliable() || interaction.isAutocomplete()) return;
      const message = "통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      if (interaction.deferred || interaction.replied) await interaction.editReply(message).catch(() => {});
      else await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  });
  client.once(Events.ClientReady, (readyClient) => console.log(`[discord] ${readyClient.user.tag} 로그인 완료`));
  await client.login(token);
  return client;
}
