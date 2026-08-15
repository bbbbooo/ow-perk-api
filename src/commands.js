import { SlashCommandBuilder } from "discord.js";

export const perkCommand = new SlashCommandBuilder()
  .setName("특전")
  .setDescription("영웅별 특전 선택률을 확인합니다")
  .addStringOption((option) => option
    .setName("영웅")
    .setDescription("예: 아나, 디바, 겐지")
    .setRequired(true)
    .setAutocomplete(true))
  .addStringOption((option) => option
    .setName("모드")
    .setDescription("기본값은 모든 모드입니다")
    .addChoices(
      { name: "모든 모드", value: "all" },
      { name: "빠른 대전", value: "quickplay" },
      { name: "경쟁전", value: "competitive" },
    ));

export const commands = [perkCommand.toJSON()];
