import { CHARACTERS, STORY_STAGES, COPY_TECHNIQUES, DIFFICULTY, YUTA_STORY_DIFFICULTY_OVERRIDES, ARENA, FLIGHT, SPRINT, BLACK_FLASH, GOJO_REGEN_PER_SECOND, PLAYER_HP_SETTINGS, SUKUNA_VS_GOJO_AI_HANDICAP, clamp, lerp, rand, TAU } from "./config3d.js";
import { STORY_DIALOGUE } from "./storyDialogue.js";
import { HIDDEN_INVENTORY_ART } from "./hiddenInventoryArt.js";
import { beginCombatMotion, COMBAT_MOTIONS } from "./combatMotion.js";
import { fighterSigil } from "./shibuyaConfig.js";
import { isShibuyaStory, startShibuya, updateShibuya, shibuyaAbilityLocked, castTodoSupport, castSoulDomain } from "./shibuyaBattle.js";
import { isRaid, startRaid, updateRaid, updateRaidAI, raidAbilityLocked, castRaid, raidDamageBlocked, recordRaidHit } from './shinjukuRaid.js';
import { SIMPLE_DOMAIN, BORROWED_BATTLE } from "./config3d.js";
import { guardFactor, chaseDirection, reactToThreat } from './battleQuality.js';
import { saveBattleRecord } from './battleRecords.js';
import { sphereContactTime, projectileStart, projectileClashTime } from './combatCollision.js';

const ENTITY_RADIUS = 0.7;
const ENTITY_HEIGHT = 2;
const CHEST = 1.0;
const PRACTICE_CHAR_IDS = new Set(Object.keys(CHARACTERS));
const PRACTICE_DUMMIES = {
  gojo: "sukuna",
  sukuna: "gojo",
  yuta: "sukunaStory1",
  sukunaStory1: "yuta",
  yutaGojo: "sukunaStory2",
  sukunaStory2: "yutaGojo", gojoTeen: "toji", toji: "gojoTeen",
  gojoAwakened: "tojiRematch", tojiRematch: "gojoAwakened"
};

const ABILITY_ART = {
  blue: { art: "limitless-blue", compact: true },
  red: { art: "limitless-red", compact: true },
  purple: { art: "gojo-murasaki", life: 1, stop: 0.42, flash: 0.72, shake: 2.4 },
  slash: { art: "sukuna-slash", compact: true },
  cleave: { art: "sukuna-slash", compact: true },
  flame: { art: "sukuna-flame", life: 1.05, stop: 0.3 },
  mahoraga: { art: "mahoraga-summon", compact: true, life: 1.1 },
  katana: { art: "yuta-katana", compact: true },
  rika: { art: "yuta-rika", life: 1.15, stop: 0.35 },
  cursedSpeech: { art: "yuta-cursed-speech", compact: true },
  skyBreak: { art: "yuta-sky-break", compact: true },
  jacobsLadder: { art: "yuta-jacobs-ladder", life: 1.05, stop: 0.32 },
  cleaveRush: { art: "sukuna-slash", compact: true },
  yutaHeal: { art: "yuta-heal", compact: true },
  borrowedHeal: { art: "borrowed-heal", compact: true },
  worldSlash: { art: "sukuna-world-slash", life: 1.05, stop: 0.32 },
  wickerBasket: { art: "sukuna-guard", compact: true },
  sukunaHeal: { art: "sukuna-heal", compact: true }
};

export class Game3D {
  constructor() {
    this.mode = "single";
    this.modeFamily = "gojo";
    this.storyPlayMode = "story";
    this.difficulty = "normal";
    this.state = "menu";
    this.entities = [];
    this.projectiles = [];
    this.beams = [];
    this.domains = [];
    this.domainBreaks = [];
    this.sceneHits = [];
    this.worldObstacles = [];
    this.particles = [];
    this.damageTexts = [];
    this.announcements = [];
    this.events = [];
    this.elapsed = 0;
    this.screenShake = 0;
    this.flash = 0;
    this.hitStop = 0;
    this.winner = null;
    this.practice = false;
    this.playerMaxHp = PLAYER_HP_SETTINGS.default;
    this.practiceChar = "gojo";
    this.practiceInfinite = true;
    this.practiceInvincible = true;
    this.practiceEnemyInvincible = true;
    this.practiceDummy = false;
    this.blackFlashCount = 0;
    this.nextRegenFxAt = 0;
    this.singleChar = "gojo";
    this.freePlayerChar = "gojo";
    this.freeEnemyChar = "sukuna";
    this.storyStage = "yuta";
    this.storySide = "ally";
    this.storyTimer = 300;
    this.hitPulse = 0;
    this.hitPulseColor = "#ecc25a";
    this.timeStop = 0;
    this.cutIn = null;
    this.storyTransition = null;
    this.lastSkillArtAt = -Infinity;
    this.battleTime = 0;
    this.rampStage = 0;
    this.dialogueQueue = [];
    this.activeDialogue = null;
    this.dialogueUntil = 0;
    this.dialogueFlags = new Set();
  }

  clearDialogue() {
    this.dialogueQueue = [];
    this.activeDialogue = null;
    this.dialogueUntil = 0;
    this.dialogueFlags = new Set();
  }

  getDifficultyProfile() {
    const profile = DIFFICULTY[this.difficulty] || DIFFICULTY.normal;
    if (this.mode !== "story" || this.storySide === "enemy" || STORY_STAGES[this.storyStage]?.canon) return profile;
    const overrides = YUTA_STORY_DIFFICULTY_OVERRIDES[this.difficulty];
    return overrides ? { ...profile, ...overrides } : profile;
  }

  isStoryCombat() {
    return this.mode === "story" || (this.mode === "dual" && this.modeFamily === "story");
  }

  isCanonStory() {
    return this.mode === "story" && Boolean(STORY_STAGES[this.storyStage]?.canon);
  }

  beginStoryTransition(scene, nextState = "playing") {
    const illustration = HIDDEN_INVENTORY_ART[scene];
    if (!illustration) return false;
    this.storyTransition = { scene, ...illustration, nextState };
    this.cutIn = null;
    this.state = "storyTransition";
    return true;
  }

  finishStoryTransition() {
    if (this.state !== "storyTransition" || !this.storyTransition) return false;
    const nextState = this.storyTransition.nextState;
    this.storyTransition = null;
    this.state = nextState;
    return true;
  }

  queueDialogue(speaker, text, duration = 2.4, priority = 0) {
    const key = `${speaker}:${text}`;
    if (this.activeDialogue?.key === key || this.dialogueQueue.some((l) => l.key === key)) return;
    this.dialogueQueue.push({ speaker, text, duration, priority, key });
    this.dialogueQueue.sort((a, b) => b.priority - a.priority);
  }

  storyDialogueLine(charId, cue) {
    if (!this.isStoryCombat()) return null;
    return STORY_DIALOGUE[charId]?.[cue] || null;
  }

  queueStoryDialogue(entity, cue, duration = 2.5, priority = 2) {
    if (!entity) return false;
    const line = this.storyDialogueLine(entity.charId, cue);
    if (!line) return false;
    const key = `story:${entity.id}:${cue}`;
    if (this.dialogueFlags.has(key)) return true;
    this.dialogueFlags.add(key);
    this.queueDialogue(entity.charId, line, duration, priority);
    return true;
  }

  queueStoryMoveDialogue(entity, ability) {
    if (!this.isStoryCombat() || !entity || !ability) return false;
    const line = STORY_DIALOGUE[entity.charId]?.moves?.[ability.id];
    if (!line) return false;
    const key = `story:${entity.id}:move:${ability.id}`;
    if (this.dialogueFlags.has(key)) return true;
    this.dialogueFlags.add(key);
    const isDomain = ability.type === "domain";
    this.queueDialogue(entity.charId, line, isDomain ? 3 : 2.2, isDomain ? 5 : 3);
    return true;
  }

  updateDialogue(dt) {
    if (this.activeDialogue) {
      this.dialogueUntil -= dt;
      if (this.dialogueUntil <= 0) this.activeDialogue = null;
    }
    if (!this.activeDialogue && this.dialogueQueue.length) {
      this.activeDialogue = this.dialogueQueue.shift();
      this.dialogueUntil = this.activeDialogue.duration;
    }
  }

  currentDialogue() {
    if (!this.activeDialogue) return null;
    const char = CHARACTERS[this.activeDialogue.speaker] || CHARACTERS.gojo;
    return {
      speaker: this.activeDialogue.speaker,
      name: char.name,
      sigil: fighterSigil(this.activeDialogue.speaker),
      color: char.color,
      text: this.activeDialogue.text
    };
  }

  emit(type, payload = {}) {
    this.events.push({ type, ...payload });
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  start(mode, difficulty = "normal") {
    this.mode = mode;
    this.difficulty = DIFFICULTY[difficulty] ? difficulty : "normal";
    this.practice = mode === "practice";
    this.state = "playing";
    this.elapsed = 0;
    this.storyTimer = 300;
    this.groundDuel = this.modeFamily === 'free' && ['single', 'dual'].includes(mode) &&
      [this.freePlayerChar, this.freeEnemyChar].some(id => CHARACTERS[id]?.grounded);
    this.resultStats = null;
    this.blackFlashCount = 0;
    this.nextRegenFxAt = 0;
    this.dummyRespawn = 2.5;
    this.training = { blocked: 0, dodged: 0, blackFlash: 0 };
    this.trainingTask = null;
    this.borrowedBattle = null;
    this.raid = null;
    this.storyTransition = null;
    this.winner = null;
    this.lockTargetId = null;
    this.battleTime = 0;
    this.rampStage = 0;
    this.timeStop = 0;
    this.cutIn = null;
    this.lastSkillArtAt = -Infinity;
    this.projectiles = [];
    this.beams = [];
    this.domains = [];
    this.domainBreaks = [];
    this.sceneHits = [];
    this.particles = [];
    this.damageTexts = [];
    this.announcements = [];
    this.screenShake = 0;
    this.flash = 0;
    this.hitStop = 0;
    this.hitPulse = 0;
    this.events = [];
    this.entities = [];
    if (this.practice) {
      this.entities.push(this.makeEntity(this.practiceChar || "gojo", 0, 6, true));
      if (this.practiceDummy) this.spawnDummy();
      if (this.modeFamily === "free") this.entities.forEach((entity, index) => {
        entity.id = "free_p" + (index + 1) + "_" + entity.charId;
        entity.team = index === 0 ? "gojo" : "sukuna";
      });
    } else if (this.modeFamily === "free") {
      this.entities.push(this.makeEntity(this.freePlayerChar, 0, 15, true));
      this.entities.push(this.makeEntity(this.freeEnemyChar, 0, -15, mode === "dual"));
      this.entities.forEach((entity, index) => {
        entity.id = "free_p" + (index + 1) + "_" + entity.charId;
        entity.team = index === 0 ? "gojo" : "sukuna";
      });
    } else if (mode === "story") {
      const stage = STORY_STAGES[this.storyStage] || STORY_STAGES.yuta;
      const playerChar = this.storySide === "enemy" ? stage.enemy : stage.ally;
      const aiChar = this.storySide === "enemy" ? stage.ally : stage.enemy;
      this.entities.push(this.makeEntity(playerChar, 0, 15, true));
      this.entities.push(this.makeEntity(aiChar, 0, -15, false));
    } else if (mode === "dual" && this.modeFamily === "story") {
      const stage = STORY_STAGES[this.storyStage] || STORY_STAGES.yuta;
      const playerChar = this.storySide === "enemy" ? stage.enemy : stage.ally;
      const secondChar = this.storySide === "enemy" ? stage.ally : stage.enemy;
      this.entities.push(this.makeEntity(playerChar, 0, 15, true));
      this.entities.push(this.makeEntity(secondChar, 0, -15, true));
    } else {
      // single player may pick either side; the other one is the AI
      const playerChar = mode === "single" && this.singleChar === "sukuna" ? "sukuna" : "gojo";
      const aiChar = playerChar === "gojo" ? "sukuna" : "gojo";
      this.entities.push(this.makeEntity(playerChar, 0, 15, true));
      this.entities.push(this.makeEntity(aiChar, 0, -15, mode === "dual"));
    }
    // difficulty decides the enemy's toughness
    if (this.mode === "single" || this.mode === "story") {
      const hp = this.getDifficultyProfile().enemyHp || 100;
      const ai = this.entities.find((e) => !e.isPlayer && !e.summon);
      const gojoAiTuning = this.legacyGojoAi(ai)
        ? SUKUNA_VS_GOJO_AI_HANDICAP.aiTuning[this.difficulty]
        : null;
      const aiHpMultiplier = this.legacyGojoAi(ai)
        ? (gojoAiTuning?.hpMultiplier ?? SUKUNA_VS_GOJO_AI_HANDICAP.hp)
        : 1;
      if (ai) {
        ai.maxHp = Math.round(hp * aiHpMultiplier);
        ai.hp = ai.maxHp;
      }
    }
    // 地狱: Sukuna opens the fight with Mahoraga already on the field
    if (this.mode === "single" && DIFFICULTY[this.difficulty].mahoragaStart) {
      const ai = this.entities.find((e) => !e.isPlayer && !e.summon);
      const summonAbility = CHARACTERS[ai?.charId]?.abilities?.find((a) => a.type === "summon");
      if (ai && summonAbility) this.castSummon(ai, summonAbility);
    }
    // opening flash: "会赢的" cut-in when the player brings Gojo
    if (this.entities.some((e) => e.isPlayer && e.charId === "gojo")) {
      this.triggerCutIn("gojo-win.jpg", 0.55, 0.8, 2.2, {
        life: 1.15,
        tint: "rgba(68, 217, 255, 0.30)",
        shadow: "rgba(40, 130, 230, 0.55)",
        fit: "contain"
      });
    }
    this.clearDialogue();
    if (this.isCanonStory()) {
      const stage = STORY_STAGES[this.storyStage];
      this.queueDialogue(stage.ally, stage.sceneIntro || stage.intro, 7, 7);
      const opponent = this.entities.find(e => !e.isPlayer && !e.summon);
      this.announce(`击败${opponent.name}即可通关`, "#bdeeff", stage.shibuya ? 3 : 7);
    }
    if (this.isStoryCombat()) {
      const player = this.entities.find((e) => e.isPlayer && !e.summon);
      const opponent = this.entities.find((e) => e !== player && !e.summon);
      this.queueStoryDialogue(player, "opening", 3.2, 5);
      this.queueStoryDialogue(opponent, "opening", 2.8, 4);
    } else if (this.mode !== "practice") {
      const pc = this.entities.find((e) => e.isPlayer)?.charId || "gojo";
      this.queueDialogue(pc, STORY_DIALOGUE[CHARACTERS[pc]?.assetId || pc]?.opening || (pc === "gojo"
        ? "我的学生都在看着呢，再让我耍会儿帅吧。"
        : pc === "yuta" ? "里香，开始吧。"
          : pc === "yutaGojo" ? "这一次，我会撑住。"
            : "让我看看，你凭什么站在我面前。"), 3.3, 2);
    }
    this.emit("sfx", { kind: "countdown" });
    if (this.isBorrowedBattle()) this.startBorrowedBattle();
    if (this.mode === "single" && DIFFICULTY[this.difficulty].gojoRegen) {
      this.announce("反转术式 · 持续恢复", "#b9f5ff", 1.5);
    }
    startShibuya(this);
    startRaid(this);
    if (this.isCanonStory() && this.storyStage.startsWith('hiddenInventory')) this.beginStoryTransition(this.storyStage === "hiddenInventory" ? "opening" : "awakening");
  }

  isBorrowedBattle() {
    return this.isStoryCombat() && this.storyStage === "borrowed";
  }

  startBorrowedBattle() {
    this.storyTimer = this.mode !== "dual" && this.storySide === "ally" && this.difficulty === "easy"
      ? BORROWED_BATTLE.easyDuration : BORROWED_BATTLE.duration;
    this.borrowedBattle = { phase: "combat", recorderUsed: false };
    for (const e of this.entities) {
      e.z = e.charId === "yutaGojo" ? 7 : -7;
      e.x = e.y = 0;
      e.charge = 0;
      e.domainCharge = 0;
      e.domainLocked = true;
      e.amplification = false;
      e.amplificationEnergy = 100;
      e.amplificationRest = 0;
      e.pendingCast = null;
      e.recovery = 0;
      const ability = e.charId === "yutaGojo" ? CHARACTERS.gojo.abilities[3] : CHARACTERS.sukuna.abilities[3];
      this.castDomain(e, { ...ability, radius: BORROWED_BATTLE.radius, life: this.storyTimer });
    }
    this.announce("领域对抗 · 击败对手即可获胜", "#b7e9ff", 3);
    this.queueDialogue("yutaGojo", `领域交锋持续${this.storyTimer}秒，结界结束后继续战斗。用体术、苍与茈击败对手。`, 7, 7);
  }

  recorderReady() {
    const b = this.borrowedBattle;
    return Boolean(b && !b.recorderUsed);
  }

  borrowedSkillLocked(entity, ability) {
    if (!this.isBorrowedBattle()) return false;
    return this.borrowedBattle?.phase !== "combat" || Boolean(entity.pendingCast || entity.rushImpact > 0 || entity.recovery > 0)
      || (ability?.id === "recorder" && !this.recorderReady());
  }

  updateBorrowedCast(e, dt) {
    if (!this.isBorrowedBattle()) return;
    e.recorderTimer = Math.max(0, (e.recorderTimer || 0) - dt);
    e.recorderTimer = Math.max(0, (e.recorderTimer || 0) - dt);
    e.recovery = Math.max(0, (e.recovery || 0) - dt);
    if (e.charId === "sukunaStory2") {
      e.amplificationRest = Math.max(0, e.amplificationRest - dt);
      if (e.amplification) {
        e.amplificationEnergy = Math.max(0, e.amplificationEnergy - BORROWED_BATTLE.amplificationDrain * dt);
        if (e.amplificationEnergy === 0) { e.amplification = false; e.amplificationRest = 1; }
      } else if (e.amplificationRest === 0) {
        e.amplificationEnergy = Math.min(100, e.amplificationEnergy + BORROWED_BATTLE.amplificationRegen * dt);
      }
    }
    if (e.rushImpact > 0) {
      e.rushImpact -= dt;
      if (e.rushImpact <= 0) {
        const target = this.enemyList(e).find(x => !x.summon && x.alive);
        const ability = CHARACTERS[e.charId].abilities[2];
        const missed = target && Math.hypot(target.x - e.x, target.y - e.y, target.z - e.z) > ability.range;
        this.castMelee(e, ability);
        if (missed && target.charId === "yutaGojo") target.charge = Math.min(100, target.charge + 12);
        e.recovery = 0.55;
      }
    }
    const pending = e.pendingCast;
    if (!pending) return;
    pending.remaining -= dt;
    if (e.combatAction) e.combatAction.startedAt = this.elapsed - 0.25;
    if (pending.remaining > 0) return;
    e.pendingCast = null;
    const { ability, dir } = pending;
    e.yaw = Math.atan2(dir.x, dir.z);
    if (ability.id === "bodyRush") {
      this.tryDash(e, dir.x, dir.y, dir.z);
      e.invuln = 0;
      e.rushImpact = 0.2;
    } else if (ability.type === "orb") this.castOrb(e, ability, dir);
    else {
      this.castBeam(e, ability, dir);
      this.showAbilityArt(e, ability);
    }
  }

  setSingleChar(charId) {
    this.singleChar = charId === "sukuna" ? "sukuna" : "gojo";
  }

  setPlayerMaxHp(value) {
    const numeric = Number(value);
    const hp = Number.isFinite(numeric) ? numeric : PLAYER_HP_SETTINGS.default;
    this.playerMaxHp = clamp(Math.round(hp), PLAYER_HP_SETTINGS.min, PLAYER_HP_SETTINGS.max);
    return this.playerMaxHp;
  }

  setStory(stage, side) {
    this.storyStage = STORY_STAGES[stage] ? stage : "yuta";
    this.storySide = STORY_STAGES[this.storyStage]?.shibuya || STORY_STAGES[this.storyStage]?.allyOnly ? "ally" : side === "enemy" ? "enemy" : "ally";
  }

  setPracticeChar(charId) {
    this.practiceChar = PRACTICE_CHAR_IDS.has(charId) ? charId : "gojo";
  }

  setPracticeOption(key, value) {
    if (key === "infinite") this.practiceInfinite = value;
    if (key === "invincible") this.practiceInvincible = value;
    if (key === "enemyInvincible") this.practiceEnemyInvincible = value;
    if (key === "dummy") {
      this.practiceDummy = value;
      if (!this.practice) return;
      if (value) this.spawnDummy();
      else this.entities = this.entities.filter((e) => !e.dummy);
    }
  }

  spawnDummy() {
    if (this.entities.some((e) => e.dummy)) return;
    const other = this.modeFamily === "free" ? this.freeEnemyChar : PRACTICE_DUMMIES[this.practiceChar] || "sukuna";
    const dummy = this.makeEntity(other, 0, -14, false);
    if (this.modeFamily === "free") { dummy.id = "free_p2_" + other; dummy.team = this.player()?.team === "gojo" ? "sukuna" : "gojo"; }
    dummy.dummy = true;
    dummy.moveInput = { x: 0, z: 0 };
    this.entities.push(dummy);
  }

  makeEntity(charId, x, z, isPlayer) {
    const char = CHARACTERS[charId];
    const hp = isPlayer ? this.playerMaxHp : char.hp;
    return {
      id: isPlayer ? charId : `${charId}_ai`,
      charId,
      name: char.name,
      color: char.color,
      aura: char.aura,
      team: ['kashimo', 'higuruma'].includes(charId) || charId.startsWith("gojo") || charId.startsWith("yuta") || charId.startsWith("yuji") || charId.startsWith("todo") ? "gojo" : "sukuna",
      summon: false,
      ownerId: null,
      adapt: null,
      life: 0,
      contactAt: -10,
      shotAt: -10,
      isPlayer,
      x, z,
      y: 0,
      vy: 0,
      yaw: isPlayer ? Math.PI : 0,
      hp,
      maxHp: hp,
      initialMaxHp: hp,
      vx: 0,
      vz: 0,
      speed: char.speed,
      alive: true,
      moving: false,
      sprinting: false,
      moveInput: { x: 0, z: 0, y: 0 },
      aim: { x, z: z + (isPlayer ? -1 : 1) },
      aimDir: null,
      aiAlt: 0,
      aiAltTimer: rand(0.5, 1.4),
      cooldowns: char.abilities.map(() => 0),
      charge: 0,
      domainCharge: 0,
      burnout: 0,
      domainLocked: false,
      guardTimer: 0,
      simpleDomainTimer: 0,
      simpleDomainCooldown: 0,
      simpleDomainIntegrity: 0,
      copyIndex: 0,
      stun: 0,
      invuln: 0,
      hurtAt: -10,
      dashCooldown: 0,
      dashTimer: 0,
      dashVx: 0,
      dashVz: 0,
      comboChain: [],
      lastComboAt: -10,
      aiTimer: rand(0.7, 1.5),
      aiStrafe: Math.random() > 0.5 ? 1 : -1,
      aiCastCd: rand(0.4, 1.2),
      aiDashTimer: rand(1, 2),
      aiWaitStarted: 0,
      slow: 0,
      battleStats: { attempts: 0, landed: new Set(), damage: 0, taken: 0, heals: 0 }
    };
  }

  player() {
    return this.entities.find((e) => e.isPlayer);
  }

  isStorySukuna(entity) {
    return this.isStoryCombat() && (entity?.charId === "sukunaStory1" || entity?.charId === "sukunaStory2");
  }

  startTraining(task) {
    if (!['guard', 'dodge', 'blackFlash'].includes(task)) return false;
    this.practiceChar = this.freePlayerChar = 'yujiShibuya';
    this.modeFamily = 'free';
    this.freeEnemyChar = 'mahito';
    this.practiceDummy = true;
    this.practiceInfinite = this.practiceInvincible = this.practiceEnemyInvincible = false;
    this.start('practice', 'normal');
    const player=this.player(),enemy=this.entities.find(e=>e.dummy);
    Object.assign(player,{x:0,z:0}); Object.assign(enemy,{x:0,z:2.8,hp:500,maxHp:500});
    this.trainingTask={id:task,next:1,complete:false}; return true;
  }

  updateTraining() {
    const task=this.trainingTask;if(!this.practice||!task||task.complete)return;
    const counter={guard:'blocked',dodge:'dodged',blackFlash:'blackFlash'}[task.id];
    if(this.training[counter]>0){task.complete=true;this.announce('训练完成 · 可继续练习或选择下一项','#bdeeff',3);return;}
    if(task.id==='blackFlash'||this.elapsed<task.next)return;
    const enemy=this.entities.find(e=>e.dummy&&e.alive),player=this.player();if(!enemy||!player?.alive)return;
    task.next=this.elapsed+2.5;
    this.announce(task.id==='guard'?'陪练准备出拳 · 按体术防守':'陪练准备出拳 · 冲刺躲避','#ff867e',.7);
    this.recordAttack(enemy);
    this.castMelee(enemy,{id:'basicAttack',damage:12,range:4.5,windup:.5,color:enemy.color});
  }

  setWorldObstacles(obstacles = []) {
    this.worldObstacles = obstacles
      .filter((box) => box && [box.minX, box.maxX, box.minY, box.maxY, box.minZ, box.maxZ].every(Number.isFinite))
      .map((box) => ({ ...box }));
  }

  resolveObstacleAxis(entity, axis, from, to) {
    if (this.worldObstacles.length === 0) return to;
    const otherAxis = axis === "x" ? "z" : "x";
    const other = entity[otherAxis];
    const delta = to - from;
    let resolved = to;
    for (const box of this.worldObstacles) {
      if (entity.y >= box.maxY || entity.y + ENTITY_HEIGHT <= box.minY) continue;
      const minOther = otherAxis === "x" ? box.minX : box.minZ;
      const maxOther = otherAxis === "x" ? box.maxX : box.maxZ;
      const nearestOther = clamp(other, minOther, maxOther);
      const otherGap = other - nearestOther;
      if (otherGap * otherGap >= ENTITY_RADIUS * ENTITY_RADIUS) continue;
      const radiusAtThisSlice = Math.sqrt(ENTITY_RADIUS * ENTITY_RADIUS - otherGap * otherGap);
      const minAxis = (axis === "x" ? box.minX : box.minZ) - radiusAtThisSlice;
      const maxAxis = (axis === "x" ? box.maxX : box.maxZ) + radiusAtThisSlice;
      if ((from <= minAxis && delta < 0) || (from >= maxAxis && delta > 0)) continue;
      if (from < minAxis && resolved >= minAxis) resolved = Math.min(resolved, minAxis);
      else if (from > maxAxis && resolved <= maxAxis) resolved = Math.max(resolved, maxAxis);
      else if (from >= minAxis && from <= maxAxis) {
        resolved = from - minAxis <= maxAxis - from ? minAxis : maxAxis;
      }
    }
    return resolved;
  }

  closedDomain() {
    return this.domains.find((domain) => domain.alive && domain.closedBarrier);
  }

  syncDomainCaptives() {
    const domain = this.closedDomain();
    for (const entity of this.entities) {
      if (domain) {
        // The compact arena is the capture area; all fighters and summons enter.
        entity.domainReturnPosition ??= { x: entity.x, y: entity.y, z: entity.z };
      } else if (entity.domainReturnPosition) {
        Object.assign(entity, entity.domainReturnPosition);
        delete entity.domainReturnPosition;
        entity.vx = entity.vy = entity.vz = 0;
        entity.dashTimer = 0;
        this.resolveWorldMovement(entity, entity.x, entity.z, entity.x, entity.z);
      }
    }
  }

  resolveWorldMovement(entity, fromX, fromZ, toX, toZ) {
    const domain = this.closedDomain();
    if (domain) {
      entity.domainReturnPosition ??= { x: fromX, y: entity.y, z: fromZ };
      entity.x = toX;
      entity.z = toZ;
      if (domain.type !== "void") {
        entity.x = this.resolveObstacleAxis(entity, "x", fromX, toX);
        entity.z = this.resolveObstacleAxis(entity, "z", fromZ, toZ);
      }
      const dx = entity.x - domain.x, dy = entity.y + CHEST - domain.y, dz = entity.z - domain.z;
      const distance = Math.hypot(dx, dy, dz);
      const limit = domain.radius - ENTITY_HEIGHT;
      if (distance > limit) {
        const scale = limit / distance;
        entity.x = domain.x + dx * scale;
        entity.y = Math.max(0, domain.y + dy * scale - CHEST);
        entity.z = domain.z + dz * scale;
        entity.vx = entity.vy = entity.vz = 0;
        entity.dashTimer = 0;
      }
      return;
    }
    const limit = ARENA.half - ENTITY_RADIUS;
    toX = clamp(toX, -limit, limit);
    toZ = clamp(toZ, -limit, limit);
    entity.x = fromX;
    entity.z = fromZ;
    entity.x = this.resolveObstacleAxis(entity, "x", fromX, toX);
    entity.z = this.resolveObstacleAxis(entity, "z", fromZ, toZ);
    entity.x = clamp(entity.x, -limit, limit);
    entity.z = clamp(entity.z, -limit, limit);
  }

  resolveWorldOverlaps() {
    for (const entity of this.entities) {
      if (!entity.alive) continue;
      const x = entity.x;
      const z = entity.z;
      this.resolveWorldMovement(entity, x, z, x, z);
    }
  }

  // ---- lock-on (used by the mobile camera) ----
  enemyList(player = this.player()) {
    if (!player) return [];
    return this.entities.filter((e) => e.alive && e.team !== player.team);
  }

  lockEntity(player = this.player()) {
    const list = this.enemyList(player);
    if (!list.length) return null;
    const targetId = player === this.player() ? this.lockTargetId : player.lockTargetId;
    return list.find((e) => e.id === targetId) || list[0];
  }

  cycleLock(player = this.player()) {
    const list = this.enemyList(player);
    const primary = player === this.player();
    if (!list.length) { if (primary) this.lockTargetId = null; else if (player) player.lockTargetId = null; return null; }
    const idx = list.findIndex((e) => e.id === (primary ? this.lockTargetId : player.lockTargetId));
    const base = idx >= 0 ? idx : 0;
    const next = list[(base + 1) % list.length];
    if (primary) this.lockTargetId = next.id;
    else player.lockTargetId = next.id;
    return next;
  }

  // ---- input from main ----
  setMove(entity, mx, mz, my = 0) {
    if (!entity) return;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    entity.moveInput.x = mx;
    entity.moveInput.z = mz;
    entity.moveInput.y = CHARACTERS[entity.charId]?.grounded ? 0 : my;
    if (this.groundDuel) entity.moveInput.y = 0;
  }

  setAim(entity, x, z) {
    if (!entity) return;
    entity.aim.x = x;
    entity.aim.z = z;
    entity.aimDir = null;
  }

  // full 3D aim (mouse controls both yaw and pitch)
  setAimDir(entity, x, y, z) {
    if (!entity) return;
    const len = Math.hypot(x, y, z) || 1;
    entity.aimDir = { x: x / len, y: y / len, z: z / len };
    entity.aim.x = entity.x + entity.aimDir.x * 30;
    entity.aim.z = entity.z + entity.aimDir.z * 30;
  }

  aimDir(entity) {
    let dx = entity.aim.x - entity.x;
    let dz = entity.aim.z - entity.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) { dx = Math.sin(entity.yaw); dz = Math.cos(entity.yaw); }
    else { dx /= len; dz /= len; }
    return { x: dx, z: dz };
  }

  // 3D firing direction: horizontal from the mouse aim, vertical converges to the target's altitude
  fireDir(entity) {
    // players auto-aim: shots fly straight at the locked target
    if (entity.isPlayer) {
      const target = this.lockEntity(entity);
      if (target && !(target.flyheadTimer > 0)) {
        const dx = target.x - entity.x;
        const dy = (target.y + CHEST) - (entity.y + CHEST);
        const dz = target.z - entity.z;
        const len = Math.hypot(dx, dy, dz) || 1;
        return { x: dx / len, y: dy / len, z: dz / len };
      }
    }
    if (entity.aimDir) return entity.aimDir;
    let dx = entity.aim.x - entity.x;
    let dz = entity.aim.z - entity.z;
    const hlen = Math.hypot(dx, dz) || 1;
    dx /= hlen;
    dz /= hlen;
    let vyFrac = 0;
    const target = this.entities.find((e) => e.alive && e.team !== entity.team);
    if (target) {
      const span = Math.hypot(target.x - entity.x, target.z - entity.z) || 1;
      const dy = target.y - entity.y;
      vyFrac = clamp(dy / span, -0.9, 0.9);
    }
    const len = Math.hypot(dx, vyFrac, dz) || 1;
    return { x: dx / len, y: vyFrac / len, z: dz / len };
  }

  // ---- casting ----
  legacyGojoAi(entity) {
    return this.mode === 'single' && this.modeFamily !== 'free' && entity?.charId === 'gojo' && this.singleChar === 'sukuna';
  }

  ownsDomain(entity) {
    return this.domains.some(d=>d.alive && d.ownerId===entity?.id);
  }

  activeAbility(entity, index) {
    const ability = CHARACTERS[entity.charId]?.abilities[index];
    if (ability?.type === 'copy' && this.domains.some(d => d.alive && d.type === 'authenticLove' && d.ownerId === entity.id)) {
      return COPY_TECHNIQUES[entity.domainKatanaIndex ?? 0];
    }
    return ability?.type === "copy" ? COPY_TECHNIQUES[entity.copyIndex] : ability;
  }

  cycleCopy(entity) {
    if (!entity?.alive || entity.charId !== "yuta") return false;
    if (this.domains.some(d => d.alive && d.type === 'authenticLove' && d.ownerId === entity.id)) {
      this.announce('刀内术式只能在拔刀时得知 · 使用后再取一柄', '#d9c8ff', 1.5);
      return false;
    }
    entity.copyIndex = (entity.copyIndex + 1) % COPY_TECHNIQUES.length;
    this.announce(`复制术式 · ${COPY_TECHNIQUES[entity.copyIndex].label}`, "#d9c8ff", 1);
    return true;
  }

  enterBurnout(entity) {
    if (!entity?.alive || entity.summon) return;
    entity.burnout = Math.max(entity.burnout, 6);
    this.announce(`${entity.name} · 术式熔断`, entity.color, 1.25);
  }

  tryForceRestore(entity) {
    if (this.timeStop > 0 || this.hitStop > 0) return false;
    if (["gojoTeen", "gojoAwakened", "toji", "tojiRematch", "yujiShibuya", "mahito", "mahitoFinal"].includes(entity?.charId)) return false;
    if (this.isBorrowedBattle()) return false;
    if (!entity?.alive || entity.burnout <= 0 || entity.domainLocked || this.state !== "playing") return false;
    const cost = Math.ceil(entity.maxHp * 0.2);
    if (entity.hp <= cost) return false;
    entity.hp -= cost;
    entity.burnout = 0;
    entity.domainLocked = true;
    this.damageTexts.push({ x: entity.x, y: entity.y + 2, z: entity.z, text: `-${cost} 强行恢复`, color: "#ffb15c", life: 1, maxLife: 1 });
    this.announce(`${entity.name} · 强行恢复`, "#ffb15c", 1.3);
    return true;
  }

  tryCast(entity, index) {
    if (this.timeStop > 0) return false;
    if (this.hitStop > 0 && this.isBorrowedBattle()) return false;
    if (!entity?.alive || this.state !== "playing") return false;
    if (entity.stun > 0) return false;
    const char = CHARACTERS[entity.charId];
    const ability = char.abilities[index];
    if (!ability) return false;
    if (['domain','soulDomain'].includes(ability.type) && this.ownsDomain(entity)) return false;
    if (this.borrowedSkillLocked(entity, ability)) return false;
    if (this.isBorrowedBattle() && ability.id === "bodyRush" && entity.dashCooldown > 0) return false;
    if (ability.type === "amplification") {
      if (!entity.amplification && (entity.amplificationEnergy ?? 100) < 15) return false;
      entity.amplification = !entity.amplification;
      entity.amplificationRest = 1;
      this.announce(entity.amplification ? "领域展延 · 突破无下限" : "领域展延解除", entity.color, 1);
      return true;
    }
    if (ability.id === "recorder") {
      if (!this.practice && !this.recorderReady()) return false;
      if (this.borrowedBattle) this.borrowedBattle.recorderUsed = true;
      entity.recorderTimer = 1.6;
      const target = this.enemyList(entity).find(e => !e.summon && e.alive);
      if (target) { target.stun = 1.6; target.pendingCast = null; target.rushImpact = 0; target.dashTimer = 0; }
      beginCombatMotion(entity, "blue", this.elapsed);
      this.burst(entity.x, entity.y + CHEST, entity.z, "#bdeeff", 24, 5);
      this.queueDialogue("yutaGojo", "狗卷同学，拜托了！", 1.4, 6);
      this.announce("苍引入录音 · 狗卷：别动！ · 咒言反噬", "#d9c8ff", 1.6);
      this.emit("sfx", { kind: "ability", ability: "cursedSpeech" });
      return true;
    }
    if (shibuyaAbilityLocked(this, entity, ability)) return false;
    if (raidAbilityLocked(this, entity, ability)) return false;
    if (entity.burnout > 0 && ability.requiresTechnique) return false;
    if (ability.needsDomain && (entity.domainLocked || (this.isStoryCombat() && this.storyStage === "borrowed" && this.storyTimer <= 0 && entity.charId === "yutaGojo"))) return false;
    const counterWindow = ability.needsDomain && !this.domains.some(d => d.alive && d.type === 'void' && d.tickSerial > 0 && !this.sureHitContested(d, entity));
    if (this.inVoidStun(entity) && !counterWindow) {
      this.emit("sfx", { kind: "empty" });
      return false;
    }
    const infinite = this.practice && this.practiceInfinite;
    if (!infinite) {
      if (entity.cooldowns[index] > 0) { this.emit("sfx", { kind: "empty" }); return false; }
      if (ability.needsCharge && entity.charge < 100) { this.emit("sfx", { kind: "empty" }); return false; }
      if (ability.needsDomain && entity.domainCharge < 100) { this.emit("sfx", { kind: "empty" }); return false; }
    }
    if (!this.isBorrowedBattle() && (this.hitStop > 0 || entity.meleeAttack || entity.meleeRecovery > 0)) {
      entity.queuedInput = { index, expires: this.elapsed + .25 };
      return false;
    }
    if (infinite) { entity.charge = 100; entity.domainCharge = 100; }
    const isPacedGojoAi = !entity.isPlayer && this.legacyGojoAi(entity);
    const gojoAiTuning = isPacedGojoAi
      ? SUKUNA_VS_GOJO_AI_HANDICAP.aiTuning[this.difficulty]
      : null;
    const aiCooldown = gojoAiTuning?.aiCooldowns[ability.id];
    if (ability.type === 'copy' && this.domains.some(d => d.alive && d.type === 'authenticLove' && d.ownerId === entity.id)) entity.domainKatanaIndex = Math.floor(Math.random() * 2);
    const selected = this.activeAbility(entity, index);
    if (selected.id === 'worldDismantle' || selected.type === 'domain') entity.wickerBasketTimer = 0;
    entity.cooldowns[index] = infinite ? 0.12 : (aiCooldown ?? selected.cooldown ?? ability.cooldown);
    entity.attackStartedAt = this.elapsed;
    if (['melee', 'orb', 'beam', 'chain', 'attraction', 'discharge', 'raidWindup', 'execution'].includes(selected.type)) this.recordAttack(entity);
    if (ability.needsCharge && !infinite) entity.charge = 0;
    if (ability.needsDomain && !infinite) entity.domainCharge = 0;

    const dir = this.fireDir(entity);
    entity.yaw = Math.atan2(dir.x, dir.z);
    if (this.isBorrowedBattle() && selected.windup) {
      entity.pendingCast = { ability: selected, dir: { ...dir }, remaining: selected.windup, total: selected.windup };
      entity.dashTimer = 0;
      entity.vx = entity.vy = entity.vz = 0;
      beginCombatMotion(entity, selected.id, this.elapsed);
      if (selected.id === "purple") this.announce("茈 · 施法准备中，可被近身打断", "#b05cff", selected.windup);
      return true;
    }
    const previousCutIn = this.cutIn;

    if (ability.type !== "melee" && ability.type !== "summon") beginCombatMotion(entity, selected.id, this.elapsed);

    if (castRaid(this, entity, selected, dir)) { /* Stage-specific cast handled. */ }
    else if (selected.id === "todoSupport") castTodoSupport(this, entity);
    else if (selected.type === "soulDomain") castSoulDomain(this, entity);
    else if (selected.type === "orb") this.castOrb(entity, selected, dir);
    else if (selected.type === "beam") this.castBeam(entity, selected, dir);
    else if (ability.type === "domain") this.castDomain(entity, ability);
    else if (ability.type === "summon") this.castSummon(entity, ability);
    else if (ability.type === "melee") this.castMelee(entity, ability);
    else if (ability.type === "guard") this.castGuard(entity, ability);
    else if (ability.type === "heal") this.castHeal(entity, ability);
    else if (ability.type === "infinity") {
      entity.infinityTimer = ability.life;
      this.burst(entity.x, entity.y + CHEST, entity.z, ability.color, 28, 2);
    }
    else if (ability.type === "attraction") this.castAttraction(entity, ability);
    else if (ability.type === "chain") {
      this.castBeam(entity, { ...ability, length: ability.range, width: 0.7, life: 0.3, knock: 3, shape: "chain" }, dir);
    }
    else if (ability.type === "flyheads") {
      entity.flyheadTimer = 4;
      this.burst(entity.x, entity.y + CHEST, entity.z, "#292536", 80, 6);
      this.announce("蝇头遮蔽视野 · 锁定暂时失效", "#b8aecb", 2);
    }
    if (ability.type === 'copy' && entity.domainKatanaIndex !== undefined) {
      entity.domainSwordUses = (entity.domainSwordUses || 0) + 1;
      delete entity.domainKatanaIndex;
      this.announce(`拔刀 · ${selected.label} · 刀已消失`, '#d9c8ff', 1.2);
    }
    if (selected.type !== "domain" && selected.type !== "melee") this.showAbilityArt(entity, selected);
    // Full-screen art outlasts the simulation freeze. Keep the gesture visible
    // after it clears without delaying damage, cooldowns, or domain activation.
    if (entity.combatAction && this.cutIn !== previousCutIn && this.cutIn?.presentation === "full") {
      entity.combatAction.startedAt += Math.max(0, this.cutIn.life - this.timeStop);
    }
    if (this.isStoryCombat()) this.queueStoryMoveDialogue(entity, selected);
    return true;
  }

  meleeTarget(entity, range) {
    const enemies = this.enemyList(entity).filter(e => !e.support);
    const distance = e => Math.hypot(e.x-entity.x, e.y-entity.y, e.z-entity.z);
    const locked = entity.isPlayer && this.lockEntity(entity);
    if (locked && distance(locked) <= range) return locked;
    return enemies.filter(e => distance(e) <= range).sort((a,b) => distance(a)-distance(b))[0]
      || locked || enemies.find(e => !e.summon) || enemies[0];
  }

  castMelee(entity, ability) {
    const target = this.meleeTarget(entity, ability.range);
    if (target) entity.yaw = Math.atan2(target.x-entity.x, target.z-entity.z);
    beginCombatMotion(entity, ability.id, this.elapsed);
    this.emit('sfx', { kind: 'ability', ability: 'slash' });
    if (!this.isBorrowedBattle()) {
      const heavy = /heavy|Heavy|BlackFlash/.test(ability.id);
      entity.attackStartedAt = this.elapsed;
      entity.meleeAttack = { ability, remaining: ability.windup ?? (heavy ? .24 : .12), recovery: heavy ? .36 : .2, attackId: entity.attackSerial, yaw: entity.yaw };
      if(entity.combatAction) entity.combatAction.playbackSpeed=COMBAT_MOTIONS[entity.combatAction.id].duration / (entity.meleeAttack.remaining+entity.meleeAttack.recovery);
      return;
    }
    this.resolveMelee(entity, ability, entity.attackSerial);
  }

  recordAttack(entity) {
    entity.attackSerial = (entity.attackSerial || 0) + 1;
    entity.battleStats ||= { attempts: 0, landed: new Set(), damage: 0, taken: 0, heals: 0 };
    entity.battleStats.attempts++;
  }

  resolveMelee(entity, ability, attackId, attackYaw) {
    if (ability.nullifiesInfinity) entity.spearGuardTimer = 0.45;
    const target = this.meleeTarget(entity, ability.range);
    if (target && attackYaw === undefined) entity.yaw = Math.atan2(target.x - entity.x, target.z - entity.z);
    if (this.practice && this.trainingTask?.id==='dodge' && target?.isPlayer &&
      Math.hypot(target.x-entity.x,target.z-entity.z)>ability.range && this.elapsed-(target.lastDashAt??-Infinity)<.7) this.training.dodged++;
    const facing = target && (attackYaw === undefined ||
      ((target.x-entity.x)*Math.sin(attackYaw)+(target.z-entity.z)*Math.cos(attackYaw))/(Math.hypot(target.x-entity.x,target.z-entity.z)||1) >= .2);
    if (target && facing && Math.hypot(target.x - entity.x, target.y - entity.y, target.z - entity.z) <= ability.range) {
      const landed = this.damage(target, ability.damage, entity, ability.id, attackId);
      if (landed && ability.id === "divergentFist" && !entity.cursedEnergyConfiscated) {
        this.soulDelays ||= [];
        this.soulDelays.push({ source: entity, target, remaining: .28, attackId });
      }
      if (ability.id === "yujiBlackFlash") entity.blackFlashUntil = 0;
    } else this.confirmAttack(entity,'miss');
    this.burst(entity.x, entity.y + CHEST, entity.z, ability.color, 10, 3);
  }

  tryBasicAttack(entity) {
    if (this.timeStop > 0) return false;
    if (this.hitStop > 0 && this.isBorrowedBattle()) return false;
    if (entity && this.inVoidStun(entity)) return false;
    if (this.raid?.trial > 0 || entity?.raidCast || (entity?.charId === 'higuruma' && entity.guardTimer > 0)) return false;
    if (entity && this.borrowedSkillLocked(entity)) return false;
    if (!entity?.alive || entity.stun > 0 || this.state !== "playing" || (entity.basicCooldown || 0) > 0) return false;
    if (!this.isBorrowedBattle() && (this.hitStop > 0 || entity.meleeAttack || entity.meleeRecovery > 0)) {
      entity.queuedInput = { index: 'basic', expires: this.elapsed + .25 };
      return false;
    }
    entity.basicCooldown = 0.65;
    this.recordAttack(entity);
    this.castMelee(entity, { id: "basicAttack", damage: 6, range: 3.2, color: entity.color });
    return true;
  }

  canUseSimpleDomain(entity) {
    if (this.isBorrowedBattle()) return false;
    return Boolean(entity && !entity.summon && SIMPLE_DOMAIN.characters.includes(entity.charId));
  }

  castAttraction(entity, ability) {
    const dir = this.fireDir(entity);
    const target = this.enemyList(entity).find((e) => e.alive && !e.summon);
    const distance = target ? Math.min(ability.range, Math.hypot(target.x - entity.x, target.z - entity.z)) : 15;
    const center = { x: entity.x + dir.x * distance, y: entity.y + CHEST + (dir.y || 0) * distance, z: entity.z + dir.z * distance };
    this.burst(center.x, center.y, center.z, ability.color, 65, 5);
    this.sceneHits.push({ x: center.x, z: center.z, radius: ability.radius });
    // A stationary Blue makes the attraction center visible in the orb renderer.
    this.projectiles.push({ ownerId: entity.id, team: entity.team, abilityId: ability.id,
      shape: "orb", ...center, vx: 0, vy: 0, vz: 0, radius: 1.1, damage: 0, power: 1,
      knock: 0, life: 0.6, maxLife: 0.6, color: ability.color, core: "#ffffff", alive: true, visualOnly: true });
    for (const enemy of this.enemyList(entity)) {
      const dist = Math.hypot(enemy.x - center.x, enemy.y + CHEST - center.y, enemy.z - center.z);
      if (dist > ability.radius) continue;
      if (enemy.spearGuardTimer > 0 && dist <= 2.1) continue;
      const dx = center.x - enemy.x, dz = center.z - enemy.z;
      const len = Math.hypot(dx, dz) || 1;
      if (this.damage(enemy, ability.damage, entity, ability.id)) {
        enemy.vx += dx / len * 12; enemy.vz += dz / len * 12;
      }
    }
    this.emit("sfx", { kind: "ability", ability: "blue" });
  }

  trySimpleDomain(entity) {
    if (this.timeStop > 0 || this.hitStop > 0) return false;
    if (this.raid?.trial > 0 || entity?.cursedEnergyConfiscated) return false;
    if (!this.canUseSimpleDomain(entity) || !entity.alive || this.state !== "playing" || entity.stun > 0) return false;
    if (this.inVoidStun(entity) && this.domains.some(d => d.alive && d.type === 'void' && d.tickSerial > 0 && !this.sureHitContested(d, entity))) return false;
    if (entity.simpleDomainTimer > 0) return false;
    const infinite = this.practice && this.practiceInfinite;
    if (!infinite && entity.simpleDomainCooldown > 0) { this.emit("sfx", { kind: "empty" }); return false; }
    entity.simpleDomainTimer = SIMPLE_DOMAIN.duration;
    entity.simpleDomainIntegrity = SIMPLE_DOMAIN.integrity;
    entity.simpleDomainCooldown = infinite ? 0.25 : SIMPLE_DOMAIN.cooldown;
    this.burst(entity.x, entity.y + 0.1, entity.z, SIMPLE_DOMAIN.color, 16, 3);
    this.announce(`${entity.name} · 新阴流 简易领域`, SIMPLE_DOMAIN.color, 1.3);
    return true;
  }

  castGuard(entity, ability) {
    if (ability.id === 'wickerBasket') entity.wickerBasketTimer = 4;
    entity.guardTimer = ability.id === "bodyGuard" ? 1.2 : 4;
    entity.guardKind = ability.id;
    this.announce(`${entity.name} · ${ability.label}`, ability.color, 1);
  }

  castHeal(entity, ability) {
    entity.abilityUses ||= {};
    entity.abilityUses[ability.id] = (entity.abilityUses[ability.id] || 0) + 1;
    entity.battleStats ||= { attempts: 0, landed: new Set(), damage: 0, taken: 0, heals: 0 };
    entity.battleStats.heals++;
    entity.hp = clamp(entity.hp + ability.heal, 0, entity.maxHp);
    this.damageTexts.push({ x: entity.x, y: entity.y + 2, z: entity.z, text: `+${ability.heal}`, color: "#8dffd4", life: 0.8, maxLife: 0.8 });
  }

  comboEligible(entity, abilityId) {
    const ab = CHARACTERS[entity.charId]?.abilities?.find((a) => a.id === abilityId);
    return Boolean(ab && (ab.type === "orb" || ab.type === "beam"));
  }

  inVoidStun(entity) {
    if (this.isBorrowedBattle()) return false;
    if (entity.simpleDomainTimer > 0) return false;
    return this.domains.some((d) => {
      if (!d.alive || d.type !== "void" || d.ownerId === entity.id || CHARACTERS[entity.charId]?.cursedEnergy === 0 || this.sureHitContested(d, entity) || entity.wickerBasketTimer > 0) return false;
      const owner = this.entities.find(e => e.id === d.ownerId);
      if (owner && Math.hypot(entity.x-owner.x, entity.y-owner.y, entity.z-owner.z) <= 2.1) return false;
      const dx = entity.x - d.x;
      const dy = (entity.y + CHEST) - d.y;
      const dz = entity.z - d.z;
      return dx * dx + dy * dy + dz * dz <= d.radius * d.radius;
    });
  }

  matchCombo(entity, abilityId) {
    const combos = CHARACTERS[entity.charId].combos || [];
    if (!combos.length) return null;
    const now = this.elapsed;
    if (now - entity.lastComboAt > 1.3) entity.comboChain = [];
    entity.lastComboAt = now;
    entity.comboChain.push(abilityId);
    const maxLen = combos.reduce((m, c) => Math.max(m, c.seq.length), 1);
    if (entity.comboChain.length > maxLen) entity.comboChain = entity.comboChain.slice(-maxLen);
    for (const c of combos) {
      const n = c.seq.length;
      if (entity.comboChain.length < n) continue;
      let ok = true;
      for (let i = 0; i < n; i += 1) {
        if (entity.comboChain[entity.comboChain.length - n + i] !== c.seq[i]) { ok = false; break; }
      }
      if (ok) { entity.comboChain = []; return c; }
    }
    return null;
  }

  tryDash(entity, dirX, dirY = 0, dirZ = 0) {
    if (this.timeStop > 0 || this.hitStop > 0) return false;
    if (entity && this.inVoidStun(entity)) return false;
    if (this.raid?.trial > 0 || entity?.raidCast) return false;
    if (entity && this.borrowedSkillLocked(entity)) return false;
    if (!entity?.alive || entity.stun > 0 || this.state !== "playing") return false;
    if (entity.dashCooldown > 0) return false;
    const cfg = CHARACTERS[entity.charId].dash;
    let dx = dirX;
    let dy = dirY;
    if (CHARACTERS[entity.charId]?.grounded) dy = 0;
    if (this.groundDuel) dy = 0;
    let dz = dirZ;
    if (dx === null || dx === undefined || Math.hypot(dx, dy, dz) < 0.1) {
      const d = this.aimDir(entity);
      dx = d.x;
      dz = d.z;
      dy = 0;
    }
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
    entity.dashVx = dx * cfg.speed;
    entity.lastDashAt = this.elapsed;
    if (!this.isBorrowedBattle()) { entity.meleeAttack = null; entity.meleeRecovery = 0; entity.queuedInput = null; }
    entity.dashVy = dy * cfg.speed;
    entity.dashVz = dz * cfg.speed;
    entity.dashTimer = cfg.duration;
    entity.dashCooldown = cfg.cooldown;
    entity.invuln = Math.max(entity.invuln, cfg.invuln);
    entity.yaw = Math.atan2(dx, dz);
    this.burst(entity.x, entity.y + CHEST, entity.z, entity.color, 18, 6, { x: -dx, z: -dz });
    this.emit("sfx", { kind: "dash" });
    return true;
  }

  castOrb(entity, ability, dir) {
    const count = ability.count || 1;
    const spread = ability.spread || 0.18;
    const baseAngle = Math.atan2(dir.x, dir.z);
    const elev = Math.asin(clamp(dir.y, -1, 1));
    const vy = dir.y * ability.speed;
    const horiz = Math.cos(elev) * ability.speed;
    for (let i = 0; i < count; i += 1) {
      const offset = count > 1 ? (i - (count - 1) / 2) * spread : 0;
      const a = baseAngle + offset;
      const dx = Math.sin(a);
      const dz = Math.cos(a);
      const dist = ENTITY_RADIUS + ability.radius + 0.2;
      this.projectiles.push({
        ownerId: entity.id,
        attackId: entity.attackSerial,
        team: entity.team,
        abilityId: ability.id,
        shape: ability.shape,
        x: entity.x + dx * dist,
        y: entity.y + CHEST + dir.y * dist,
        z: entity.z + dz * dist,
        vx: dx * horiz,
        vy,
        vz: dz * horiz,
        radius: ability.radius,
        damage: ability.damage,
        power: ability.power || 1,
        knock: Number.isFinite(ability.knock) ? ability.knock : 0,
        life: ability.life,
        maxLife: ability.life,
        color: ability.color,
        core: ability.core,
        alive: true
      });
    }
    entity.vx -= dir.x * 2.5;
    entity.vz -= dir.z * 2.5;
    entity.vy -= dir.y * 1.5;
    this.burst(entity.x + dir.x * 0.9, entity.y + CHEST, entity.z + dir.z * 0.9, ability.color, 10, 3.5, dir);
    this.emit("sfx", { kind: "ability", ability: ability.id });
  }

  castBeam(entity, ability, dir) {
    if (this.isStoryCombat()) this.sceneHits.push({ x: entity.x + dir.x * 16, z: entity.z + dir.z * 16, radius: 8 });
    for (const domain of this.domains) {
      if (this.isBorrowedBattle()) continue;
      if (!domain.alive || domain.team === entity.team || domain.openBarrier) continue;
      const tx = domain.x - entity.x;
      const tz = domain.z - entity.z;
      const forward = tx * dir.x + tz * dir.z;
      const side = Math.abs(tx * dir.z - tz * dir.x);
      if (forward < 0 || forward > ability.length || side > domain.radius) continue;
      domain.hp -= ability.id === "jacobsLadder" ? ability.damage * 2 : ability.damage;
      if (domain.hp <= 0) {
        this.recordDomainBreak(domain);
        domain.alive = false;
        this.enterBurnout(this.entities.find((e) => e.id === domain.ownerId));
        this.announce("领域被击破", ability.color, 1.2);
      }
    }
    this.syncDomainCaptives();
    this.beams.push({
      ownerId: entity.id,
      attackId: entity.attackSerial,
      team: entity.team,
      abilityId: ability.id,
      shape: ability.shape,
      x: entity.x,
      y: entity.y + CHEST,
      z: entity.z,
      dx: dir.x,
      dy: dir.y,
      dz: dir.z,
      length: ability.length,
      width: ability.width,
      life: ability.life,
      maxLife: ability.life,
      damage: ability.damage,
      knock: Number.isFinite(ability.knock) ? ability.knock : 0,
      color: ability.color,
      core: ability.core,
      hit: new Set(),
      alive: true
    });
    this.flash = Math.max(this.flash, 0.55);
    this.screenShake = Math.max(this.screenShake, 1.4);
    this.hitStop = Math.max(this.hitStop, 0.06);
    this.burst(entity.x + dir.x * 1.2, entity.y + CHEST, entity.z + dir.z * 1.2, ability.color, 34, 9, dir);
    this.emit("sfx", { kind: "ability", ability: ability.id });
    this.announce(`${CHARACTERS[entity.charId].name} · ${ability.label}`, ability.color, 1.2);
    if (!this.isStoryCombat()) {
      this.queueDialogue(entity.charId, entity.charId === "gojo" ? "这一击，可别移开视线。" : "让我看看你能撑到什么时候。", 2.4, 2);
    }
  }

  showAbilityArt(entity, ability) {
    const studentEra = ["gojoTeen", "gojoAwakened"].includes(entity.charId);
    const studentScene = ability.id === "purple" ? "purple" : ["red", "awakenedHeal"].includes(ability.id) ? "awakening" : "opening";
    const spec = studentEra && ["blue", "blueMax", "red", "purple", "awakenedHeal"].includes(ability.id)
      ? { art: HIDDEN_INVENTORY_ART[studentScene].file, compact: true, life: 0.8 }
      : ABILITY_ART[ability.id];
    if (!spec || (this.cutIn && this.cutIn.presentation !== "compact")) return;
    if (!entity.isPlayer && this.cutIn?.ownerPlayer) return;
    if (spec.compact) {
      const gap = entity.isPlayer ? 1.1 : 2.4;
      if (this.elapsed - this.lastSkillArtAt < gap) return;
      this.lastSkillArtAt = this.elapsed;
    }
    this.triggerCutIn(spec.art, spec.stop ?? 0, spec.flash ?? (spec.compact ? 0 : 0.65), spec.shake ?? (spec.compact ? 0 : 2.2), {
      life: spec.life ?? (spec.compact ? 0.75 : 1),
      presentation: "compact",
      ownerPlayer: entity.isPlayer
    });
  }

  // ---- cinematic cut-in (time-stop + skill art) ----
  triggerCutIn(art, stop = 0.4, flash = 0.6, shake = 2.0, opts = {}) {
    const life = opts.life || 1.0;
    this.cutIn = {
      art,
      life,
      maxLife: life,
      tint: opts.tint || null,
      shadow: opts.shadow || null,
      fit: opts.fit || "cover",
      presentation: opts.presentation || "full",
      ownerPlayer: opts.ownerPlayer || false
    };
    this.timeStop = Math.max(this.timeStop, stop);
    this.flash = Math.max(this.flash, flash);
    this.screenShake = Math.max(this.screenShake, shake);
  }

  recordDomainBreak(domain) {
    this.domainBreaks.push({
      x: domain.x, y: domain.y, z: domain.z, radius: domain.radius,
      type: domain.type, color: domain.color, age: 0, duration: 1.45
    });
  }

  castDomain(entity, ability) {
    if (this.ownsDomain(entity)) return;
    if (this.isStoryCombat()) this.sceneHits.push({ x: entity.x, z: entity.z, radius: 24 });
    const opposing = this.domains.find((d) => d.alive && d.team !== entity.team);
    const openClosedClash = opposing && ((ability.openBarrier && opposing.closedBarrier) || (ability.closedBarrier && opposing.openBarrier));
    if (opposing && !this.isBorrowedBattle() && (ability.domainPower ?? 2) !== (opposing.power ?? 2)) {
      const existingOwner = this.entities.find((e) => e.id === opposing.ownerId);
      const attackPower = ability.domainPower ?? 2;
      const defensePower = opposing.power ?? 2;
      if (attackPower >= defensePower) {
        this.recordDomainBreak(opposing);
        opposing.alive = false;
        this.enterBurnout(existingOwner);
      }
      if (attackPower <= defensePower) {
        this.recordDomainBreak({ x: ability.closedBarrier ? 0 : entity.x,
          y: ability.closedBarrier ? CHEST : entity.y + CHEST, z: ability.closedBarrier ? 0 : entity.z,
          radius: ability.radius, type: ability.id, color: ability.color });
        this.enterBurnout(entity);
      }
      if (attackPower < defensePower) opposing.life = Math.min(opposing.life, 2.5);
      if (attackPower > defensePower) {
        this.domains = this.domains.filter((d) => d.alive);
      } else if (attackPower === defensePower) {
        this.domains = this.domains.filter((d) => d.alive);
      }
      this.flash = Math.max(this.flash, 0.3);
      this.screenShake = Math.max(this.screenShake, 2.6);
      this.hitStop = Math.max(this.hitStop, 0.07);
      this.burst(entity.x, entity.y + CHEST, entity.z, entity.color, 44, 11);
      this.burst(opposing.x, opposing.y, opposing.z, opposing.color, 44, 11);
      this.emit("sfx", { kind: "domain", owner: "clash" });
      this.announce("领域对抗", "#f4f1ff", 1.5);
      this.triggerCutIn("domain-clash", 0.22, 0.3, 1.2, { presentation: "compact", life: .65 });
      if (this.isStoryCombat()) {
        this.queueStoryDialogue(entity, "clash", 2.7, 4);
        this.queueStoryDialogue(existingOwner, "clash", 2.7, 4);
      }
      if (attackPower <= defensePower) { this.syncDomainCaptives(); return; }
    }
    this.syncDomainCaptives();
    this.domains.push({
      ownerId: entity.id,
      team: entity.team,
      abilityId: ability.id,
      sureHitTechnique: ability.id === 'authenticLove' ? 'jacobsLadder' : ability.id,
      type: ability.id,
      closedBarrier: !!ability.closedBarrier,
      openBarrier: !!ability.openBarrier,
      exteriorX: entity.x, exteriorY: entity.y + CHEST, exteriorZ: entity.z,
      exteriorRadius: ability.exteriorRadius || 12,
      barrierDamagePerSecond: ability.barrierDamagePerSecond || 0,
      maintenanceDamageRatio: ability.maintenanceDamageRatio || 0,
      ownerDamage: 0,
      x: ability.closedBarrier ? 0 : entity.x,
      y: ability.closedBarrier ? CHEST : entity.y + CHEST,
      z: ability.closedBarrier ? 0 : entity.z,
      radius: ability.radius,
      life: ability.life,
      maxLife: ability.life,
      tick: ability.tick,
      tickTimer: 0.15,
      tickSerial: 0,
      visualTargets: [],
      damage: ability.damage,
      power: ability.domainPower ?? 2,
      hp: 40,
      color: ability.color,
      core: ability.core,
      alive: true
    });
    this.syncDomainCaptives();
    if (ability.id === 'authenticLove') { delete entity.domainKatanaIndex; entity.domainSwordUses = 0; }
    // A winning domain still opens, but must not cover the losing barrier's fracture.
    if (opposing) {
      if (openClosedClash && !this.isBorrowedBattle()) this.announce("领域对抗 · 必中抵消，外侧斩击侵蚀结界", "#f4f1ff", 2.5);
      return;
    }
    this.flash = Math.max(this.flash, 0.6);
    this.screenShake = Math.max(this.screenShake, 2.2);
    this.emit("sfx", { kind: "domain", owner: entity.charId });
    this.announce(`领域展开 · ${ability.label}`, ability.color, 1.6);
    if (entity.charId === "yuta") this.triggerCutIn("yuta-authentic-love", 0.42, 0.66, 2.4, { presentation: "compact", life: 1.3 });
    else if (entity.charId === "gojo" || entity.charId === "yutaGojo") this.triggerCutIn("gojo-void", 0.42, 0.66, 2.4, { presentation: "compact" });
    else if (entity.charId.startsWith("sukuna")) this.triggerCutIn("sukuna-domain", 0.42, 0.66, 2.4, { presentation: "compact" });
    if (!this.isStoryCombat()) this.queueDialogue(entity.charId, `领域展开——${ability.label}。`, 3.0, 5);
  }

  castSummon(entity, ability) {
    beginCombatMotion(entity, ability.id, this.elapsed);
    const existing = this.entities.find((e) => e.summon && e.ownerId === entity.id && e.alive);
    if (existing) existing.life = 0;
    // the difficulty decides how strong Mahoraga is
    const maha = (DIFFICULTY[this.difficulty] || DIFFICULTY.normal).mahoraga || {};
    const rika = ability.id === "rika";
    const hp = rika ? ability.hp : (maha.hp ?? ability.hp ?? 72);
    const m = {
      id: `${ability.id}_${entity.id}`,
      charId: rika ? "rika" : "mahoraga",
      name: rika ? "里香" : "魔虚罗",
      color: rika ? "#d9c8ff" : "#e4c866",
      aura: rika ? 0xd9c8ff : 0xe4c866,
      team: entity.team,
      summon: true,
      ownerId: entity.id,
      adapt: {},
      life: rika ? ability.life : (maha.life ?? ability.life ?? 24),
      contactAt: -10,
      shotAt: -10,
      isPlayer: false,
      x: clamp(entity.x + 3, -ARENA.half, ARENA.half),
      z: clamp(entity.z + 3, -ARENA.half, ARENA.half),
      y: entity.y,
      vy: 0,
      yaw: 0,
      hp,
      maxHp: hp,
      damageScale: rika ? 1.15 : (maha.dmg ?? 1),
      vx: 0,
      vz: 0,
      speed: rika ? 7.2 : (maha.speed ?? ability.speed ?? 6.6),
      alive: true,
      moving: true,
      sprinting: false,
      moveInput: { x: 0, z: 0, y: 0 },
      aim: { x: entity.x, z: entity.z },
      aiAlt: 0,
      aiAltTimer: 0,
      cooldowns: [],
      charge: 0,
      domainCharge: 0,
      invuln: 0,
      hurtAt: -10,
      dashCooldown: 0,
      dashTimer: 0,
      dashVx: 0,
      dashVy: 0,
      dashVz: 0,
      comboChain: [],
      lastComboAt: -10,
      aiTimer: 0,
      aiStrafe: 1,
      aiCastCd: 0,
      aiDashTimer: 0,
      aiWaitStarted: 0,
      slow: 0
    };
    this.entities.push(m);
    this.flash = Math.max(this.flash, 0.45);
    this.screenShake = Math.max(this.screenShake, 1.6);
    this.emit("sfx", { kind: "thunderHit" });
    this.announce(`${m.name} 参战`, m.color, 1.5);
    this.burst(m.x, m.y + CHEST, m.z, "#e4c866", 44, 9);
    if (!this.isStoryCombat()) this.queueDialogue(entity.charId, rika ? "里香，帮我。" : "魔虚罗，适应他。", 2.5, 4);
  }

  updateSummon(dt) {
    for (const m of this.entities) {
      if (!m.summon || !m.alive || m.support || m.companion) continue;
      m.life -= dt;
      if (m.life <= 0) { this.removeSummon(m); continue; }
      const target = this.entities.find((e) => e.alive && e.team !== m.team && !e.summon);
      if (!target) { this.setMove(m, 0, 0, 0); m.moving = false; continue; }
      const dx = target.x - m.x;
      const dz = target.z - m.z;
      const dy = target.y - m.y;
      const dist = Math.hypot(dx, dz) || 1;
      m.aim.x = target.x;
      m.aim.z = target.z;
      let mx = 0;
      let mz = 0;
      if (dist > 3.2) { mx = dx / dist; mz = dz / dist; }
      let my = 0;
      if (Math.abs(dy) > 1.5) my = clamp(dy * 0.28, -0.85, 0.85);
      this.setMove(m, mx, mz, my);
      m.moving = Math.hypot(mx, mz) > 0.05;

      const d3 = Math.hypot(dx, dy, dz);
      const mDmg = m.damageScale || 1;
      if (d3 < ENTITY_RADIUS * 2 + 0.35 && this.elapsed - m.contactAt > 1.1) {
        m.contactAt = this.elapsed;
        m.yaw = Math.atan2(dx, dz);
        beginCombatMotion(m, "mahoragaContact", this.elapsed);
        this.damage(target, 6 * mDmg, m, "mahoragaContact");
        this.burst(target.x, target.y + CHEST, target.z, "#e4c866", 12, 5);
      }
      if (m.charId === "mahoraga" && this.elapsed - m.shotAt > 1.3 && dist < 28) {
        m.shotAt = this.elapsed;
        const d = this.fireDir(m);
        m.yaw = Math.atan2(d.x, d.z);
        beginCombatMotion(m, "mahoragaSlash", this.elapsed);
        this.projectiles.push({
          ownerId: m.id,
          team: m.team,
          abilityId: "mahoragaSlash",
          shape: "blade",
          x: m.x + d.x * 1.3,
          y: m.y + CHEST,
          z: m.z + d.z * 1.3,
          vx: d.x * 30,
          vy: d.y * 30,
          vz: d.z * 30,
          radius: 0.5,
          damage: 9 * mDmg,
          power: 2,
          knock: 6,
          life: 1.5,
          maxLife: 1.5,
          color: "#e4c866",
          core: "#fff9d7",
          alive: true
        });
        this.burst(m.x, m.y + CHEST, m.z, "#e4c866", 8, 4, d);
      }
    }
  }

  removeSummon(m) {
    if (!m.alive) return;
    m.alive = false;
    this.burst(m.x, m.y + CHEST, m.z, "#e4c866", 46, 10);
    this.announce(`${m.name} 退场`, m.color, 1.2);
  }

  // ---- damage ----
  confirmAttack(entity,kind,amount=0) {
    if (!entity) return;
    const labels={hit:`命中 · ${amount}`,heavy:`重击 · ${amount}`,guard:`被格挡 · ${amount}`,blackFlash:`黑闪 · ${amount}`,miss:'挥空',dodge:'被闪避',blocked:'术式阻隔',practice:'命中 · 无敌陪练'};
    const colors={hit:'#ffe39a',heavy:'#ffd06b',guard:'#9bd5ff',blackFlash:'#ff5e70',miss:'#aab5c3',dodge:'#aab5c3',blocked:'#9bd5ff',practice:'#ffe39a'};
    entity.attackFeedback={kind,text:labels[kind],color:colors[kind],until:this.elapsed+.65};
  }

  practiceImmortal(entity) {
    return this.practice && (entity.isPlayer ? this.practiceInvincible
      : entity.team !== this.player()?.team && this.practiceEnemyInvincible);
  }

  damage(target, amount, source, abilityId = null, attackId = source?.attackSerial) {
    if (this.isBorrowedBattle() && this.borrowedBattle?.phase !== "combat") return;
    // A simultaneous leftover hit must not overwrite a result already settled this frame.
    if (this.state !== "playing") return;
    const domainHit = this.domains.some(d => d.alive && d.ownerId === source?.id && d.abilityId === abilityId) || CHARACTERS[source?.charId]?.abilities.find((ability) => ability.id === abilityId)?.type === "domain";
    if (!target?.alive || target.support) return;
    if (target.invuln > 0 && !domainHit) {
      if (target.isPlayer && target.dashTimer > 0 && this.practice) this.training.dodged++;
      if (target.dashTimer > 0) this.confirmAttack(source,'dodge');
      return;
    }
    if (raidDamageBlocked(this, target, source, abilityId)) return;
    if (isShibuyaStory(this) && this.shibuya?.phase !== "combat") return;
    // Practice immortality preserves valid contact and its mechanics, only preventing HP loss.
    const practiceImmortal = this.practiceImmortal(target);
    const profile = this.getDifficultyProfile();
    const sourceAbility = source && abilityId
      ? CHARACTERS[source.charId]?.abilities.find((ability) => ability.id === abilityId)
      : null;
    if (target.infinityTimer > 0 && source?.charId.startsWith("toji") && !sourceAbility?.nullifiesInfinity) { this.confirmAttack(source,'blocked'); return; }
    if (sourceAbility?.nullifiesInfinity && target.charId.startsWith("gojo")) {
      target.infinityTimer = 0;
      target.burnout = Math.max(target.burnout, 1.5);
      this.announce("天逆鉾 · 接触解除术式", "#c4c9d4", 1);
    }
    // 领域是持续伤害；若每一跳都回充，会在持续时间内把领域值重新充满，导致 AI 连续展开。
    const isDomainTick = domainHit;
    const borrowed = this.isBorrowedBattle();
    const physicalHit = sourceAbility?.physical || abilityId === "basicAttack";
    if (borrowed && target.charId === "yutaGojo" && physicalHit && !source?.amplification) {
      this.confirmAttack(source,'blocked');
      this.announce("无下限阻隔 · 需开启领域展延", "#bdeeff", 0.6);
      return;
    }
    if (isDomainTick && target.simpleDomainTimer > 0) return;
    const aiAttacker = source && !source.isPlayer && !source.companion && (this.mode === "single" || this.mode === "story");
    const aiTarget = (this.mode === "single" || this.mode === "story") && !target.isPlayer && !target.summon;
    let dealt = amount * (aiAttacker ? profile.damageMultiplier : 1);
    if (aiAttacker && this.legacyGojoAi(source)) {
      const gojoAiTuning = SUKUNA_VS_GOJO_AI_HANDICAP.aiTuning[this.difficulty];
      dealt *= gojoAiTuning?.damageMultiplier ?? SUKUNA_VS_GOJO_AI_HANDICAP.damage;
    }
    if (aiTarget) dealt *= profile.damageTakenMultiplier;

    // 黑闪：任意一方近身命中都有概率暴击（AI 也享受同样的演出）
    let blackFlash = abilityId === "yujiBlackFlash";
    if (!borrowed && !isDomainTick && !isRaid(this) && source?.charId !== 'yujiShibuya' && source && !source.cursedEnergyConfiscated && abilityId !== 'sukunaSoulReprisal' && source !== target && this.state === "playing" && !source.charId.startsWith("toji") && !["gojoTeen", "gojoAwakened"].includes(source.charId)) {
      const dist = Math.hypot(source.x - target.x, source.y - target.y, source.z - target.z);
      if ((abilityId === 'basicAttack' || sourceAbility?.canBlackFlash) && dist <= BLACK_FLASH.range && Math.random() < BLACK_FLASH.chance) blackFlash = true;
    }
    if (blackFlash && abilityId !== "yujiBlackFlash") dealt *= BLACK_FLASH.multiplier;
    if (target.charId.startsWith("mahito") && !(CHARACTERS[source?.charId]?.soulAware && !source?.cursedEnergyConfiscated) && abilityId !== 'sukunaSoulReprisal' && !isDomainTick) dealt *= .35;
    if (target.charId === "mahitoFinal" && !blackFlash && abilityId !== 'sukunaSoulReprisal') dealt *= .45;
    if (source?.charId.startsWith("mahito") && CHARACTERS[target.charId]?.sukunaVessel && abilityId === "soulTouch") dealt *= .4;
    // Ordinary guarding does not neutralize an expansion's guaranteed hit.
    if (borrowed && target.amplification && abilityId === "blue") dealt *= 0.5;
    const defense = guardFactor(target, physicalHit, isDomainTick);
    dealt *= defense;
    if (defense < 1) {
      this.damageTexts.push({ x: target.x, y: target.y+2, z: target.z, text: '格挡', color: '#bdeeff', life: .6, maxLife: .6 });
      if (this.practice && target.isPlayer) this.training.blocked++;
    }
    dealt = Math.max(1, Math.round(dealt));

    let adapted = false;
    if (target.charId === "mahoraga" && abilityId) {
      target.adapt = target.adapt || {};
      const stacks = target.adapt[abilityId] || 0;
      const red = Math.min(0.55, stacks * 0.18);
      dealt = Math.max(1, Math.round(dealt * (1 - red)));
      target.adapt[abilityId] = stacks + 1;
      adapted = stacks > 0;
    }
    let combo = null;
    if (source && abilityId && this.comboEligible(source, abilityId)) {
      combo = this.matchCombo(source, abilityId);
      if (combo) {
        dealt = Math.max(1, Math.round(dealt * (combo.damage || 1)));
        this.announce(`连招 · ${combo.name}`, "#ffd24a", 1.05);
        this.emit("sfx", { kind: "combo" });
        this.flash = Math.max(this.flash, 0.16);
      }
    }

    const actualDamage = practiceImmortal ? 0 : Math.min(target.hp, dealt);
    if (!practiceImmortal) target.hp = clamp(target.hp - dealt, 0, target.maxHp);
    target.battleStats ||= { attempts: 0, landed: new Set(), damage: 0, taken: 0, heals: 0 };
    target.battleStats.taken += actualDamage;
    const scorer=source?.summon ? this.entities.find(e=>e.id===source.ownerId) : source;
    if (scorer?.battleStats) { scorer.battleStats.damage += actualDamage; if (!source.summon && !isDomainTick && attackId) scorer.battleStats.landed.add(attackId); }
    if (!borrowed && !isDomainTick && target.meleeAttack) { target.meleeAttack = null; target.queuedInput = null; target.meleeRecovery = Math.max(target.meleeRecovery || 0, .12); }
    recordRaidHit(this, target, source, abilityId);
    if (target.raidCast?.ability.type === 'execution') {
      target.raidCast = null;
      this.announce('处刑人之剑 · 蓄势被打断', '#ff7583', 1);
    }
    if (!borrowed) for (const domain of this.domains) {
      if (!domain.alive || !domain.openBarrier || domain.ownerId !== target.id) continue;
      domain.ownerDamage += actualDamage;
      if (domain.ownerDamage >= target.maxHp * domain.maintenanceDamageRatio || target.hp <= 0) {
        domain.alive = false;
        this.enterBurnout(target);
        this.announce("宿傩受创 · 无法维持伏魔御厨子", domain.color, 1.5);
      }
    }
    if (borrowed && target.pendingCast) {
      if (target.pendingCast.ability.id === "purple") target.charge = Math.min(100, target.charge + 50);
      target.pendingCast = null;
      target.combatAction = null;
      target.cooldowns[2] = Math.max(target.cooldowns[2], 3);
      this.announce("施法被打断", "#ff7583", 1);
    }
    if (abilityId === "cursedSpeech") {
      target.stun = Math.max(target.stun || 0, 0.75);
      target.combatAction = null;
    }
    target.hurtAt = this.elapsed;
    target.invuln = 0.06;
    const heavy=physicalHit && (/heavy|Heavy|BlackFlash/.test(abilityId||'') || dealt>=16);
    if (!isDomainTick) {
      this.confirmAttack(source,blackFlash?'blackFlash':defense<1?'guard':practiceImmortal?'practice':heavy?'heavy':'hit',actualDamage);
      if (practiceImmortal && source?.attackFeedback) source.attackFeedback.text=`${blackFlash?'黑闪':defense<1?'被格挡':'命中'} · 无敌陪练`;
      if (!blackFlash) this.emit('sfx',{kind:defense<1?'guardImpact':'impact',ultimate:heavy,attackType:abilityId});
      if (physicalHit && !borrowed && defense===1) this.hitStop=Math.max(this.hitStop,heavy?.055:.025);
    }
    const label = practiceImmortal ? (blackFlash?'黑闪 · 无敌':defense<1?'格挡 · 无敌':'命中 · 无敌') : blackFlash ? `-${dealt} 黑闪` : (combo ? `-${dealt} ${combo.name}` : (adapted ? `-${dealt} 适应` : `-${dealt}`));
    this.damageTexts.push({
      x: target.x, y: target.y + 2.0, z: target.z,
      text: label,
      color: blackFlash ? "#ff4058" : (combo ? "#ffd24a" : (target === this.player() ? "#ff6b7f" : (adapted ? "#e2c760" : "#ffffff"))),
      life: 0.8, maxLife: 0.8
    });
    this.burst(target.x, target.y + CHEST, target.z, "#ffd0d8", 14, 5);
    this.screenShake = Math.max(this.screenShake, blackFlash ? 2.0 : 0.35);
    if (blackFlash) {
      if (this.practice && source?.isPlayer) this.training.blackFlash++;
      this.blackFlashCount = (this.blackFlashCount || 0) + 1;
      this.announce("黑闪", "#ff334b", 1.05);
      this.emit("sfx", { kind: "blackFlash" });
      this.flash = Math.max(this.flash, 0.5);
      this.hitStop = Math.max(this.hitStop, 0.1);
      this.burst(target.x, target.y + CHEST, target.z, "#ff263f", 40, 10);
      this.burst(target.x, target.y + CHEST, target.z, "#120006", 28, 8);
    }
    // screen-edge clash frame pulse (only when the player is involved)
    if (source?.isPlayer || target.isPlayer) {
      const gain = dealt / 45 + (blackFlash ? 0.45 : 0) + (combo ? 0.22 : 0);
      this.hitPulse = Math.min(1, this.hitPulse + gain);
      this.hitPulseColor = target.isPlayer ? "#e0233f" : "#ecc25a";
    }
    if (source && !isDomainTick) {
      const beforeC = source.charge;
      const beforeD = source.domainCharge;
      source.charge = clamp(source.charge + (borrowed ? (abilityId === "blue" ? 10 : 18) : 20), 0, 100);
      source.domainCharge = clamp(source.domainCharge + 14, 0, 100);
      if (beforeC < 100 && source.charge >= 100 && CHARACTERS[source.charId]?.abilities.some(a => a.needsCharge)) this.announce("奥义已就绪", "#ffd24a", 1.0);
      if (beforeD < 100 && source.domainCharge >= 100 && CHARACTERS[source.charId]?.abilities.some((a) => a.needsDomain)) this.announce("领域已就绪", "#b05cff", 1.0);
      target.domainCharge = clamp(target.domainCharge + 9, 0, 100);
    }
    const lowKey = `${target.charId}_low`;
    if (target.hp > 0 && target.hp <= 38 && !this.dialogueFlags.has(lowKey)) {
      this.dialogueFlags.add(lowKey);
      const line = this.storyDialogueLine(target.charId, "lowHealth")
        || (target.charId === "gojo" ? "还没结束呢。" : "这样才有意思。");
      this.queueDialogue(target.charId, line, 2.3, 1);
    }
    if (target.hp <= 0) {
      if (this._meleeDeaths) this._meleeDeaths.add(target);
      else this.kill(target);
    }
    return true;
  }

  kill(target) {
    if (this.state !== "playing") return;
    if (!target.alive) return;
    target.alive = false;
    if (target.dummy) this.dummyRespawn = 2.5;
    this.burst(target.x, target.y + CHEST, target.z, target.aura, 70, 12);
    for (let i = 0; i < 16; i += 1) {
      this.particles.push({
        x: target.x + rand(-0.4, 0.4), z: target.z + rand(-0.4, 0.4), y: target.y + rand(0.2, 2),
        vx: rand(-6, 6), vz: rand(-6, 6), vy: rand(2, 8),
        size: rand(1.0, 2.6), color: Math.random() > 0.5 ? target.color : "#ffffff",
        life: rand(0.7, 1.3), gravity: 14, drag: 0.94, shard: true
      });
    }
    if (target.summon) {
      this.announce(`${target.name} 退场`, target.color, 1.2);
      this.emit("sfx", { kind: "defeat" });
      return;
    }
    this.announce(`${target.name} 退场`, target.color, 1.4);
    this.emit("sfx", { kind: "defeat" });
    const alive = this.entities.filter((e) => e.alive && !e.summon);
    if (this.practice || this._settlingMelee) return;
    if (alive.length <= 1) {
      this.winner = alive[0] || null;
      this.finishEnd();
    }
  }

  finishEnd() {
    if (this.state === "ended") return;
    this.state = "ended";
    const player = this.player(), stats = player?.battleStats;
    this.resultStats = { seconds: this.elapsed, damage: stats?.damage || 0, taken: stats?.taken || 0,
      accuracy: stats?.attempts ? Math.round(stats.landed.size / stats.attempts * 100) : 0,
      noHeal: !(stats?.heals > 0), won: this.winner === player };
    this.resultStats.challengeComplete = this.resultStats.won &&
      (this.challenge === 'noHeal' ? this.resultStats.noHeal : this.challenge === 'lowDamage' ? this.resultStats.taken <= 25 : false);
    this.resultStats.record = saveBattleRecord(this, this.resultStats);
    // 结算后不再推进领域生命周期；主动清理，避免五条悟倒地时无量空处停在最后一帧。
    this.projectiles = [];
    this.beams = [];
    this.domains = [];
    this.syncDomainCaptives();
    this.domainBreaks = [];
    this.particles = [];
    for (const entity of this.entities) entity.simpleDomainTimer = 0;
    this.emit("sfx", { kind: "win" });
    const winnerId = this.winner?.charId || "gojo";
    const line = !this.winner ? "双方同时倒下 · 平局。" : this.mode === "story" ? (this.winner?.isPlayer ? "击败对手 · 剧情挑战完成。" : "挑战失败 · 再次迎战。") : this.storyDialogueLine(winnerId, "ending")
      || (this.winner?.charId === "gojo" ? "这场胜负，已经定了。" : "到此为止。");
    this.queueDialogue(winnerId, line, 2.5, 4);
  }

  // ---- projectiles / beams / domains ----
  updateProjectiles(dt) {
    // 1) move
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.life -= dt;
      p.prevX = p.x;
      p.prevY = p.y;
      p.prevZ = p.z;
      p.x += p.vx * dt;
      p.y += (p.vy || 0) * dt;
      p.z += p.vz * dt;
      if (p.life <= 0 || Math.abs(p.x) > ARENA.half + 6 || Math.abs(p.z) > ARENA.half + 6 || p.y < -4 || p.y > FLIGHT.maxAlt + 14) {
        p.alive = false;
      }
    }

    // 2) projectile vs projectile (same rules as the original: equal power trade, otherwise breakthrough)
    this.resolveProjectileClashes();

    // 3) projectile vs entity
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      const px0 = p.prevX ?? p.x;
      const py0 = p.prevY ?? p.y;
      const pz0 = p.prevZ ?? p.z;
      const sx = p.x - px0;
      const sy = p.y - py0;
      const sz = p.z - pz0;
      const contacts = [];
      for (const e of this.entities) {
        if (!e.alive || e.team === p.team) continue;
        const spear = e.spearGuardTimer > 0;
        if (p.visualOnly && !spear) continue;
        const t = sphereContactTime(projectileStart(p), p, { x:e.x, y:e.y+CHEST, z:e.z }, p.radius + (spear ? 1 : ENTITY_RADIUS));
        if (t !== null) contacts.push({ e, t, spear });
      }
      contacts.sort((a,b) => a.t-b.t || a.e.id.localeCompare(b.e.id));
      for (const { e, t, spear } of contacts) {
          const cx = px0 + sx*t, cy = py0 + sy*t, cz = pz0 + sz*t;
          if (spear) {
            p.alive = false;
            this.burst(cx, cy, cz, "#c4c9d4", 14, 3);
            this.announce("天逆鉾 · 接触消除术式", "#c4c9d4", 0.8);
            break;
          }
          const len = Math.hypot(p.vx, p.vy || 0, p.vz) || 1;
          const kb = (this.isBorrowedBattle() && e.amplification && p.abilityId === "blue") ? 0.25
            : (this.mode === "single" && !e.isPlayer && !e.summon) ? DIFFICULTY[this.difficulty].knockbackTakenMultiplier : 1;
          const owner = this.entities.find((x) => x.id === p.ownerId);
          if (this.damage(e, p.damage, owner, p.abilityId, p.attackId)) {
            e.vx += (p.vx / len) * p.knock * kb;
            e.vz += (p.vz / len) * p.knock * kb;
          }
          if (this.isStoryCombat()) this.sceneHits.push({ x: cx, z: cz, radius: 6 });
          this.burst(cx, cy, cz, p.color, 16, 5.5);
          p.alive = false;
          break;
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  resolveEntityCollisions() {
    for (let i = 0; i < this.entities.length; i += 1) {
      const a = this.entities[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.entities.length; j += 1) {
        const b = this.entities[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dy, dz);
        const min = ENTITY_RADIUS * 2;
        if (dist >= min) continue;
        // Identical positions still need a deterministic horizontal separation.
        const nx = dist > 1e-8 ? dx / dist : (a.id < b.id ? 1 : -1);
        const ny = dist > 1e-8 ? dy / dist : 0;
        const nz = dist > 1e-8 ? dz / dist : 0;
        const overlap = min - dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        a.z -= nz * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        b.z += nz * overlap * 0.5;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
        if (rel < 0) {
          const imp = -rel * 0.62;
          a.vx -= nx * imp;
          a.vy -= ny * imp;
          a.vz -= nz * imp;
          b.vx += nx * imp;
          b.vy += ny * imp;
          b.vz += nz * imp;
        }
      }
    }
  }

  resolveProjectileClashes() {
    const pairs = [];
    for (let i = 0; i < this.projectiles.length; i++) {
      const a = this.projectiles[i];
      for (let j = i + 1; j < this.projectiles.length; j++) {
        const b = this.projectiles[j];
        if (!a.alive || !b.alive || a.team === b.team || a.visualOnly || b.visualOnly) continue;
        const t = projectileClashTime(a, b);
        if (t !== null) pairs.push({ a, b, t });
      }
    }
    pairs.sort((a, b) => a.t - b.t);
    for (const { a, b } of pairs) {
        if (!a.alive || !b.alive) continue;
        const t = projectileClashTime(a, b);
        if (t === null) continue;
        // A projectile consumed by a nearer fighter cannot clash farther along its path.
        const hitsFirst = (p) => this.entities.some((e) => {
          if (!e.alive || e.team === p.team) return false;
          const hit = sphereContactTime(projectileStart(p), p, { x:e.x, y:e.y+CHEST, z:e.z }, p.radius + (e.spearGuardTimer > 0 ? 1 : ENTITY_RADIUS));
          return hit !== null && hit <= t;
        });
        if (hitsFirst(a) || hitsFirst(b)) continue;
        const a0 = projectileStart(a), b0 = projectileStart(b);
        const ix = (a0.x + (a.x-a0.x)*t + b0.x + (b.x-b0.x)*t) * .5;
        const iy = (a0.y + (a.y-a0.y)*t + b0.y + (b.y-b0.y)*t) * .5;
        const iz = (a0.z + (a.z-a0.z)*t + b0.z + (b.z-b0.z)*t) * .5;
        const equalPower = a.power === b.power;
        this.burst(ix, iy, iz, a.color, equalPower ? 28 : 18, equalPower ? 8 : 6.5);
        this.burst(ix, iy, iz, b.color, equalPower ? 28 : 18, equalPower ? 8 : 6.5);
        this.screenShake = Math.max(this.screenShake, equalPower ? 1.3 : 0.85);
        this.flash = Math.max(this.flash, equalPower ? 0.45 : 0.26);
        this.emit("sfx", { kind: "cinematic", type: equalPower ? "clash" : "breakthrough" });

        const ownerA = this.entities.find((x) => x.id === a.ownerId);
        const ownerB = this.entities.find((x) => x.id === b.ownerId);
        if (ownerA) {
          ownerA.charge = clamp(ownerA.charge + 9, 0, 100);
          ownerA.domainCharge = clamp(ownerA.domainCharge + 11, 0, 100);
        }
        if (ownerB) {
          ownerB.charge = clamp(ownerB.charge + 9, 0, 100);
          ownerB.domainCharge = clamp(ownerB.domainCharge + 11, 0, 100);
        }

        if (equalPower) {
          a.alive = false;
          b.alive = false;
        } else {
          const stronger = a.power > b.power ? a : b;
          const weaker = stronger === a ? b : a;
          weaker.alive = false;
          stronger.damage = Math.max(4, Math.round(stronger.damage * 0.58));
          stronger.knock *= 0.7;
          stronger.radius *= 0.82;
          stronger.power = Math.max(1, stronger.power - 1);
        }
        this.announce(equalPower ? "术式相杀" : "术式突破", equalPower ? "#ffffff" : "#cfe0ff", 0.9);
        if (equalPower) {
          if (this.isStoryCombat()) {
            const speaker = (ownerA?.isPlayer ? ownerA : null) || (ownerB?.isPlayer ? ownerB : null) || ownerA || ownerB;
            this.queueStoryDialogue(speaker, "clash", 2.7, 3);
          } else if (!this.dialogueFlags.has("gojo_challenger")) {
            this.dialogueFlags.add("gojo_challenger");
            this.queueDialogue("gojo", "你才是挑战者。", 2.7, 3);
          }
        }
    }
  }

  updateBeams(dt) {
    for (const b of this.beams) {
      if (!b.alive) continue;
      b.life -= dt;
      const dirx = b.dx;
      const diry = b.dy;
      const dirz = b.dz;
      for (const e of this.entities) {
        if (!e.alive || e.team === b.team || b.hit.has(e.id)) continue;
        const relx = e.x - b.x;
        const rely = (e.y + CHEST) - b.y;
        const relz = e.z - b.z;
        const along = relx * dirx + rely * diry + relz * dirz;
        if (along < 0 || along > b.length) continue;
        const perpx = relx - dirx * along;
        const perpy = rely - diry * along;
        const perpz = relz - dirz * along;
        const perp = Math.hypot(perpx, perpy, perpz);
        if (perp <= b.width * 0.5 + ENTITY_RADIUS) {
          b.hit.add(e.id);
          const owner = this.entities.find((x) => x.id === b.ownerId);
          if (this.damage(e, b.damage, owner, b.abilityId, b.attackId)) {
            e.vx += dirx * b.knock;
            e.vz += dirz * b.knock;
          }
        }
      }
      if (b.life <= 0) b.alive = false;
    }
    this.beams = this.beams.filter((b) => b.alive);
  }

  updateDomains(dt) {
    for (const fracture of this.domainBreaks) fracture.age += dt;
    this.domainBreaks = this.domainBreaks.filter((fracture) => fracture.age < fracture.duration);
    if (this.isBorrowedBattle() && this.borrowedBattle?.phase === "combat" && this.storyTimer > 0) {
      for (const domain of this.domains) domain.life = this.storyTimer;
      return;
    }
    // The physical exterior is separate from a closed domain's expanded
    // interior. An open domain can slash that shell from the real world.
    for (const open of this.domains) {
      if (!open.alive || !open.openBarrier) continue;
      for (const closed of this.domains) {
        if (!closed.alive || !closed.closedBarrier || closed.team === open.team) continue;
        const distance = Math.hypot(closed.exteriorX - open.x, closed.exteriorY - open.y, closed.exteriorZ - open.z);
        if (distance - closed.exteriorRadius >= open.radius) continue;
        const exposed = clamp((open.radius - distance + closed.exteriorRadius) / (2 * closed.exteriorRadius), 0, 1);
        closed.hp -= open.barrierDamagePerSecond * exposed * Math.min(dt, Math.max(0, open.life));
        if (closed.hp <= 0) {
          closed.alive = false;
          this.recordDomainBreak(closed);
          this.enterBurnout(this.entities.find((entity) => entity.id === closed.ownerId));
          this.announce("外侧斩击 · 封闭结界崩塌", open.color, 1.5);
        }
      }
    }
    this.syncDomainCaptives();
    for (const d of this.domains) {
      if (!d.alive) continue;
      d.life -= dt;
      d.tickTimer -= dt;
      if (d.tickTimer <= 0) {
        d.tickTimer = d.tick;
        d.tickSerial = (d.tickSerial || 0) + 1;
        d.visualTargets = [];
        if (d.openBarrier) this.sceneHits.push({ x: d.x, z: d.z, radius: d.radius });
        const owner = this.entities.find((x) => x.id === d.ownerId);
        for (const e of this.entities) {
          if (!e.alive || (d.type === 'void' ? e.id === d.ownerId : e.team === d.team)) continue;
          if (d.closedBarrier && CHARACTERS[e.charId]?.cursedEnergy === 0) continue;
          if (this.sureHitContested(d, e)) continue;
          const dx = e.x - d.x;
          const dy = (e.y + CHEST) - d.y;
          const dz = e.z - d.z;
          if (dx * dx + dy * dy + dz * dz > d.radius * d.radius) continue;
          const touchImmune = d.type === 'void' && owner && Math.hypot(e.x-owner.x, e.y-owner.y, e.z-owner.z) <= 2.1;
          const basket = e.wickerBasketTimer > 0;
          d.visualTargets.push({ x: e.x, y: e.y, z: e.z, blocked: e.simpleDomainTimer > 0 || basket || touchImmune,
            slashKind: d.openBarrier ? CHARACTERS[e.charId]?.cursedEnergy === 0 ? "dismantle" : "cleave" : null });
          if (touchImmune || basket) continue;
          if (e.simpleDomainTimer > 0) {
            // Neutralize this sure-hit, including the tick that erodes the last
            // layer. Ordinary attacks still go through the normal damage path.
            e.simpleDomainIntegrity = Math.max(0, e.simpleDomainIntegrity - d.damage * Math.max(1, (d.power || 2) / 2));
            if (e.simpleDomainIntegrity <= 0) {
              e.simpleDomainTimer = 0;
              this.burst(e.x, e.y + 0.5, e.z, SIMPLE_DOMAIN.color, 20, 5);
              this.announce(`${e.name} · 简易领域被压碎`, SIMPLE_DOMAIN.color, 1);
            }
            continue;
          }
          if (d.type === 'void') {
            e.informationExposure = (e.informationExposure || 0) + d.tick;
            e.vx = e.vy = e.vz = 0; e.dashTimer = 0; e.pendingCast = null; e.raidCast = null;
            e.meleeAttack = null; e.meleeRecovery = 0; e.queuedInput = null;
            continue;
          }
          if (d.type === 'authenticLove') e.techniqueExtinguishedUntil = this.elapsed + .6;
          if (d.type === 'mahitoDomain' && (CHARACTERS[e.charId]?.sukunaVessel || e.charId.startsWith('sukuna'))) {
            d.alive = false;
            this.damage(owner, 35, e, 'sukunaSoulReprisal');
            this.enterBurnout(owner);
            this.announce('触及宿傩的灵魂 · 宿傩反击 · 真人领域崩塌', '#ff7583', 2);
            break;
          }
          if (d.type === 'mahitoDomain' && !this.practiceImmortal(e)) {
            e.soulTransfigured = true;
            e.maxHp = Math.max(1, e.maxHp - 4);
            e.hp = Math.min(e.hp, e.maxHp);
          }
          this.damage(e, d.damage, owner, d.abilityId);
        }
      }
      if (d.life <= 0) {
        d.alive = false;
        this.enterBurnout(this.entities.find((e) => e.id === d.ownerId));
      }
    }
    this.domains = this.domains.filter((d) => d.alive);
    this.syncDomainCaptives();
  }

  // ---- effects ----
  sureHitContested(domain, entity) {
    return this.domains.some((other) => {
      if (!other.alive || other.team === domain.team || other.power !== domain.power) return false;
      if (domain.closedBarrier && other.closedBarrier) return Math.hypot(entity.x-domain.x, entity.y+CHEST-domain.y, entity.z-domain.z) <= domain.radius && Math.hypot(entity.x-other.x, entity.y+CHEST-other.y, entity.z-other.z) <= other.radius;
      const open = domain.openBarrier ? domain : other.openBarrier ? other : null;
      const closed = domain.closedBarrier ? domain : other.closedBarrier ? other : null;
      if (!open || !closed) return false;
      const overlap = Math.hypot(closed.exteriorX - open.x, closed.exteriorY - open.y, closed.exteriorZ - open.z) < open.radius + closed.exteriorRadius;
      return overlap && Math.hypot(entity.x - closed.x, entity.y + CHEST - closed.y, entity.z - closed.z) <= closed.radius;
    });
  }

  burst(x, y, z, color, amount, speed, dir = null) {
    for (let i = 0; i < amount; i += 1) {
      const a = dir ? Math.atan2(dir.z, dir.x) + Math.PI + rand(-1.1, 1.1) : Math.random() * TAU;
      const sp = rand(speed * 0.25, speed);
      this.particles.push({
        x, y, z,
        vx: Math.cos(a) * sp,
        vy: rand(-speed * 0.4, speed * 0.6),
        vz: Math.sin(a) * sp,
        size: rand(0.6, 2.2),
        color,
        life: rand(0.3, 0.75),
        gravity: 12,
        drag: 0.93,
        shard: false
      });
    }
  }

  announce(text, color, duration) {
    this.announcements.push({ text, color, life: duration, maxLife: duration });
  }

  // ---- entity update ----
  updateEntity(e, dt) {
    if (!e.alive) return;
    if (!this.isBorrowedBattle()) {
      if (e.meleeAttack) {
        e.meleeAttack.remaining -= dt;
        if (e.meleeAttack.remaining <= 0) {
          const attack = e.meleeAttack; e.meleeAttack = null;
          if (this._meleeContacts) this._meleeContacts.push({ entity: e, attack });
          else this.resolveMelee(e, attack.ability, attack.attackId, attack.yaw);
          e.meleeRecovery = attack.recovery;
        }
      } else e.meleeRecovery = Math.max(0, (e.meleeRecovery || 0)-dt);
      if (e.queuedInput && e.queuedInput.expires < this.elapsed) e.queuedInput = null;
      if (e.queuedInput && !e.meleeAttack && !e.meleeRecovery) {
        const input = e.queuedInput; e.queuedInput = null;
        const started=input.index === 'basic' ? this.tryBasicAttack(e) : this.tryCast(e, input.index);
        if (!started) e.queuedInput=input;
      }
    }
    this.updateBorrowedCast(e, dt);
    const fromX = e.x;
    const fromZ = e.z;
    e.burnout = Math.max(0, (e.burnout || 0) - dt);
    e.guardTimer = Math.max(0, (e.guardTimer || 0) - dt);
    e.wickerBasketTimer = Math.max(0, (e.wickerBasketTimer || 0) - dt);
    e.infinityTimer = Math.max(0, (e.infinityTimer || 0) - dt);
    e.spearGuardTimer = Math.max(0, (e.spearGuardTimer || 0) - dt);
    e.flyheadTimer = Math.max(0, (e.flyheadTimer || 0) - dt);
    if (e.flyheadTimer > 0) this.burst(e.x, e.y + CHEST, e.z, "#393141", 3, 4);
    e.simpleDomainTimer = Math.max(0, (e.simpleDomainTimer || 0) - dt);
    e.simpleDomainCooldown = Math.max(0, (e.simpleDomainCooldown || 0) - dt);
    e.basicCooldown = Math.max(0, (e.basicCooldown || 0) - dt);
    e.stun = Math.max(0, (e.stun || 0) - dt);
    let slowFactor = 1;
    for (const d of this.domains) {
      if (this.isBorrowedBattle() || !d.alive || d.openBarrier || this.sureHitContested(d, e) || d.ownerId === e.id || d.team === e.team || e.simpleDomainTimer > 0) continue;
      const dx = e.x - d.x;
      const dy = (e.y + CHEST) - d.y;
      const dz = e.z - d.z;
      if (dx * dx + dy * dy + dz * dz <= d.radius * d.radius) {
        if (d.type === 'void' && this.inVoidStun(e)) slowFactor = 0;
      }
    }

    if (this.inVoidStun(e)) { e.vx = e.vy = e.vz = 0; e.dashTimer = 0; slowFactor = 0; }
    const difficultySpeed = this.mode === "story" && !e.isPlayer && !e.summon ? this.getDifficultyProfile().speed : 1;
    const speed = e.speed * difficultySpeed * slowFactor * (e.stun > 0 || e.pendingCast || e.raidCast || e.recovery > 0 ? 0 : e.meleeAttack ? .35 : 1) * (e.sprinting && e.dashTimer <= 0 ? SPRINT.multiplier : 1);
    if (e.dashTimer > 0) {
      e.dashTimer -= dt;
      e.x += e.dashVx * dt;
      e.y += e.dashVy * dt;
      e.z += e.dashVz * dt;
      if (Math.random() < 0.85) {
        this.particles.push({
          x: e.x, y: e.y + rand(0.3, 1.6), z: e.z,
          vx: rand(-1.2, 1.2), vy: rand(-0.4, 1.2), vz: rand(-1.2, 1.2),
          size: rand(0.7, 1.7), color: e.color, life: 0.32,
          gravity: 0, drag: 0.9, shard: false
        });
      }
    }
    e.x += (e.moveInput.x * speed + e.vx) * dt;
    e.z += (e.moveInput.z * speed + e.vz) * dt;

    const vt = e.pendingCast || e.recovery > 0 || e.stun > 0 ? 0 : e.moveInput.y || 0;
    if (e.pendingCast) e.vy = 0;
    e.vy = lerp(e.vy, vt * FLIGHT.speed, Math.min(1, dt * 16));
    e.y += e.vy * dt;
    if (e.y < 0) { e.y = 0; e.vy = Math.max(0, e.vy); }
    if (e.y > FLIGHT.maxAlt) { e.y = FLIGHT.maxAlt; e.vy = Math.min(0, e.vy); }

    const toX = e.x;
    const toZ = e.z;
    this.resolveWorldMovement(e, fromX, fromZ, toX, toZ);

    e.moving = (!this.isBorrowedBattle() || (!e.pendingCast && e.recovery <= 0 && e.stun <= 0))
      && Math.hypot(e.moveInput.x, e.moveInput.z) > 0.05;

    const damp = Math.pow(0.0001, dt);
    e.vx *= damp;
    e.vz *= damp;
    if (Math.abs(e.vx) < 0.05) e.vx = 0;
    if (Math.abs(e.vz) < 0.05) e.vz = 0;

    for (let i = 0; i < e.cooldowns.length; i += 1) {
      if (e.cooldowns[i] > 0) e.cooldowns[i] = Math.max(0, e.cooldowns[i] - dt);
    }
    e.invuln = Math.max(0, e.invuln - dt);
    if (e.dashCooldown > 0) e.dashCooldown = Math.max(0, e.dashCooldown - dt);
    if (this.practice && this.practiceInfinite) { e.charge = 100; e.domainCharge = 100; }

    const dir = e.pendingCast?.dir || (e.meleeAttack ? {x:Math.sin(e.meleeAttack.yaw),y:0,z:Math.cos(e.meleeAttack.yaw)} : this.fireDir(e));
    const targetYaw = Math.atan2(dir.x, dir.z);
    let d = targetYaw - e.yaw;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    e.yaw += d * Math.min(1, dt * 18);
  }

  updateBorrowedAI(dt) {
    const ai = this.entities.find(e => !e.isPlayer && e.alive && !e.summon);
    const target = this.entities.find(e => e.isPlayer && e.alive && !e.summon);
    if (!ai || !target || this.borrowedBattle?.phase !== "combat") return;
    if (ai.stun > 0 || ai.pendingCast || ai.recovery > 0 || ai.rushImpact > 0) { this.setMove(ai, 0, 0, 0); return; }
    const dx = target.x - ai.x, dz = target.z - ai.z, dy = target.y - ai.y;
    const flat = Math.hypot(dx, dz) || 1;
    const dist = Math.hypot(dx, dz, dy);
    this.setAim(ai, target.x, target.z);
    const sukuna = ai.charId === "sukunaStory2";
    const needMelee = ai.charge < 100;
    const desired = sukuna || needMelee ? 2.5 : 7;
    const toward = dist > desired + 0.5 ? 1 : dist < desired - 0.5 ? -1 : 0;
    this.setMove(ai, dx / flat * toward, dz / flat * toward, clamp(dy * 0.5, -1, 1));
    ai.sprinting = dist > 9;
    if (sukuna) {
      const incoming = this.projectiles.some(p => p.team !== ai.team && Math.hypot(p.x - ai.x, p.z - ai.z) < 8);
      const needsAmp = dist < 5 || incoming || Boolean(target.pendingCast);
      if (needsAmp && !ai.amplification && ai.amplificationEnergy >= 25) this.tryCast(ai, 3);
      else if (!needsAmp && ai.amplification) this.tryCast(ai, 3);
    }
    ai.aiCastCd = (ai.aiCastCd || 0) - dt;
    if (ai.aiCastCd > 0) return;
    const profile = this.getDifficultyProfile();
    ai.aiCastCd = rand(profile.reactionMin, profile.reactionMax);
    if (sukuna) {
      if (target.pendingCast && dist < 9 && ai.cooldowns[2] <= 0 && ai.dashCooldown <= 0) this.tryCast(ai, 2);
      else if (dist <= 3.2) this.tryCast(ai, ai.cooldowns[1] <= 0 ? 1 : 0);
      else if (dist < 9 && ai.cooldowns[2] <= 0 && ai.dashCooldown <= 0) this.tryCast(ai, 2);
    } else {
      if (ai.charge >= 100 && this.recorderReady()) this.tryCast(ai, 3);
      else if (ai.charge >= 100 && (dist >= 6 || target.stun > 0)) this.tryCast(ai, 2);
      else if (dist <= 3.2 && needMelee) this.tryCast(ai, 1);
      else this.tryCast(ai, 0);
    }
  }

  updateAI(dt) {
    if (isRaid(this)) { updateRaidAI(this, dt); return; }
    if (this.isBorrowedBattle()) { this.updateBorrowedAI(dt); return; }
    const ai = this.entities.find((e) => !e.isPlayer && e.alive && !e.dummy);
    const target = this.entities.find((e) => e.isPlayer && e.alive);
    if (!ai || !target) return;
    if (reactToThreat(this, ai, target, dt)) return;
    if (this.canUseSimpleDomain(ai) && ai.simpleDomainCooldown <= 0 && ai.simpleDomainTimer <= 0 && this.domains.some((d) => d.alive && d.team !== ai.team && Math.hypot(ai.x - d.x, ai.y + CHEST - d.y, ai.z - d.z) <= d.radius)) this.trySimpleDomain(ai);
    if (ai.burnout > 0) {
      if (ai.hp > ai.maxHp * 0.4 && ai.burnout > 2 && target.hp > 20) this.tryForceRestore(ai);
      else if (Math.hypot(target.x - ai.x, target.z - ai.z) < 3.2) this.tryBasicAttack(ai);
    }
    if (ai.stun > 0) { this.setMove(ai, 0, 0, 0); return; }
    const profile = this.getDifficultyProfile();

    // an unfinished combo window must expire, or the AI keeps reaching for a
    // finisher (e.g. 开) it can no longer cast and stops attacking entirely
    if (ai.comboChain?.length && this.elapsed - (ai.lastComboAt || 0) > 1.3) ai.comboChain = [];

    const dx = target.x - ai.x;
    const dz = target.z - ai.z;
    const dist = Math.hypot(dx, dz) || 1;
    const nx = dx / dist;
    const nz = dz / dist;
    const attackDistance = Math.hypot(dx, dz, target.y-ai.y);
    // Mahito's ordinary fists can produce Black Flash; transfiguration cannot.
    if (ai.charId.startsWith('mahito') && attackDistance < 3.2 && (ai.basicCooldown || 0) <= 0 && Math.random() < .15) this.tryBasicAttack(ai);

    ai.aiTimer -= dt;
    if (ai.aiTimer <= 0) {
      ai.aiTimer = rand(0.6, 1.4);
      ai.aiStrafe *= Math.random() < 0.4 ? -1 : 1;
    }

    let mx = 0;
    let mz = 0;
    const storySukuna = this.isStorySukuna(ai);
    const closeCombat = storySukuna || ai.charId.startsWith("toji") || CHARACTERS[ai.charId].abilities[0]?.type === 'melee' || ai.burnout > 0;
    const engageDistance = closeCombat ? 3.1 : 17;
    const retreatDistance = storySukuna ? 1.8 : closeCombat ? 2.8 : 9;
    if (dist > engageDistance) { mx = nx; mz = nz; }
    else if (dist < retreatDistance) { mx = -nx; mz = -nz; }
    else { mx = -nz * ai.aiStrafe; mz = nx * ai.aiStrafe; }
    mx += nx * 0.25;
    mz += nz * 0.25;
    const ml = Math.hypot(mx, mz) || 1;

    // the AI picks its own altitude and flies there on its own schedule
    let my = 0;
    if (closeCombat) {
      // Story Sukuna keeps his feet aligned with his opponent so his attacks
      // stay in melee range instead of drifting into a ranged aerial pattern.
      ai.aiAlt = clamp(target.y, 0, FLIGHT.maxAlt);
    } else {
      ai.aiAltTimer -= dt;
      if (ai.aiAltTimer <= 0) {
        ai.aiAltTimer = rand(2.2, 4.5) / Math.max(0.5, profile.aggro);
        const r = Math.random();
        if (r < 0.24) ai.aiAlt = 0;
        else if (r < 0.7) ai.aiAlt = rand(6, 16);
        else ai.aiAlt = rand(16, FLIGHT.maxAlt * 0.85);
        // sometimes it decides to engage at the opponent's height
        if (Math.random() < profile.aggro * 0.35) {
          ai.aiAlt = clamp(target.y + rand(-3.5, 3.5), 0, FLIGHT.maxAlt);
        }
      }
    }
    const dyAlt = ai.aiAlt - ai.y;
    if (Math.abs(dyAlt) > 1.2) my = clamp(dyAlt * 0.4, -0.95, 0.95);

    ai.sprinting = (dist > 18 || Math.abs(target.y - ai.y) > 8) && ai.dashTimer <= 0;
    const inputSpeed = this.mode === "story" ? 1 : profile.speed;
    this.setMove(ai, (mx / ml) * inputSpeed, (mz / ml) * inputSpeed, my);
    if (dist > engageDistance) {
      const direction = chaseDirection(this, ai, target, dt);
      this.setMove(ai, direction.x*inputSpeed, direction.z*inputSpeed, my);
    }

    // chase dash to close the gap (its own decision, on a timer)
    ai.aiDashTimer = (ai.aiDashTimer ?? 1.5) - dt;
    if (ai.aiDashTimer <= 0 && dist > 16 && ai.dashCooldown <= 0) {
      ai.aiDashTimer = rand(1.6, 3.2) / Math.max(0.6, profile.aggro);
      const dy = clamp((target.y - ai.y) / Math.max(1, dist), -0.7, 0.7);
      this.tryDash(ai, nx, dy, nz);
    }

    const err = profile.aimError;
    const lead = profile.leadTime;
    const leadX = target.x + target.vx * lead - ai.x;
    const leadZ = target.z + target.vz * lead - ai.z;
    let aimAng = Math.atan2(leadX, leadZ);
    if (Math.random() < err * 1.4) aimAng += (Math.random() * 2 - 1) * (0.4 + err);
    const aimLen = Math.hypot(leadX, leadZ) || 1;
    this.setAim(ai, ai.x + Math.sin(aimAng) * aimLen, ai.z + Math.cos(aimAng) * aimLen);

    // aim-and-fire: shoot once the barrel points at the target, or force a shot after forcedShotMs
    const ad = this.aimDir(ai);
    const tx = target.x - ai.x;
    const tz = target.z - ai.z;
    const tlen = Math.hypot(tx, tz) || 1;
    const alignment = ad.x * (tx / tlen) + ad.z * (tz / tlen);
    ai.aiCastCd -= dt;
    if (ai.aiCastCd <= 0) {
      const waited = this.elapsed - ai.aiWaitStarted;
      const isPacedGojoAi = this.legacyGojoAi(ai);
      const gojoAiTuning = isPacedGojoAi
        ? SUKUNA_VS_GOJO_AI_HANDICAP.aiTuning[this.difficulty]
        : null;
      const forcedShotDelay = (profile.forcedShotMs / 1000) * (
        gojoAiTuning?.blueForcedShotDelayMultiplier ?? 1
      );
      if (alignment > rand(profile.aimMin, profile.aimMax) || waited > forcedShotDelay) {
        const idx = this.pickAiAbility(ai, attackDistance);
        if (idx >= 0) {
          if (this.tryCast(ai, idx)) {
            ai.aiWaitStarted = this.elapsed;
            const isBlue = CHARACTERS[ai.charId].abilities[idx]?.id === "blue";
            const castDelayMultiplier = isPacedGojoAi && isBlue
              ? gojoAiTuning.blueCastDelayMultiplier
              : 1;
            ai.aiCastCd = rand(profile.reactionMin, profile.reactionMax) * castDelayMultiplier;
          } else {
            // keep the wait timer running so the forced shot still lands
            ai.aiCastCd = 0.15;
          }
        } else {
          ai.aiCastCd = 0.12;
        }
      } else {
        ai.aiCastCd = 0.1;
      }
    }
  }

  // an ability the AI may actually fire right now (cooldown + charge gates)
  aiAbilityReady(ai, idx) {
    const ability = CHARACTERS[ai.charId].abilities[idx];
    if (!ability) return false;
    if (['domain','soulDomain'].includes(ability.type) && this.ownsDomain(ai)) return false;
    if (this.inVoidStun(ai)) return false;
    if (this.borrowedSkillLocked(ai, ability)) return false;
    if (shibuyaAbilityLocked(this, ai, ability)) return false;
    if (raidAbilityLocked(this, ai, ability)) return false;
    if (ai.burnout > 0 && ability.requiresTechnique) return false;
    if (!this.isBorrowedBattle() && (ai.meleeAttack || ai.meleeRecovery > 0)) return false;
    if (ability.needsDomain && (ai.domainLocked || (this.isStoryCombat() && this.storyStage === "borrowed" && this.storyTimer <= 0 && ai.charId === "yutaGojo"))) return false;
    if (ai.cooldowns[idx] > 0) return false;
    if (ability.needsCharge && ai.charge < 100) return false;
    if (ability.needsDomain && ai.domainCharge < 100) return false;
    return true;
  }

  pickAiAbility(ai, dist) {
    const abilities = CHARACTERS[ai.charId].abilities;
    const combos = CHARACTERS[ai.charId].combos || [];
    const ready = (idx) => this.aiAbilityReady(ai, idx);
    if (['higuruma', 'kashimo', 'sukunaRaid', 'yujiCulling'].includes(ai.charId)) {
      const useful = abilities.map((a, i) => ({ a, i })).filter(({ a, i }) => ready(i) &&
        (['melee', 'execution'].includes(a.type) ? dist <= a.range : a.type === 'heal' ? ai.hp < ai.maxHp*.6 : a.type === 'guard' ? this.domains.some(d => d.alive && d.team !== ai.team) : a.type !== 'appeal'));
      return (useful.find(({a}) => a.type === 'sentencing' || a.type === 'execution') || useful[Math.floor(Math.random()*useful.length)])?.i ?? -1;
    }

    if (["yujiShibuya", "mahito", "mahitoFinal"].includes(ai.charId)) {
      const useful = abilities.map((a, i) => ({ a, i })).filter(({ a, i }) => ready(i) &&
        (a.type === "melee" ? dist <= a.range : a.type === "guard" ? dist < 5 : a.type === "orb" ? dist < 20 : a.type === "soulDomain" ? dist < 12 : false));
      const blackFlash = useful.find(({ a }) => a.id === "yujiBlackFlash");
      return blackFlash ? blackFlash.i : useful.length ? useful[Math.floor(Math.random() * useful.length)].i : -1;
    }
    if (ai.charId.startsWith("toji") || ai.charId.startsWith("gojoTeen") || ai.charId === "gojoAwakened") {
      const useful = abilities.map((a, i) => ({ a, i })).filter(({ a, i }) => ready(i) &&
        (a.type === "melee" || a.type === "chain" ? dist <= a.range :
          a.type === "heal" ? ai.hp < ai.maxHp * 0.65 :
            a.type === "infinity" ? dist < 8 && !(ai.infinityTimer > 0) : true));
      const purple = useful.find(({ a }) => a.id === "purple");
      if (purple) return purple.i;
      return useful.length ? useful[Math.floor(Math.random() * useful.length)].i : -1;
    }

    const healIndex = abilities.findIndex((a) => a.type === "heal");
    if (healIndex >= 0 && ai.hp < ai.maxHp * 0.55 && ready(healIndex)) return healIndex;
    const guardIndex = abilities.findIndex((a) => a.type === "guard");
    if (guardIndex >= 0 && ready(guardIndex) && this.domains.some((d) => d.alive && d.team !== ai.team)) return guardIndex;

    if (this.isStorySukuna(ai)) {
      const domainIndex = abilities.findIndex((a) => a.type === "domain");
      if (domainIndex >= 0 && ready(domainIndex) && dist <= 4.2) return domainIndex;
      const meleeIndices = abilities
        .map((ability, index) => ability.type === "melee" && ready(index) ? index : -1)
        .filter((index) => index >= 0);
      if (!meleeIndices.length || dist > Math.max(...meleeIndices.map((index) => abilities[index].range))) return -1;
      return meleeIndices[Math.floor(Math.random() * meleeIndices.length)];
    }

    // 1) finish a combo that is one hit away (only if the finisher is actually castable)
    for (const c of combos) {
      const n = c.seq.length;
      if (ai.comboChain.length < n - 1) continue;
      const tail = ai.comboChain.slice(-(n - 1));
      if (!tail.every((id, i) => id === c.seq[i])) continue;
      const idx = abilities.findIndex((a) => a.id === c.seq[n - 1]);
      if (idx >= 0 && ready(idx)) return idx;
    }

    // 2) summon assist (only when this loadout actually owns one)
    const hasSummon = this.entities.some((e) => e.summon && e.ownerId === ai.id && e.alive);
    const summonIndex = abilities.findIndex((a) => a.type === "summon");
    if (!hasSummon && summonIndex >= 0 && ready(summonIndex) && this.elapsed > 6 && Math.random() < 0.6) return summonIndex;

    // 3) domain when the target is inside its reach
    if (abilities[3]?.type === "domain" && ready(3) && dist < 18) return 3;

    // 4) ultimate when charged and roughly in line
    if (ready(2) && dist < 42) {
      if (abilities[2]?.type === "copy") ai.copyIndex = Math.floor(Math.random() * COPY_TECHNIQUES.length);
      return 2;
    }

    // 5) mid-range secondary
    if (ready(1) && (abilities[1]?.type === "summon" || dist < 30) && Math.random() < 0.65) return 1;

    // 6) basic
    if (ready(0) && (abilities[0].type !== "melee" || dist <= abilities[0].range)) return 0;
    return -1;
  }

  updateEffects(dt) {
    this.damageTexts.forEach((t) => { t.life -= dt; t.y += dt * 1.6; });
    this.damageTexts = this.damageTexts.filter((t) => t.life > 0);
    this.announcements.forEach((a) => { a.life -= dt; });
    this.announcements = this.announcements.filter((a) => a.life > 0);
    this.screenShake *= Math.pow(0.002, dt);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.hitPulse = Math.max(0, this.hitPulse - dt * 3.4);
  }

  update(dt) {
    if (this.state === "storyTransition") return;
    this.updateDialogue(dt);
    if (this.state !== "playing") { this.updateEffects(dt); return; }
    if (this.hitStop > 0) {
      // Simulation time, every attack timer and every combat window freeze together.
      this.hitStop = Math.max(0, this.hitStop - dt);
      this.updateEffects(dt * 0.3);
      return;
    }
    this.elapsed += dt;
    this.updateTraining();
    if (updateRaid(this, dt)) { this.updateEffects(dt); return; }
    if (updateShibuya(this, dt)) return;
    // All attacks reaching contact in this step resolve before damage can cancel a peer's strike.
    this._meleeContacts = [];
    for (const e of this.entities) this.updateEntity(e, dt);
    const contacts = this._meleeContacts;
    this._meleeContacts = null;
    this._meleeDeaths = new Set();
    for (const {entity, attack} of contacts) this.resolveMelee(entity, attack.ability, attack.attackId, attack.yaw);
    const deaths = this._meleeDeaths;
    this._meleeDeaths = null;
    this._settlingMelee = true;
    for (const entity of deaths) this.kill(entity);
    this._settlingMelee = false;
    if (deaths.size && !this.practice && this.state === 'playing') {
      const alive = this.entities.filter(e => e.alive && !e.summon);
      if (alive.length <= 1) { this.winner = alive[0] || null; this.finishEnd(); }
    }
    if (this.state !== 'playing') return;
    if (this.mode === "single" || this.mode === "story" || isRaid(this)) this.updateAI(dt);
    this.updateSummon(dt);
    if (this.practice && this.practiceDummy && !this.entities.some((e) => e.dummy && e.alive)) {
      this.dummyRespawn = (this.dummyRespawn || 0) - dt;
      if (this.dummyRespawn <= 0) {
        this.entities = this.entities.filter((e) => !e.dummy);
        this.spawnDummy();
        this.dummyRespawn = 2.5;
      }
    }
    this.entities = this.entities.filter((e) => !(e.summon && !e.alive));
    this.resolveEntityCollisions();
    this.resolveWorldOverlaps();
    // Collision separation can push a fighter below the floor after its own
    // movement step has clamped altitude. Keep the camera above the arena.
    for (const e of this.entities) e.y = this.groundDuel || CHARACTERS[e.charId]?.grounded ? 0
      : clamp(e.y, 0, this.isBorrowedBattle() ? BORROWED_BATTLE.maxAltitude : FLIGHT.maxAlt);
    if (this.mode === "single" && DIFFICULTY[this.difficulty].gojoRegen) {
      // the reverse cursed technique belongs to whoever is playing Gojo
      const gojo = this.entities.find((e) => e.alive && !e.summon && e.charId === "gojo");
      if (gojo && gojo.hp < gojo.maxHp) {
        gojo.hp = clamp(gojo.hp + GOJO_REGEN_PER_SECOND * dt, 0, gojo.maxHp);
        if (dt > 0) {
          gojo.battleStats ||= { attempts: 0, landed: new Set(), damage: 0, taken: 0, heals: 0 };
          gojo.battleStats.heals++;
        }
      }
    }
    this.updateProjectiles(dt);
    this.updateBeams(dt);
    if (this.state !== "playing") return;
    if (this.isBorrowedBattle() && this.borrowedBattle?.phase === "combat") {
      this.storyTimer = Math.max(0, this.storyTimer - dt);
      if (this.storyTimer === 0 && this.domains.length) {
        for (const domain of this.domains) {
          this.recordDomainBreak(domain);
          this.enterBurnout(this.entities.find(e => e.id === domain.ownerId));
        }
        this.domains = [];
        this.syncDomainCaptives();
        this.announce("领域交锋结束 · 继续战斗，击败对手即可获胜", "#b7e9ff", 3);
      }
    }
    this.updateDomains(dt);
    this.updateEffects(dt);
  }
}
