import { REST, Routes } from "discord.js";
import { pathToFileURL } from "node:url";

export async function clearCommands() {
  const { DISCORD_TOKEN: token, CLIENT_ID: clientId, GUILD_ID: guildId } = process.env;
  if (!token || !clientId) return;

  const rest = new REST({ version: "10" }).setToken(token);
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);
  await rest.put(route, { body: [] });
  console.log(`[discord] 기존 슬래시 명령어 제거 완료 (${guildId ? "guild" : "global"})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  clearCommands().catch((error) => {
    console.error("[discord] 명령어 제거 실패:", error.message);
    process.exitCode = 1;
  });
}
