import { REST, Routes } from "discord.js";
import { pathToFileURL } from "node:url";
import { commands } from "./commands.js";

export async function registerCommands() {
  const { DISCORD_TOKEN: token, CLIENT_ID: clientId, GUILD_ID: guildId } = process.env;
  if (!token || !clientId) throw new Error("DISCORD_TOKEN과 CLIENT_ID가 필요합니다.");

  const rest = new REST({ version: "10" }).setToken(token);
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);
  await rest.put(route, { body: commands });
  console.log(`[discord] /특전 명령어 등록 완료 (${guildId ? "guild" : "global"})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  registerCommands().catch((error) => {
    console.error("[discord] 명령어 등록 실패:", error.message);
    process.exitCode = 1;
  });
}
