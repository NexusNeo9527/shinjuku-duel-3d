import { extendPeriodSkills, extendCopies } from './periodSkills.js';
import { SHIBUYA_CHARACTERS, SHIBUYA_STAGES } from "./shibuyaConfig.js";
import { RAID_CHARACTERS, RAID_STAGES } from './shinjukuRaidConfig.js';
export const TAU = Math.PI * 2;

// Real-world distances use one scene unit per metre; domain interiors are expanded spaces.
export const ARENA = { half: 72, metersPerUnit: 1 };

export const FLIGHT = { speed: 9.4, maxAlt: 30, radius: 0.6 };
export const SPRINT = { multiplier: 1.8 };

export const COLORS = {
  gojo: "#44d9ff",
  gojoDeep: "#266fff",
  sukuna: "#ff4e64",
  sukunaDeep: "#9a1732",
  purple: "#b05cff",
  flame: "#ffb23f",
  white: "#f5f8ff"
};

export const DIFFICULTY = {
  easy: {
    label: "简单",
    enemyHp: 85,
    mahoraga: { hp: 55, speed: 5.8, life: 20, dmg: 0.75 },
    aimError: 0.32,
    aimMin: 0.5,
    aimMax: 0.76,
    forcedShotMs: 2200,
    leadTime: 0.05,
    reactionMin: 1.1,
    reactionMax: 2.0,
    damageMultiplier: 0.8,
    damageTakenMultiplier: 1,
    knockbackTakenMultiplier: 1,
    speed: 0.82,
    aggro: 0.6,
    gojoRegen: false
  },
  normal: {
    label: "普通",
    enemyHp: 100,
    mahoraga: { hp: 72, speed: 6.6, life: 26, dmg: 1 },
    aimError: 0.16,
    aimMin: 0.25,
    aimMax: 0.55,
    forcedShotMs: 1450,
    leadTime: 0.22,
    reactionMin: 0.62,
    reactionMax: 1.25,
    damageMultiplier: 1,
    damageTakenMultiplier: 1,
    knockbackTakenMultiplier: 0.88,
    speed: 1,
    aggro: 1,
    gojoRegen: false
  },
  shura: {
    label: "困难",
    enemyHp: 115,
    mahoraga: { hp: 100, speed: 7.4, life: 34, dmg: 1.3 },
    aimError: 0.07,
    aimMin: 0.03,
    aimMax: 0.24,
    forcedShotMs: 700,
    leadTime: 0.48,
    reactionMin: 0.34,
    reactionMax: 0.7,
    damageMultiplier: 1.1,
    damageTakenMultiplier: 1,
    knockbackTakenMultiplier: 0.7,
    speed: 1.12,
    aggro: 1.4,
    gojoRegen: true
  },
  abyss: {
    label: "地狱",
    enemyHp: 130,
    mahoraga: { hp: 140, speed: 8.4, life: 42, dmg: 1.6 },
    mahoragaStart: true,
    aimError: 0.03,
    aimMin: 0.03,
    aimMax: 0.24,
    forcedShotMs: 700,
    leadTime: 0.48,
    reactionMin: 0.22,
    reactionMax: 0.48,
    damageMultiplier: 1.2,
    damageTakenMultiplier: 1,
    knockbackTakenMultiplier: 0.7,
    speed: 1.22,
    aggro: 1.8,
    gojoRegen: true
  }
};

// 乙骨剧情由玩家操控乙骨时，单独放缓困难与地狱的宿傩强度。
// 普通单人对战及剧情反向操作（玩家操控宿傩）继续使用通用难度。
export const YUTA_STORY_DIFFICULTY_OVERRIDES = {
  shura: {
    enemyHp: 110,
    aimError: 0.12,
    aimMin: 0.1,
    aimMax: 0.32,
    forcedShotMs: 950,
    leadTime: 0.36,
    reactionMin: 0.48,
    reactionMax: 0.9,
    damageMultiplier: 1.08,
    damageTakenMultiplier: 1,
    speed: 1.06,
    aggro: 1.2
  },
  abyss: {
    enemyHp: 120,
    aimError: 0.09,
    aimMin: 0.09,
    aimMax: 0.32,
    forcedShotMs: 900,
    leadTime: 0.39,
    reactionMin: 0.34,
    reactionMax: 0.68,
    damageMultiplier: 1.15,
    damageTakenMultiplier: 1,
    speed: 1.14,
    aggro: 1.5
  }
};

export const BLACK_FLASH = { chance: 0.18, multiplier: 1.55, range: 6.5 };
export const GOJO_REGEN_PER_SECOND = 0.5;
export const PLAYER_HP_SETTINGS = Object.freeze({ default: 100, min: 25, max: 500, step: 25 });

// 单人模式选择宿傩时，电脑五条悟保留原有招式节奏，但稍降耐久和输出。
// 这只影响 AI，不会削弱玩家操控的五条悟或双人模式。
export const SUKUNA_VS_GOJO_AI_HANDICAP = {
  hp: 0.9,
  damage: 0.9,
  // 宿傩 AI 的普攻有明显攻击间隙；五条悟按难度缩放，同步收紧奥义与领域频率。
  aiTuning: {
    easy: { blueCastDelayMultiplier: 1.9, blueForcedShotDelayMultiplier: 1.9, aiCooldowns: { purple: 14, void: 24 } },
    normal: { blueCastDelayMultiplier: 1.5, blueForcedShotDelayMultiplier: 1.5, aiCooldowns: { purple: 10, void: 18 } },
    shura: { blueCastDelayMultiplier: 1.25, blueForcedShotDelayMultiplier: 1.25, aiCooldowns: { purple: 8, void: 14 } },
    abyss: {
      blueCastDelayMultiplier: 1.1,
      blueForcedShotDelayMultiplier: 1.1,
      aiCooldowns: { purple: 4, void: 7 },
      hpMultiplier: 1.1,
      damageMultiplier: 1.1
    }
  }
};

// Confirmed periods: Gojo (ch. 226), pre-injury Shibuya Todo (ch. 130),
// and Shinjuku Yuji after replacement training (ch. 258).
// Durations and durability are game tuning; unconfirmed users are excluded.
export const SIMPLE_DOMAIN = Object.freeze({
  characters: ["gojo", "yujiRaid", "todoShibuya"], duration: 5, cooldown: 16,
  radius: 3, integrity: 32, color: "#bdeeff"
});

export const CHARACTERS = {
  gojo: {
    id: "gojo",
    name: "五条悟",
    color: "#44d9ff",
    aura: 0x44d9ff,
    height: 1.85,
    speed: 7.4,
    hp: 100,
    dash: { speed: 27, duration: 0.2, cooldown: 1.1, invuln: 0.32 },
    combos: [
      { seq: ["blue", "blue", "blue"], name: "苍 · 三连", damage: 1.35 },
      { seq: ["blue", "red"], name: "顺转 · 反转", damage: 1.6, extra: 2 },
      { seq: ["red", "purple"], name: "赫 · 虚式", damage: 1.5 }
    ],
    abilities: [
      {
        id: "blue", label: "苍", type: "orb", shape: "orb",
        damage: 10, power: 1, speed: 32, radius: 0.55, cooldown: 0.5, life: 1.6,
        color: "#44d9ff", core: "#e9fbff", knock: 4, chargeGain: 7,
        desc: "术式顺转，快速弹幕"
      },
      {
        id: "red", label: "赫", type: "orb", shape: "orb",
        damage: 18, power: 2, speed: 26, radius: 0.9, cooldown: 2.3, life: 1.8,
        color: "#ff536d", core: "#fff0e7", knock: 10, chargeGain: 13,
        desc: "术式反转，高伤冲击"
      },
      {
        id: "purple", label: "茈", type: "beam", shape: "beam",
        damage: 34, power: 3, length: 46, width: 1.9, cooldown: 0, life: 0.5,
        color: "#b05cff", core: "#ffffff", knock: 22, needsCharge: true,
        desc: "虚式，贯穿光柱"
      },
      {
        id: "void", label: "无量空处", type: "domain", shape: "domain",
        damage: 4, tick: 0.45, radius: 80, exteriorRadius: 12, closedBarrier: true, cooldown: 0, life: 5,
        color: "#7a5cff", core: "#d9ccff", needsDomain: true,
        desc: "信息无限涌入，使必中目标无法行动；接触施术者、反领域手段和领域对抗可抵消效果"
      }
    ]
  },
  sukuna: {
    id: "sukuna",
    name: "宿傩",
    color: "#ff4e64",
    aura: 0xff4e64,
    height: 1.9,
    speed: 6.7,
    hp: 100,
    dash: { speed: 25, duration: 0.2, cooldown: 1.1, invuln: 0.32 },
    combos: [
      { seq: ["slash", "slash"], name: "解 · 二段", damage: 1.3 },
      { seq: ["slash", "cleave"], name: "解 · 捌", damage: 1.55, extra: 2 },
      { seq: ["cleave", "flame"], name: "捌 · 开", damage: 1.5 }
    ],
    abilities: [
      {
        id: "slash", label: "解", type: "orb", shape: "blade",
        damage: 10, power: 1, speed: 34, radius: 0.5, cooldown: 0.45, life: 1.4,
        color: "#ff4e64", core: "#ffe9ed", knock: 4, chargeGain: 7,
        desc: "斩击，高速飞斩"
      },
      {
        id: "cleave", label: "捌", type: "orb", shape: "blade",
        damage: 9, power: 2, speed: 30, radius: 0.5, cooldown: 1.9, life: 1.4,
        color: "#f7f2ff", core: "#ffffff", knock: 4, chargeGain: 12,
        count: 2, spread: 0.3,
        desc: "斩击，双道交叉"
      },
      {
        id: "flame", label: "开", type: "beam", shape: "beam",
        damage: 34, power: 3, length: 44, width: 2.0, cooldown: 0, life: 0.5,
        color: "#ffb23f", core: "#fff6d2", knock: 22, needsCharge: true,
        desc: "火焰，贯穿光柱"
      },
      {
        id: "shrine", label: "伏魔御厨子", type: "domain", shape: "domain",
        damage: 5, tick: 0.4, radius: 200, canonMaxRadius: 200, closedBarrier: false, openBarrier: true,
        barrierDamagePerSecond: 14, maintenanceDamageRatio: 0.3, cooldown: 0, life: 5,
        color: "#ff2f4d", core: "#ffd2d8", needsDomain: true,
        desc: "开放式领域，不封锁逃路；捌斩有咒力目标、解斩无咒力目标。通常以最大半径约200米展开，覆盖当前小战场；领域对抗时可主动缩小范围，外侧斩击破坏封闭结界"
      },
      {
        id: "mahoraga", label: "魔虚罗", type: "summon", shape: "summon",
        cooldown: 30, color: "#e4c866", core: "#fff9d7",
        hp: 72, life: 26, speed: 6.6,
        desc: "召唤魔虚罗协同作战"
      }
    ]
  }
};

// Story fighters have their own move lists. Keeping separate IDs prevents the
// original duel's AI tuning and Mahoraga loadout from leaking into the story.
const storyMove = (id, label, type, extra = {}) => ({
  id, label, type, shape: type === "beam" ? "beam" : "blade",
  color: "#d9c8ff", core: "#fffaff", cooldown: 1.2, ...extra
});
CHARACTERS.yuta = {
  id: "yuta", name: "乙骨忧太", color: "#c7b8ff", aura: 0xc7b8ff,
  height: 1.8, speed: 7.1, hp: 100,
  dash: { speed: 26, duration: 0.2, cooldown: 1.1, invuln: 0.32 },
  combos: [],
  abilities: [
    storyMove("katana", "咒力刀", "melee", { damage: 9, range: 3.2, cooldown: 0.55, physical: true }),
    storyMove("rika", "里香", "summon", { cooldown: 24, hp: 65, life: 20 }),
    storyMove("copy", "复制术式", "copy", { cooldown: 2.8 }),
    storyMove("authenticLove", "真赝相爱", "domain", { damage: 4, tick: 0.48, radius: 80, closedBarrier: true, life: 6, cooldown: 0, needsDomain: true, desc: "以雅各布天梯为必中；刀中随机储存其他复制术式，使用后消失" }),
    storyMove("yutaHeal", "反转术式", "heal", { cooldown: 16, needsCharge: true, heal: 16 })
  ]
};
CHARACTERS.yutaGojo = {
  ...CHARACTERS.gojo, id: "yutaGojo", name: "乙骨·五条之身", color: "#85cfff", aura: 0x85cfff,
  abilities: [
    ...CHARACTERS.gojo.abilities.map((ab) => ({ ...ab })),
    storyMove("borrowedHeal", "反转术式", "heal", { cooldown: 16, needsCharge: true, heal: 15 })
  ]
};
const storySukuna = (id, domain) => ({
  ...CHARACTERS.sukuna, id, name: "宿傩", combos: [],
  abilities: [
    storyMove("slash", "解 · 近身斩", "melee", { damage: 11, range: 3.4, cooldown: 0.65, physical: true, chargeGain: 7, color: "#ff4e64", core: "#ffe9ed" }),
    storyMove("cleave", "捌 · 近身斩", "melee", { damage: 15, range: 3.7, cooldown: 1.15, physical: true, chargeGain: 12, color: "#f7f2ff", core: "#ffffff" }),
    storyMove("cleaveRush", "捌 · 连续斩击", "melee", { damage: 26, range: 4.1, power: 3, cooldown: 0, needsCharge: true, physical: true, knock: 12, color: "#ff7583", core: "#fff4f4" }),
    domain ? { ...CHARACTERS.sukuna.abilities[3] } : storyMove("wickerBasket", "彌虚葛籠", "guard", { cooldown: 12 }),
    storyMove("sukunaHeal", "反转术式", "heal", { cooldown: 18, needsCharge: true, heal: 13, color: "#ff7583" })
  ]
});
CHARACTERS.sukunaStory1 = storySukuna("sukunaStory1", false);
CHARACTERS.sukunaStory2 = storySukuna("sukunaStory2", true);

// Standalone loadout independent of the chapter's scripted support.
CHARACTERS.yutaGojoFree = {
  ...CHARACTERS.yutaGojo, id: "yutaGojoFree", assetId: "yutaGojo",
  abilities: CHARACTERS.yutaGojo.abilities.map((ability) => ({ ...ability }))
};
export const FREE_BATTLE_CHARACTERS = ["gojo", "sukuna", "yuta", "yutaGojoFree", "gojoTeen", "gojoAwakened", "toji", "tojiRematch", "yujiShibuya", "mahito", "mahitoFinal", "higuruma", "higurumaCulling", "todoShibuya", "todoInjured", "yujiCulling", "yujiRaid", "kashimo", "sukunaRaid"];

// Chapters 262–263: amplification and body blows contest a channeled Purple.
// Timing, stamina and arena dimensions below are gameplay adaptations.
export const BORROWED_BATTLE = Object.freeze({
  duration: 90, easyDuration: 110, radius: 16, maxAltitude: 6,
  purpleWindup: 2.2, blueWindup: 0.3, amplificationDrain: 22,
  amplificationRegen: 18
});
CHARACTERS.yutaGojo.combos = [];
CHARACTERS.yutaGojo.abilities = [
  { ...CHARACTERS.gojo.abilities[0], damage: 8, cooldown: 1.8, knock: -3, windup: BORROWED_BATTLE.blueWindup,
    desc: "短暂准备后释放苍，牵引并积累施法资源" },
  storyMove("bodyJab", "体术", "melee", { damage: 6, range: 3.2, cooldown: 0.65, physical: true }),
  { ...CHARACTERS.gojo.abilities[2], cooldown: 3, windup: BORROWED_BATTLE.purpleWindup,
    desc: "站定准备2.2秒；近身命中可打断，对敌人造成伤害" },
  storyMove("recorder", "狗卷录音", "support", { cooldown: 0, desc: "一次录音支援，短暂定住对手并创造施法机会" }),
  storyMove("bodyGuard", "体术防守", "guard", { cooldown: 6, physical: true, desc: "短暂减轻体术伤害，施法期间不可使用" })
];
CHARACTERS.sukunaStory2.abilities = [
  storyMove("bodyJab", "体术 · 连拳", "melee", { damage: 6, range: 3, cooldown: 0.65, physical: true, color: "#ff7583" }),
  storyMove("bodyHeavy", "体术 · 肘击", "melee", { damage: 10, range: 3.2, cooldown: 1.4, physical: true, color: "#ff7583" }),
  storyMove("bodyRush", "体术 · 追击", "melee", { damage: 10, range: 3.2, cooldown: 4, windup: 0.35, physical: true, color: "#ff7583", desc: "向当前方向追击，落空后有恢复动作" }),
  storyMove("amplification", "领域展延", "amplification", { cooldown: 0, physical: true, desc: "按键切换；消耗展延资源，突破无下限并减轻苍" }),
  storyMove("bodyGuard", "体术防守", "guard", { cooldown: 6, physical: true, color: "#ff7583" })
];

// Hidden Inventory (manga 70–75): separate IDs keep adult Gojo's domain,
// Simple Domain and regeneration out of his student-era loadouts.
CHARACTERS.gojoTeen = {
  ...CHARACTERS.gojo, id: "gojoTeen", name: "五条悟·高专", combos: [], grounded: true,
  abilities: [
    storyMove("blue", "苍", "attraction", { damage: 12, range: 28, radius: 7, cooldown: 2.4, color: "#44d9ff", desc: "术式顺转·苍，以吸引中心牵引近处目标" }),
    storyMove("blueMax", "最大输出苍", "attraction", { damage: 23, range: 28, radius: 12, cooldown: 8, color: "#44d9ff" }),
    storyMove("infinity", "无下限", "infinity", { cooldown: 6, life: 3, color: "#bdeeff", desc: "阻止普通近身攻击；天逆鉾接触可解除" })
  ]
};
CHARACTERS.gojoAwakened = {
  ...CHARACTERS.gojo, id: "gojoAwakened", name: "五条悟·觉醒", combos: [],
  abilities: [
    { ...CHARACTERS.gojoTeen.abilities[0] },
    { ...CHARACTERS.gojo.abilities[1], label: "赫" },
    { ...CHARACTERS.gojo.abilities[2], label: "茈", damage: 180 },
    storyMove("awakenedHeal", "反转术式", "heal", { cooldown: 16, heal: 18, color: "#bdeeff" }),
    { ...CHARACTERS.gojoTeen.abilities[2] }
  ]
};
CHARACTERS.toji = {
  id: "toji", name: "伏黑甚尔", color: "#b6caac", aura: 0xb6caac,
  height: 1.88, hp: 100, speed: 9.5, grounded: true, cursedEnergy: 0, combos: [],
  dash: { speed: 34, duration: 0.18, cooldown: 0.85, invuln: 0.2 },
  abilities: [
    storyMove("tojiBlade", "刀刃突袭", "melee", { damage: 10, range: 3.3, cooldown: 0.7, physical: true, color: "#d8dce3" }),
    storyMove("invertedSpear", "天逆鉾", "melee", { damage: 18, range: 3.8, cooldown: 1.6, physical: true, nullifiesInfinity: true, color: "#c4c9d4" }),
    storyMove("flyheads", "蝇头掩护", "flyheads", { cooldown: 12, physical: true, color: "#827c99" })
  ]
};
CHARACTERS.tojiRematch = {
  ...CHARACTERS.toji, id: "tojiRematch",
  abilities: [
    { ...CHARACTERS.toji.abilities[0] }, { ...CHARACTERS.toji.abilities[1] },
    storyMove("chainSpear", "万里锁·天逆鉾", "chain", { damage: 22, range: 20, cooldown: 4, physical: true, nullifiesInfinity: true, color: "#c4c9d4" })
  ]
};

Object.assign(CHARACTERS, SHIBUYA_CHARACTERS, RAID_CHARACTERS);
extendPeriodSkills(CHARACTERS);
// Period-specific traits; awareness survives Sukuna leaving Yuji's body.
for (const id of ['yujiShibuya', 'yujiCulling', 'yujiRaid']) {
  CHARACTERS[id].soulAware = true;
  CHARACTERS[id].sukunaVessel = id !== 'yujiRaid';
}
const techniqueContact = new Set(['slash', 'cleave', 'cleaveRush', 'gavel', 'gavelExtend', 'gavelHeavy', 'executionerSword', 'cullingExecution', 'soulTouch', 'soulBlade', 'todoSupport']);
const fistAttacks = new Set(['bodyJab', 'bodyHeavy', 'bodyRush', 'yujiPunch', 'divergentFist', 'yujiBlackFlash', 'yujiBodyPunch', 'yujiBodyHeavy', 'yujiSoulPunch', 'kashimoPunch', 'soulHeavy', 'soulRush']);
for (const character of Object.values(CHARACTERS)) for (const ability of character.abilities) {
  ability.requiresTechnique ??= techniqueContact.has(ability.id) || (!ability.physical && !['heal', 'guard', 'appeal', 'amplification', 'discharge'].includes(ability.type));
  if (ability.id === 'mahitoGuard' && !ability.physical) ability.requiresTechnique = true;
  ability.canBlackFlash ??= fistAttacks.has(ability.id);
}
export const STORY_STAGES = {
  opening: { label: "新宿 · 五条悟 VS 宿傩", ally: "gojo", enemy: "sukuna", next: "kashimoDuel", canon: true,
    intro: "新宿战场，五条悟与宿傩展开对决。使用苍、赫、茈与无量空处，迎战斩击、伏魔御厨子和魔虚罗。",
    objective: "击败对手即可通关；本关沿用经典对战技能与数值，胜负由实际战斗决定。" },
  ...RAID_STAGES,
  ...SHIBUYA_STAGES,
  hiddenInventory: { label: "怀玉 · 高专初战", ally: "gojoTeen", enemy: "toji", next: "hiddenInventoryRematch", canon: true,
    intro: "星浆体护送后，五条疲惫地解除术式，遭甚尔背后刺伤。夏油带理子进入薨星宫，五条留下迎战。",
    objective: "使用高专时期的苍与无下限，击败甚尔即可通关；提防蝇头与天逆鉾。" },
  hiddenInventoryRematch: { label: "怀玉 · 觉醒再战", ally: "gojoAwakened", enemy: "tojiRematch", canon: true,
    intro: "理子遇害、夏油败北后，甚尔完成委托。五条在濒死中领悟反转术式，来到盘星教所在地再战。",
    objective: "使用觉醒后的苍、赫、茈与反转术式，击败甚尔即可通关。" },
  yuta: { label: "乙骨本体 · 真赝相爱", ally: "yuta", enemy: "sukunaStory1", next: "borrowed", objective: "使用咒力刀、里香与复制术式，击败宿傩即可通关。" },
  borrowed: { label: "五条之身 · 领域再战", ally: "yutaGojo", enemy: "sukunaStory2", objective: "使用体术、苍与茈，击败对手即可通关；领域交锋结束后继续战斗。" }
};
export const COPY_TECHNIQUES = [
  storyMove("cursedSpeech", "咒言", "orb", { damage: 12, power: 1, speed: 32, radius: 1.0, life: 1.35, knock: 5, cooldown: 3, stun: 0.75 }),
  storyMove("skyBreak", "天空操术·薄冰破", "orb", { damage: 18, power: 2, speed: 29, radius: 1.0, life: 1.4, knock: 11, cooldown: 3 }),
  storyMove("jacobsLadder", "雅各布天梯", "beam", { damage: 27, power: 3, length: 42, width: 2.2, life: 0.55, knock: 8, cooldown: 4.5 })
];

extendCopies(COPY_TECHNIQUES);

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
