import { startBot } from "./bot.js";
import { clearCommands } from "./clear-commands.js";
import { startServer } from "./server.js";

startServer();

if (process.env.DISCORD_TOKEN) {
  try {
    await clearCommands();
    await startBot(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error("[discord] 시작 실패:", error);
    process.exitCode = 1;
  }
} else {
  console.warn("[discord] DISCORD_TOKEN이 없어 API 서버만 실행합니다.");
}
