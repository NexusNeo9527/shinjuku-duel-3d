export const TAU = Math.PI * 2;

export const ARENA = { half: 72 };

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
    damageTakenMultiplier: 0.9,
    knockbackTakenMultiplier: 0.88,
    speed: 1,
    aggro: 1,
    gojoRegen: false
  },
  shura: {
    label: "困难",
    enemyHp: 125,
    mahoraga: { hp: 100, speed: 7.4, life: 34, dmg: 1.3 },
    aimError: 0.07,
    aimMin: 0.03,
    aimMax: 0.24,
    forcedShotMs: 700,
    leadTime: 0.48,
    reactionMin: 0.34,
    reactionMax: 0.7,
    damageMultiplier: 1.25,
    damageTakenMultiplier: 0.9,
    knockbackTakenMultiplier: 0.7,
    speed: 1.12,
    aggro: 1.4,
    gojoRegen: true
  },
  abyss: {
    label: "地狱",
    enemyHp: 150,
    mahoraga: { hp: 140, speed: 8.4, life: 42, dmg: 1.6 },
    mahoragaStart: true,
    aimError: 0.03,
    aimMin: 0.03,
    aimMax: 0.24,
    forcedShotMs: 700,
    leadTime: 0.48,
    reactionMin: 0.22,
    reactionMax: 0.48,
    damageMultiplier: 1.5,
    damageTakenMultiplier: 0.72,
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
    enemyHp: 112,
    aimError: 0.12,
    aimMin: 0.1,
    aimMax: 0.32,
    forcedShotMs: 950,
    leadTime: 0.36,
    reactionMin: 0.48,
    reactionMax: 0.9,
    damageMultiplier: 1.08,
    damageTakenMultiplier: 0.98,
    speed: 1.06,
    aggro: 1.2
  },
  abyss: {
    enemyHp: 130,
    aimError: 0.09,
    aimMin: 0.09,
    aimMax: 0.32,
    forcedShotMs: 900,
    leadTime: 0.39,
    reactionMin: 0.34,
    reactionMax: 0.68,
    damageMultiplier: 1.28,
    damageTakenMultiplier: 0.88,
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
        damage: 4, tick: 0.45, radius: 80, closedBarrier: true, cooldown: 0, life: 5,
        color: "#7a5cff", core: "#d9ccff", needsDomain: true,
        desc: "封闭领域，收纳全场角色，持续压制与减速"
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
        damage: 5, tick: 0.4, radius: 16, cooldown: 0, life: 5,
        color: "#ff2f4d", core: "#ffd2d8", needsDomain: true,
        desc: "领域，无差别斩击"
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
    storyMove("authenticLove", "真赝相爱", "domain", { damage: 4, tick: 0.48, radius: 80, closedBarrier: true, life: 6, cooldown: 0, needsDomain: true }),
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

export const STORY_STAGES = {
  yuta: { label: "乙骨本体 · 真赝相爱", ally: "yuta", enemy: "sukunaStory1" },
  borrowed: { label: "五条之身 · 领域再战", ally: "yutaGojo", enemy: "sukunaStory2" }
};
export const COPY_TECHNIQUES = [
  storyMove("cursedSpeech", "咒言", "orb", { damage: 12, power: 1, speed: 32, radius: 1.0, life: 1.35, knock: 5, cooldown: 3, stun: 0.75 }),
  storyMove("skyBreak", "天空操术·薄冰破", "orb", { damage: 18, power: 2, speed: 29, radius: 1.0, life: 1.4, knock: 11, cooldown: 3 }),
  storyMove("jacobsLadder", "雅各布天梯", "beam", { damage: 27, power: 3, length: 42, width: 2.2, life: 0.55, knock: 8, cooldown: 4.5 })
];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

