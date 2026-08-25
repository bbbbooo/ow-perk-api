const aliases = {
  ana: ["아나", "안나", "할머니"], anran: ["안란"], ashe: ["애쉬", "애시"],
  baptiste: ["바티스트", "바티"], bastion: ["바스티온", "바스티", "바스", "깡통"],
  brigitte: ["브리기테", "브리기", "브리"], cassidy: ["캐서디", "캐서", "맥크리", "맥"],
  dmon: ["디몬", "d.mon", "d mon"], dva: ["디바", "송하나", "d.va", "d va"],
  domina: ["도미나", "도미"], doomfist: ["둠피스트", "둠피", "둠"], echo: ["에코"],
  emre: ["엠레"], freja: ["프레야", "프레"], genji: ["겐지", "겐"], hanzo: ["한조"],
  hazard: ["해저드", "해저"], illari: ["일리아리", "일라리", "일라", "일리"],
  jetpack_cat: ["제트팩 캣", "제트팩캣", "제트팩", "제트캣", "젯캣", "고양이", "냥이"],
  junker_queen: ["정커퀸", "정커 퀸", "정커", "정퀸", "퀸"],
  junkrat: ["정크랫", "정크"], juno: ["주노"], kiriko: ["키리코", "키리"],
  lifeweaver: ["라이프위버", "라이프 위버", "라위", "위버"],
  lucio: ["루시우", "루시오", "루시", "개구리"], mauga: ["마우가", "마우"], mei: ["메이"],
  mercy: ["메르시", "메르", "멜시"], mizuki: ["미즈키", "미즈"], moira: ["모이라", "모이"],
  orisa: ["오리사", "오리"], pharah: ["파라"], ramattra: ["라마트라", "라마", "람"],
  reaper: ["리퍼"], reinhardt: ["라인하르트", "라인", "망치"],
  roadhog: ["로드호그", "로드 호그", "호그", "돼지"], shion: ["시온"], sierra: ["시에라"],
  sigma: ["시그마", "시그"], sojourn: ["소전", "소저언"],
  soldier_76: ["솔저76", "솔져76", "솔저 76", "솔져 76", "솔저", "솔져", "76", "김병장", "군인"],
  sombra: ["솜브라", "솜브", "솜"], symmetra: ["시메트라", "시메"],
  torbjorn: ["토르비욘", "토르비온", "토르", "토비"], tracer: ["트레이서", "트레"],
  vendetta: ["벤데타", "벤데"], venture: ["벤처"],
  widowmaker: ["위도우메이커", "위도우", "위도", "위메"],
  winston: ["윈스턴", "윈스", "원숭이", "고릴라", "윈붕이"],
  wrecking_ball: ["레킹볼", "레킹 볼", "레킹", "볼", "햄찌", "햄스터", "해먼드"],
  wuyang: ["우양"], zarya: ["자리야", "자랴"], zenyatta: ["젠야타", "젠", "야타"],
};

export const knownHeroSlugs = Object.freeze(Object.keys(aliases));

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

export function resolveKnownHero(input) {
  const needle = normalize(input);
  if (!needle) return null;

  for (const [hero, heroAliases] of Object.entries(aliases)) {
    if ([hero, ...heroAliases].some((candidate) => normalize(candidate) === needle)) {
      return { hero, hero_name: heroAliases[0] ?? hero };
    }
  }
  return null;
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
