const aliases = {
  ana: ["아나"], anran: ["안란"], ashe: ["애쉬"], baptiste: ["바티스트", "바티"],
  bastion: ["바스티온", "바스"], brigitte: ["브리기테", "브리"], cassidy: ["캐서디", "맥크리"],
  dmon: ["디몬", "d.mon", "d mon"], dva: ["디바", "d.va", "d va"], domina: ["도미나"],
  doomfist: ["둠피스트", "둠피"], echo: ["에코"], emre: ["엠레"], freja: ["프레야"],
  genji: ["겐지"], hanzo: ["한조"], hazard: ["해저드"], illari: ["일리아리"],
  jetpack_cat: ["제트팩 캣", "제트팩캣", "고양이"], junker_queen: ["정커퀸", "정커 퀸", "퀸"],
  junkrat: ["정크랫", "정크"], juno: ["주노"], kiriko: ["키리코", "키리"],
  lifeweaver: ["라이프위버", "라이프 위버", "라위"], lucio: ["루시우", "루시오"], mauga: ["마우가"],
  mei: ["메이"], mercy: ["메르시"], mizuki: ["미즈키"], moira: ["모이라"], orisa: ["오리사"],
  pharah: ["파라"], ramattra: ["라마트라", "라마"], reaper: ["리퍼"], reinhardt: ["라인하르트", "라인"],
  roadhog: ["로드호그", "호그"], shion: ["시온"], sierra: ["시에라"], sigma: ["시그마"],
  sojourn: ["소전", "소저언"], soldier_76: ["솔저76", "솔저 76", "솔저", "76"], sombra: ["솜브라"],
  symmetra: ["시메트라", "시메"], torbjorn: ["토르비욘", "토르"], tracer: ["트레이서", "트레"],
  vendetta: ["벤데타"], venture: ["벤처"], widowmaker: ["위도우메이커", "위도우"], winston: ["윈스턴"],
  wrecking_ball: ["레킹볼", "레킹 볼", "햄찌", "햄스터"], wuyang: ["우양"], zarya: ["자리야"],
  zenyatta: ["젠야타", "젠"],
};

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "");
}

export function resolveHero(input, heroes) {
  const needle = normalize(input);
  if (!needle) return null;

  return heroes.find((hero) => {
    const candidates = [hero.hero, hero.hero_name, ...(aliases[hero.hero] ?? [])];
    return candidates.some((candidate) => normalize(candidate) === needle);
  }) ?? null;
}

export function searchHeroes(input, heroes, limit = 25) {
  const needle = normalize(input);
  return heroes.filter((hero) => {
    const candidates = [hero.hero, hero.hero_name, ...(aliases[hero.hero] ?? [])];
    return !needle || candidates.some((candidate) => normalize(candidate).includes(needle));
  }).slice(0, limit);
}

export function koreanName(slug) {
  return aliases[slug]?.[0] ?? null;
}
