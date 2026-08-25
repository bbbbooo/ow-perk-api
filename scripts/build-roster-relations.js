import { mkdir, writeFile } from "node:fs/promises";

const checkedAt = "2026-08-25";
const dataVersion = "2026-08-25.2";
const defaultCaveat = "맵 구조, 양 팀 조합, 기술 재사용 대기시간과 숙련도에 따라 실제 영향은 달라질 수 있습니다.";
const specs = [
  ["anran", "wuyang", "synergy", 0.6, "안란의 근거리 화염 압박에 우양이 원거리 회복과 이동 지원을 더해 진입과 이탈을 돕습니다.", "inferno_rush", "rushing_torrent"],
  ["ashe", "mercy", "synergy", 0.65, "메르시의 공격력 증폭이 애쉬의 중장거리 정밀 사격과 다이너마이트 압박을 강화합니다.", "damage_boost", "viper_and_dynamite"],
  ["baptiste", "bastion", "synergy", 0.7, "불사 장치가 바스티온의 집중 화력 시간을 보호하고 증폭 매트릭스가 투사 화력을 강화합니다.", "immortality_field_and_amplification_matrix", "configuration_assault"],
  ["ana", "brigitte", "synergy", 0.65, "브리기테가 방벽과 밀쳐내기로 아나에게 접근하는 적을 견제해 장거리 지원 각도를 지켜줍니다.", "barrier_shield_and_whip_shot", "long_range_support"],
  ["ana", "cassidy", "synergy", 0.55, "수면총으로 멈춘 적은 캐서디가 정밀 사격으로 후속 피해를 넣기 쉬운 표적이 됩니다.", "sleep_dart", "precision_hitscan"],
  ["dmon", "dva", "competition", 0.75, "두 영웅 모두 MEKA 기체와 수평 기동기를 활용하는 탱커로 역할 고정 5대5의 한 탱커 슬롯을 두고 경쟁합니다.", "power_barrier_and_propulsors", "defense_matrix_and_boosters"],
  ["domina", "symmetra", "synergy", 0.6, "도미나의 방벽·밀쳐내기와 시메트라의 순간이동기·감시 포탑이 좁은 구역의 공간 통제를 겹쳐 만듭니다.", "barrier_array_and_sonic_repulsors", "teleporter_and_sentry_turret"],
  ["doomfist", "kiriko", "synergy", 0.65, "키리코는 순보로 둠피스트의 진입을 따라가고 정화의 방울로 진입 직후의 해로운 효과를 완화할 수 있습니다.", "swift_step_and_protection_suzu", "seismic_slam_and_rocket_punch"],
  ["echo", "mercy", "synergy", 0.65, "수호천사로 비행 중인 에코를 따라가며 회복과 공격력 증폭을 지속할 수 있습니다.", "guardian_angel_and_damage_boost", "flight"],
  ["emre", "freja", "synergy", 0.55, "엠레의 점사와 수류탄 압박에 프레야의 원거리 폭발 사격을 맞추면 같은 표적에 집중 피해를 줄 수 있습니다.", "synthetic_burst_rifle_and_cyber_frag", "take_aim"],
  ["ana", "genji", "synergy", 0.85, "나노 강화제가 용검을 사용하는 겐지의 공격력을 높이고 받는 피해를 줄여 진입 지속력을 강화합니다.", "nano_boost", "dragonblade"],
  ["hanzo", "zarya", "synergy", 0.8, "중력자탄으로 적을 한곳에 묶으면 용의 일격이 여러 대상을 지나가도록 연계할 수 있습니다.", "graviton_surge", "dragonstrike"],
  ["hazard", "lucio", "synergy", 0.6, "루시우의 속도 증폭이 해저드의 근거리 진입과 이탈을 보조해 난전 개시 속도를 높입니다.", "crossfade_speed", "violent_leap"],
  ["illari", "sigma", "synergy", 0.55, "시그마의 방벽과 원거리 견제가 일리아리의 태양석과 중거리 사격이 유지될 공간을 만듭니다.", "experimental_barrier", "healing_pylon_and_solar_rifle"],
  ["jetpack_cat", "pharah", "synergy", 0.7, "제트팩 캣은 비행과 생명줄로 공중 영웅을 운반·회복할 수 있어 파라의 공중 체류를 지원합니다.", "lifeline_and_frenetic_flight", "jump_jet"],
  ["kiriko", "junker_queen", "counter", 0.7, "정화의 방울이 상처로 인한 지속 피해와 치유 차단 같은 해로운 효과를 정화해 정커퀸의 압박을 줄입니다.", "protection_suzu", "wounds_and_rampage"],
  ["pharah", "junkrat", "counter", 0.65, "파라는 공중에서 공격해 지면을 따라 튀는 정크랫의 유탄과 덫이 닿기 어려운 각도를 만들 수 있습니다.", "jump_jet_and_hover_jets", "frag_launcher_and_steel_trap"],
  ["juno", "ramattra", "synergy", 0.6, "주노의 이동 가속과 궤도 광선이 라마트라가 네메시스 형태로 거리를 좁히고 버티는 것을 돕습니다.", "hyper_ring_and_orbital_ray", "nemesis_form"],
  ["lifeweaver", "reinhardt", "synergy", 0.65, "생명의 손아귀가 돌진으로 깊게 들어간 라인하르트를 안전한 위치로 회수할 수 있습니다.", "life_grip", "charge"],
  ["ana", "mauga", "counter", 0.8, "생체 수류탄의 치유 차단이 근거리에서 체력 회복에 의존하는 마우가의 버티는 시간을 제한합니다.", "biotic_grenade", "cardiac_overdrive"],
  ["mei", "reaper", "synergy", 0.6, "빙벽으로 적을 고립시키면 리퍼가 가까운 거리에서 산탄 피해를 집중하기 쉬워집니다.", "ice_wall", "hellfire_shotguns"],
  ["mizuki", "emre", "counter", 0.6, "미즈키의 결계 사당은 통과하는 적 투사체를 흡수해 엠레의 점사와 사이버 수류탄 압박을 줄입니다.", "kekkai_sanctuary", "synthetic_burst_rifle_and_cyber_frag"],
  ["doomfist", "moira", "synergy", 0.55, "모이라는 소멸로 둠피스트의 빠른 진입 경로를 따라가고 생체 구슬로 난전 지역을 지원할 수 있습니다.", "fade_and_biotic_orb", "seismic_slam"],
  ["orisa", "roadhog", "counter", 0.65, "오리사의 투창은 숨 돌리기를 방해할 수 있고 방어 강화는 갈고리와 강제 이동의 영향을 줄입니다.", "energy_javelin_and_fortify", "take_a_breather_and_chain_hook"],
  ["brigitte", "shion", "counter", 0.55, "브리기테의 방벽과 밀쳐내기는 짧은 거리에서 연속 진입하는 시온의 공격 흐름을 끊는 데 도움을 줍니다.", "barrier_shield_and_whip_shot", "evade_and_satsuriku_spree"],
  ["mercy", "sierra", "synergy", 0.55, "공격력 증폭이 추적 사격으로 표적을 고정한 시에라의 지속 화력을 높일 수 있습니다.", "damage_boost", "tracking_shot_and_helix_rifle"],
  ["mercy", "sojourn", "synergy", 0.6, "공격력 증폭이 소전의 기관포와 충전된 레일건의 집중 피해를 강화합니다.", "damage_boost", "railgun"],
  ["ana", "soldier_76", "synergy", 0.6, "나노 강화제가 전술 조준경 동안 솔저: 76의 공격력을 높이고 받는 피해를 줄입니다.", "nano_boost", "tactical_visor"],
  ["sombra", "wrecking_ball", "counter", 0.75, "해킹으로 구르기와 갈고리 기동을 제한하면 레킹볼이 진입 후 빠져나가기 어려워집니다.", "hack", "roll_and_grappling_claw"],
  ["tracer", "winston", "synergy", 0.7, "윈스턴의 점프 팩 진입에 트레이서가 점멸로 합류해 같은 후방 표적에 압박을 집중할 수 있습니다.", "jump_pack", "blink"],
  ["winston", "torbjorn", "counter", 0.55, "윈스턴의 전기 원뿔 공격은 포탑 주변의 여러 대상을 동시에 압박하며 방벽으로 포탑 사선을 나눌 수 있습니다.", "tesla_cannon_and_barrier_projector", "deploy_turret"],
  ["lucio", "vendetta", "synergy", 0.65, "속도 증폭이 근접 공격 중심인 벤데타가 거리를 좁혀 검 공격을 시작하도록 돕습니다.", "crossfade_speed", "palatine_fang"],
  ["juno", "venture", "synergy", 0.55, "주노의 이동 가속이 벤처의 잠복·돌진 진입 속도를 보완하고 궤도 광선이 근거리 교전을 지원합니다.", "hyper_ring_and_orbital_ray", "burrow_and_drill_dash"],
  ["winston", "widowmaker", "counter", 0.7, "점프 팩으로 저격 위치에 직접 접근하고 방벽을 놓아 위도우메이커의 원거리 사선을 끊을 수 있습니다.", "jump_pack_and_barrier_projector", "widows_kiss"],
  ["winston", "zenyatta", "synergy", 0.6, "부조화의 구슬이 붙은 표적에 윈스턴이 점프 팩으로 진입하면 팀의 집중 피해를 모으기 쉬워집니다.", "orb_of_discord", "jump_pack"],
];

const relations = specs.map(([sourceHero, targetHero, type, strength, summaryKo, sourceAbility, targetTrait]) => ({
  id: `${sourceHero}__${targetHero}__${type}`,
  source_hero: sourceHero,
  target_hero: targetHero,
  type,
  strength,
  confidence: 0.7,
  reasons: [{ kind: type === "competition" ? "role_slot" : (type === "synergy" ? "playstyle" : "mechanic"), source_ability: sourceAbility, target_trait: targetTrait, summary_ko: summaryKo }],
  contexts: { modes: ["competitive_5v5"], ranks: [], maps: [] },
  caveats_ko: defaultCaveat,
  evidence: [{ source: "blizzard_heroes", kind: "official_ability_catalog", checked_at: checkedAt }],
  status: "verified",
  valid_from_patch: null,
  valid_until_patch: null,
}));

const document = { schema_version: 1, data_version: dataVersion, last_reviewed_at: checkedAt, relations };
const output = new URL("../src/data/relations/roster-relations.json", import.meta.url);
await mkdir(new URL("../src/data/relations/", import.meta.url), { recursive: true });
await writeFile(output, `${JSON.stringify(document, null, 2)}\n`);
console.log(`[relations] 전 영웅 커버리지 관계 ${relations.length}개 생성`);
