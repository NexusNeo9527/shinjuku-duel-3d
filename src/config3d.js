export const TAU = Math.PI * 2;

export const ARENA = { half: 46 };

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
    label: "轻松",
    enemyHp: 85,
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
    label: "标准",
    enemyHp: 100,
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
    label: "修罗",
    enemyHp: 125,
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
    label: "无间",
    enemyHp: 150,
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

export const BLACK_FLASH = { chance: 0.18, multiplier: 1.55, range: 6.5 };
export const GOJO_REGEN_PER_SECOND = 0.5;

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
        damage: 4, tick: 0.45, radius: 17, cooldown: 0, life: 5,
        color: "#7a5cff", core: "#d9ccff", needsDomain: true,
        desc: "领域，持续压制与减速"
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

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

