export const TAU = Math.PI * 2;

export const HIGH_DIFFICULTY_GOJO_REGEN_PER_SECOND = 0.5;
export const BLACK_FLASH_CHANCE = 0.18;
export const BLACK_FLASH_DAMAGE_MULTIPLIER = 1.55;

export const COLORS = {
  gojo: "#44d9ff",
  gojoDeep: "#266fff",
  sukuna: "#ff4e64",
  sukunaDeep: "#9a1732",
  purple: "#b05cff",
  flame: "#ffb23f",
  white: "#f5f8ff",
  mahoraga: "#e4c866"
};

export const DIFFICULTY_PROFILES = {
  easy: {
    label: "简单", badge: "难度 · 简单",
    aimMin: 0.5, aimMax: 0.76, forcedShotMs: 2200, reactionMin: 700, reactionMax: 1100,
    startDelay: 850, damageMultiplier: 0.86, damageTakenMultiplier: 1, knockbackTakenMultiplier: 1,
    projectileSpeed: 1, leadTime: 0.05, domainGain: 0.92, domainTick: 0.68,
    mahoraga: false, mahoragaStart: false, gojoRegen: false
  },
  normal: {
    label: "普通", badge: "难度 · 普通",
    aimMin: 0.25, aimMax: 0.55, forcedShotMs: 1450, reactionMin: 430, reactionMax: 760,
    startDelay: 450, damageMultiplier: 1.1, damageTakenMultiplier: 0.9, knockbackTakenMultiplier: 0.88,
    projectileSpeed: 1.06, leadTime: 0.22, domainGain: 1.15, domainTick: 0.54,
    mahoraga: false, mahoragaStart: false, gojoRegen: false
  },
  shura: {
    label: "困难", badge: "难度 · 困难",
    aimMin: 0.03, aimMax: 0.24, forcedShotMs: 700, reactionMin: 230, reactionMax: 420,
    startDelay: 250, damageMultiplier: 1.4, damageTakenMultiplier: 0.9, knockbackTakenMultiplier: 0.7,
    projectileSpeed: 1.16, leadTime: 0.48, domainGain: 1.15, domainTick: 0.5,
    mahoraga: true, mahoragaStart: false, gojoRegen: true
  },
  abyss: {
    label: "地狱", badge: "难度 · 地狱",
    aimMin: 0.03, aimMax: 0.24, forcedShotMs: 700, reactionMin: 230, reactionMax: 420,
    startDelay: 250, damageMultiplier: 1.4, damageTakenMultiplier: 0.72, knockbackTakenMultiplier: 0.7,
    projectileSpeed: 1.16, leadTime: 0.48, domainGain: 1.45, domainTick: 0.36,
    mahoraga: true, mahoragaStart: true, gojoRegen: true
  }
};

export const ABILITY_SPECS = {
  blue:   { label: "苍", color: COLORS.gojo, core: "#e9fbff", speed: 470, radius: 8,  damage: 10, knock: 175, recoil: 215, life: 2.1,  power: 1 },
  red:    { label: "赫", color: "#ff536d", core: "#fff0e7", speed: 560, radius: 11, damage: 16, knock: 260, recoil: 285, life: 2.0,  power: 2 },
  purple: { label: "茈", color: COLORS.purple, core: "#ffffff", speed: 690, radius: 17, damage: 30, knock: 420, recoil: 365, life: 1.8,  power: 3 },
  slash:  { label: "解", color: COLORS.sukuna, core: "#ffe9ed", speed: 530, radius: 7,  damage: 10, knock: 185, recoil: 220, life: 1.9,  power: 1 },
  cleave: { label: "捌", color: "#f7f2ff", core: "#ffffff", speed: 580, radius: 6,  damage: 9,  knock: 165, recoil: 270, life: 1.75, power: 2 },
  flame:  { label: "开", color: COLORS.flame, core: "#fff6d2", speed: 650, radius: 18, damage: 30, knock: 430, recoil: 370, life: 1.8,  power: 3 }
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const choice = (array) => array[Math.floor(Math.random() * array.length)];
