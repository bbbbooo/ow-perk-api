import { readFileSync } from "node:fs";

const localization = JSON.parse(
  readFileSync(new URL("./data/perk-names.ko.json", import.meta.url), "utf8"),
);

export function koreanPerkName(heroSlug, perk) {
  return localization.heroes[heroSlug]?.[perk.slug] ?? perk.name;
}

export function localizePerkData(data) {
  return {
    ...data,
    perks: data.perks.map((perk) => ({
      ...perk,
      name: koreanPerkName(data.hero, perk),
      name_en: perk.name,
    })),
  };
}

export function localizationSource() {
  return localization.source;
}
