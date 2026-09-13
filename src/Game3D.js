import { CHARACTERS, DIFFICULTY, ARENA, FLIGHT, SPRINT, BLACK_FLASH, GOJO_REGEN_PER_SECOND, clamp, lerp, rand, TAU } from "./config3d.js";

const ENTITY_RADIUS = 0.7;
const CHEST = 1.0;

export class Game3D {
  constructor() {
    this.mode = "single";
    this.difficulty = "normal";
    this.state = "menu";
    this.entities = [];
    this.projectiles = [];
    this.beams = [];
    this.domains = [];
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
    this.practiceChar = "gojo";
    this.practiceInfinite = true;
    this.practiceInvincible = true;
    this.practiceDummy = false;
    this.blackFlashCount = 0;
    this.nextRegenFxAt = 0;
    this.hitPulse = 0;
    this.hitPulseColor = "#ecc25a";
    this.timeStop = 0;
    this.cutIn = null;
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

  queueDialogue(speaker, text, duration = 2.4, priority = 0) {
    const key = `${speaker}:${text}`;
    if (this.activeDialogue?.key === key || this.dialogueQueue.some((l) => l.key === key)) return;
    this.dialogueQueue.push({ speaker, text, duration, priority, key });
    this.dialogueQueue.sort((a, b) => b.priority - a.priority);
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
      sigil: this.activeDialogue.speaker === "gojo" ? "五" : "宿",
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
    this.winner = null;
    this.lockTargetId = null;
    this.battleTime = 0;
    this.rampStage = 0;
    this.timeStop = 0;
    this.cutIn = null;
    this.projectiles = [];
    this.beams = [];
    this.domains = [];
    this.particles = [];
    this.damageTexts = [];
    this.announcements = [];
    this.screenShake = 0;
    this.flash = 0;
    this.hitStop = 0;
    this.entities = [];
    if (this.practice) {
      this.entities.push(this.makeEntity(this.practiceChar || "gojo", 0, 6, true));
      if (this.practiceDummy) this.spawnDummy();
    } else {
      this.entities.push(this.makeEntity("gojo", 0, 15, true));
      this.entities.push(this.makeEntity("sukuna", 0, -15, mode === "dual"));
    }
    // difficulty decides the enemy's toughness
    if (this.mode === "single") {
      const hp = DIFFICULTY[this.difficulty].enemyHp || 100;
      const ai = this.entities.find((e) => !e.isPlayer && !e.summon);
      if (ai) { ai.maxHp = hp; ai.hp = hp; }
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
    if (this.mode !== "practice") this.queueDialogue("gojo", "我的学生都在看着呢，再让我刷会帅吧。", 3.3, 2);
    this.emit("sfx", { kind: "countdown" });
    if (this.mode === "single" && DIFFICULTY[this.difficulty].gojoRegen) {
      this.announce("反转术式 · 持续恢复", "#b9f5ff", 1.5);
    }
  }

  setPracticeChar(charId) {
    this.practiceChar = charId === "sukuna" ? "sukuna" : "gojo";
    if (this.practice) this.start("practice", "normal");
  }

  setPracticeOption(key, value) {
    if (key === "infinite") this.practiceInfinite = value;
    if (key === "invincible") this.practiceInvincible = value;
    if (key === "dummy") {
      this.practiceDummy = value;
      if (!this.practice) return;
      if (value) this.spawnDummy();
      else this.entities = this.entities.filter((e) => !e.dummy);
    }
  }

  spawnDummy() {
    if (this.entities.some((e) => e.dummy)) return;
    const other = this.practiceChar === "gojo" ? "sukuna" : "gojo";
    const dummy = this.makeEntity(other, 0, -14, false);
    dummy.dummy = true;
    dummy.moveInput = { x: 0, z: 0 };
    this.entities.push(dummy);
  }

  makeEntity(charId, x, z, isPlayer) {
    const char = CHARACTERS[charId];
    return {
      id: isPlayer ? charId : `${charId}_ai`,
      charId,
      name: char.name,
      color: char.color,
      aura: char.aura,
      team: charId === "gojo" ? "gojo" : "sukuna",
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
      hp: char.hp,
      maxHp: char.hp,
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
      slow: 0
    };
  }

  player() {
    return this.entities.find((e) => e.isPlayer);
  }

  // ---- lock-on (used by the mobile camera) ----
  enemyList(player = this.player()) {
    if (!player) return [];
    return this.entities.filter((e) => e.alive && e.team !== player.team);
  }

  lockEntity(player = this.player()) {
    const list = this.enemyList(player);
    if (!list.length) return null;
    return list.find((e) => e.id === this.lockTargetId) || list[0];
  }

  cycleLock(player = this.player()) {
    const list = this.enemyList(player);
    if (!list.length) { this.lockTargetId = null; return null; }
    const idx = list.findIndex((e) => e.id === this.lockTargetId);
    const base = idx >= 0 ? idx : 0;
    const next = list[(base + 1) % list.length];
    this.lockTargetId = next.id;
    return next;
  }

  // ---- input from main ----
  setMove(entity, mx, mz, my = 0) {
    if (!entity) return;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    entity.moveInput.x = mx;
    entity.moveInput.z = mz;
    entity.moveInput.y = my;
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
      if (target) {
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
  tryCast(entity, index) {
    if (!entity?.alive || this.state !== "playing") return false;
    const char = CHARACTERS[entity.charId];
    const ability = char.abilities[index];
    if (!ability) return false;
    if (!this.practice && this.inVoidStun(entity) && !ability.needsDomain) {
      this.emit("sfx", { kind: "empty" });
      return false;
    }
    const infinite = this.practice && this.practiceInfinite;
    if (!infinite) {
      if (entity.cooldowns[index] > 0) { this.emit("sfx", { kind: "empty" }); return false; }
      if (ability.needsCharge && entity.charge < 100) { this.emit("sfx", { kind: "empty" }); return false; }
      if (ability.needsDomain && entity.domainCharge < 100) { this.emit("sfx", { kind: "empty" }); return false; }
    }
    if (this.practice) { entity.charge = 100; entity.domainCharge = 100; }
    entity.cooldowns[index] = infinite ? 0.12 : ability.cooldown;
    if (ability.needsCharge && !this.practice) entity.charge = 0;
    if (ability.needsDomain && !this.practice) entity.domainCharge = 0;

    const dir = this.fireDir(entity);
    entity.yaw = Math.atan2(dir.x, dir.z);

    if (ability.type === "orb") this.castOrb(entity, ability, dir);
    else if (ability.type === "beam") this.castBeam(entity, ability, dir);
    else if (ability.type === "domain") this.castDomain(entity, ability);
    else if (ability.type === "summon") this.castSummon(entity, ability);
    return true;
  }

  comboEligible(entity, abilityId) {
    const ab = CHARACTERS[entity.charId]?.abilities?.find((a) => a.id === abilityId);
    return Boolean(ab && (ab.type === "orb" || ab.type === "beam"));
  }

  inVoidStun(entity) {
    return this.domains.some((d) => {
      if (!d.alive || d.type !== "void" || d.team === entity.team) return false;
      if (d.life <= d.maxLife * 0.45) return false;
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
    if (!entity?.alive || this.state !== "playing") return false;
    if (entity.dashCooldown > 0) return false;
    const cfg = CHARACTERS[entity.charId].dash;
    let dx = dirX;
    let dy = dirY;
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
        knock: ability.knock,
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
    this.beams.push({
      ownerId: entity.id,
      team: entity.team,
      abilityId: ability.id,
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
      knock: ability.knock,
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
    // Gojo's 茈: brief time-stop + manga cut-in
    if (entity.charId === "gojo" && ability.id === "purple") {
      this.triggerCutIn("gojo-murasaki", 0.42, 0.72, 2.4);
    }
    this.announce(`${CHARACTERS[entity.charId].name} · ${ability.label}`, ability.color, 1.2);
    this.queueDialogue(entity.charId, entity.charId === "gojo" ? "这一击，可别移开视线。" : "让我看看你能撑到什么时候。", 2.4, 2);
  }

  // ---- cinematic cut-in (time-stop + full-screen manga art) ----
  triggerCutIn(art, stop = 0.4, flash = 0.6, shake = 2.0, opts = {}) {
    const life = opts.life || 1.0;
    this.cutIn = {
      art,
      life,
      maxLife: life,
      tint: opts.tint || null,
      shadow: opts.shadow || null,
      fit: opts.fit || "cover"
    };
    this.timeStop = Math.max(this.timeStop, stop);
    this.flash = Math.max(this.flash, flash);
    this.screenShake = Math.max(this.screenShake, shake);
  }

  castDomain(entity, ability) {
    const opposing = this.domains.find((d) => d.alive && d.team !== entity.team);
    if (opposing) {
      opposing.alive = false;
      this.domains = this.domains.filter((d) => d.alive);
      this.flash = Math.max(this.flash, 0.66);
      this.screenShake = Math.max(this.screenShake, 2.6);
      this.hitStop = Math.max(this.hitStop, 0.07);
      this.burst(entity.x, entity.y + CHEST, entity.z, entity.color, 44, 11);
      this.burst(opposing.x, opposing.y, opposing.z, opposing.color, 44, 11);
      this.emit("sfx", { kind: "domain", owner: "clash" });
      this.announce("领域对抗", "#f4f1ff", 1.5);
      this.triggerCutIn("domain-clash", 0.42, 0.68, 2.6);
      return;
    }
    this.domains.push({
      ownerId: entity.id,
      team: entity.team,
      abilityId: ability.id,
      type: ability.id,
      x: entity.x,
      y: entity.y + CHEST,
      z: entity.z,
      radius: ability.radius,
      life: ability.life,
      maxLife: ability.life,
      tick: ability.tick,
      tickTimer: 0.15,
      damage: ability.damage,
      color: ability.color,
      core: ability.core,
      alive: true
    });
    this.flash = Math.max(this.flash, 0.6);
    this.screenShake = Math.max(this.screenShake, 2.2);
    this.emit("sfx", { kind: "domain", owner: entity.charId });
    this.announce(`领域展开 · ${ability.label}`, ability.color, 1.6);
    if (entity.charId === "gojo") this.triggerCutIn("gojo-void", 0.42, 0.66, 2.4);
    else if (entity.charId === "sukuna") this.triggerCutIn("sukuna-domain", 0.42, 0.66, 2.4);
    this.queueDialogue(entity.charId, entity.charId === "gojo" ? "领域展开——无量空处。" : "领域展开——伏魔御厨子。", 3.0, 5);
  }

  castSummon(entity, ability) {
    const existing = this.entities.find((e) => e.summon && e.ownerId === entity.id && e.alive);
    if (existing) existing.life = 0;
    const m = {
      id: `mahoraga_${entity.id}`,
      charId: "mahoraga",
      name: "魔虚罗",
      color: "#e4c866",
      aura: 0xe4c866,
      team: entity.team,
      summon: true,
      ownerId: entity.id,
      adapt: {},
      life: ability.life || 24,
      contactAt: -10,
      shotAt: -10,
      isPlayer: false,
      x: clamp(entity.x + 3, -ARENA.half, ARENA.half),
      z: clamp(entity.z + 3, -ARENA.half, ARENA.half),
      y: entity.y,
      vy: 0,
      yaw: 0,
      hp: ability.hp || 72,
      maxHp: ability.hp || 72,
      vx: 0,
      vz: 0,
      speed: ability.speed || 6.6,
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
    this.announce("魔虚罗 参战", "#e4c866", 1.5);
    this.burst(m.x, m.y + CHEST, m.z, "#e4c866", 44, 9);
    this.queueDialogue("sukuna", "魔虚罗，适应他。", 2.5, 4);
  }

  updateSummon(dt) {
    for (const m of this.entities) {
      if (!m.summon || !m.alive) continue;
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
      if (d3 < ENTITY_RADIUS * 2 + 0.35 && this.elapsed - m.contactAt > 1.1) {
        m.contactAt = this.elapsed;
        this.damage(target, 6, m, "mahoragaContact");
        this.burst(target.x, target.y + CHEST, target.z, "#e4c866", 12, 5);
      }
      if (this.elapsed - m.shotAt > 1.3 && dist < 28) {
        m.shotAt = this.elapsed;
        const d = this.fireDir(m);
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
          damage: 9,
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
    this.announce("魔虚罗 退场", "#f8e7a4", 1.2);
  }

  // ---- damage ----
  damage(target, amount, source, abilityId = null) {
    if (!target?.alive || target.invuln > 0) return;
    if (this.practice && this.practiceInvincible && target.isPlayer) return;
    const profile = DIFFICULTY[this.difficulty];
    const aiAttacker = source && !source.isPlayer && this.mode === "single";
    const aiTarget = this.mode === "single" && !target.isPlayer && !target.summon;
    let dealt = amount * (aiAttacker ? profile.damageMultiplier : 1);
    if (aiTarget) dealt *= profile.damageTakenMultiplier;

    // 黑闪：任意一方近身命中都有概率暴击（AI 也享受同样的演出）
    let blackFlash = false;
    if (source && source !== target && this.state === "playing") {
      const dist = Math.hypot(source.x - target.x, source.y - target.y, source.z - target.z);
      if (dist <= BLACK_FLASH.range && Math.random() < BLACK_FLASH.chance) blackFlash = true;
    }
    if (blackFlash) dealt *= BLACK_FLASH.multiplier;
    dealt = Math.max(1, Math.round(dealt));

    let adapted = false;
    if (target.summon && abilityId) {
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

    target.hp = clamp(target.hp - dealt, 0, target.maxHp);
    target.hurtAt = this.elapsed;
    target.invuln = 0.06;
    const label = blackFlash ? `-${dealt} 黑闪` : (combo ? `-${dealt} ${combo.name}` : (adapted ? `-${dealt} 适应` : `-${dealt}`));
    this.damageTexts.push({
      x: target.x, y: target.y + 2.0, z: target.z,
      text: label,
      color: blackFlash ? "#ff4058" : (combo ? "#ffd24a" : (target === this.player() ? "#ff6b7f" : (adapted ? "#e2c760" : "#ffffff"))),
      life: 0.8, maxLife: 0.8
    });
    this.burst(target.x, target.y + CHEST, target.z, "#ffd0d8", 14, 5);
    this.screenShake = Math.max(this.screenShake, blackFlash ? 2.0 : 0.35);
    if (blackFlash) {
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
    if (source) {
      const beforeC = source.charge;
      const beforeD = source.domainCharge;
      source.charge = clamp(source.charge + 20, 0, 100);
      source.domainCharge = clamp(source.domainCharge + 14, 0, 100);
      if (beforeC < 100 && source.charge >= 100) this.announce("奥义已就绪", "#ffd24a", 1.0);
      if (beforeD < 100 && source.domainCharge >= 100) this.announce("领域已就绪", "#b05cff", 1.0);
      target.domainCharge = clamp(target.domainCharge + 9, 0, 100);
    }
    const lowKey = `${target.charId}_low`;
    if (target.hp > 0 && target.hp <= 38 && !this.dialogueFlags.has(lowKey)) {
      this.dialogueFlags.add(lowKey);
      this.queueDialogue(target.charId, target.charId === "gojo" ? "还没结束呢。" : "这样才有意思。", 2.3, 1);
    }
    if (target.hp <= 0) this.kill(target);
  }

  kill(target) {
    if (!target.alive) return;
    target.alive = false;
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
      this.announce("魔虚罗 退场", "#f8e7a4", 1.2);
      this.emit("sfx", { kind: "defeat" });
      return;
    }
    if (target.charId === "gojo") this.triggerCutIn("gojo-death", 0.5, 0.7, 2.6);
    this.announce(`${target.name} 退场`, target.color, 1.4);
    this.emit("sfx", { kind: "defeat" });
    const alive = this.entities.filter((e) => e.alive && !e.summon);
    if (this.practice) return;
    if (alive.length <= 1) {
      this.winner = alive[0] || null;
      this.state = "ended";
      this.emit("sfx", { kind: "win" });
      this.queueDialogue(this.winner?.charId || "gojo", this.winner?.charId === "gojo" ? "这场胜负，已经定了。" : "到此为止。", 2.5, 4);
    }
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
      const segLen2 = sx * sx + sy * sy + sz * sz || 1;
      for (const e of this.entities) {
        if (!e.alive || e.team === p.team) continue;
        const ex = e.x;
        const ey = e.y + CHEST;
        const ez = e.z;
        let t = ((ex - px0) * sx + (ey - py0) * sy + (ez - pz0) * sz) / segLen2;
        t = clamp(t, 0, 1);
        const cx = px0 + sx * t;
        const cy = py0 + sy * t;
        const cz = pz0 + sz * t;
        const dx = ex - cx;
        const dy = ey - cy;
        const dz = ez - cz;
        if (dx * dx + dy * dy + dz * dz < (p.radius + ENTITY_RADIUS) ** 2) {
          const len = Math.hypot(p.vx, p.vy || 0, p.vz) || 1;
          const kb = (this.mode === "single" && !e.isPlayer && !e.summon) ? DIFFICULTY[this.difficulty].knockbackTakenMultiplier : 1;
          e.vx += (p.vx / len) * p.knock * kb;
          e.vz += (p.vz / len) * p.knock * kb;
          const owner = this.entities.find((x) => x.id === p.ownerId);
          this.damage(e, p.damage, owner, p.abilityId);
          this.burst(p.x, p.y, p.z, p.color, 16, 5.5);
          p.alive = false;
          break;
        }
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
        const dist = Math.hypot(dx, dy, dz) || 1;
        const min = ENTITY_RADIUS * 2;
        if (dist >= min) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
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
    for (let i = 0; i < this.projectiles.length; i += 1) {
      const a = this.projectiles[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.projectiles.length; j += 1) {
        const b = this.projectiles[j];
        if (!b.alive || a.team === b.team) continue;
        const range = (a.radius + b.radius) * 1.35;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        if (dx * dx + dy * dy + dz * dz > range * range) continue;

        const ix = (a.x + b.x) * 0.5;
        const iy = (a.y + b.y) * 0.5;
        const iz = (a.z + b.z) * 0.5;
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
        if (equalPower && !this.dialogueFlags.has("sukuna_challenger")) {
          this.dialogueFlags.add("sukuna_challenger");
          this.queueDialogue("sukuna", "你才是挑战者。", 2.7, 3);
        }
        break;
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
          e.vx += dirx * b.knock;
          e.vz += dirz * b.knock;
          this.damage(e, b.damage, owner, b.abilityId);
        }
      }
      if (b.life <= 0) b.alive = false;
    }
    this.beams = this.beams.filter((b) => b.alive);
  }

  updateDomains(dt) {
    for (const d of this.domains) {
      if (!d.alive) continue;
      d.life -= dt;
      d.tickTimer -= dt;
      if (d.tickTimer <= 0) {
        d.tickTimer = d.tick;
        const owner = this.entities.find((x) => x.id === d.ownerId);
        for (const e of this.entities) {
          if (!e.alive || e.team === d.team) continue;
          const dx = e.x - d.x;
          const dy = (e.y + CHEST) - d.y;
          const dz = e.z - d.z;
          if (dx * dx + dy * dy + dz * dz <= d.radius * d.radius) this.damage(e, d.damage, owner, d.abilityId);
        }
      }
      if (d.life <= 0) d.alive = false;
    }
    this.domains = this.domains.filter((d) => d.alive);
  }

  // ---- effects ----
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
    let slowFactor = 1;
    for (const d of this.domains) {
      if (d.ownerId === e.id || d.team === e.team) continue;
      const dx = e.x - d.x;
      const dy = (e.y + CHEST) - d.y;
      const dz = e.z - d.z;
      if (dx * dx + dy * dy + dz * dz <= d.radius * d.radius) {
        slowFactor = Math.min(slowFactor, d.type === "void" ? 0.25 : 0.5);
      }
    }

    const speed = e.speed * slowFactor * (e.sprinting && e.dashTimer <= 0 ? SPRINT.multiplier : 1);
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

    const vt = e.moveInput.y || 0;
    e.vy = lerp(e.vy, vt * FLIGHT.speed, Math.min(1, dt * 16));
    e.y += e.vy * dt;
    if (e.y < 0) { e.y = 0; e.vy = Math.max(0, e.vy); }
    if (e.y > FLIGHT.maxAlt) { e.y = FLIGHT.maxAlt; e.vy = Math.min(0, e.vy); }

    e.moving = Math.hypot(e.moveInput.x, e.moveInput.z) > 0.05;

    const damp = Math.pow(0.0001, dt);
    e.vx *= damp;
    e.vz *= damp;
    if (Math.abs(e.vx) < 0.05) e.vx = 0;
    if (Math.abs(e.vz) < 0.05) e.vz = 0;

    const lim = ARENA.half;
    e.x = clamp(e.x, -lim, lim);
    e.z = clamp(e.z, -lim, lim);

    for (let i = 0; i < e.cooldowns.length; i += 1) {
      if (e.cooldowns[i] > 0) e.cooldowns[i] = Math.max(0, e.cooldowns[i] - dt);
    }
    e.invuln = Math.max(0, e.invuln - dt);
    if (e.dashCooldown > 0) e.dashCooldown = Math.max(0, e.dashCooldown - dt);
    if (this.practice) { e.charge = 100; e.domainCharge = 100; }

    const dir = this.fireDir(e);
    const targetYaw = Math.atan2(dir.x, dir.z);
    let d = targetYaw - e.yaw;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    e.yaw += d * Math.min(1, dt * 18);
  }

  updateAI(dt) {
    const ai = this.entities.find((e) => !e.isPlayer && e.alive && !e.dummy);
    const target = this.entities.find((e) => e.isPlayer && e.alive);
    if (!ai || !target) return;
    const profile = DIFFICULTY[this.difficulty];

    // an unfinished combo window must expire, or the AI keeps reaching for a
    // finisher (e.g. 开) it can no longer cast and stops attacking entirely
    if (ai.comboChain?.length && this.elapsed - (ai.lastComboAt || 0) > 1.3) ai.comboChain = [];

    const dx = target.x - ai.x;
    const dz = target.z - ai.z;
    const dist = Math.hypot(dx, dz) || 1;
    const nx = dx / dist;
    const nz = dz / dist;

    ai.aiTimer -= dt;
    if (ai.aiTimer <= 0) {
      ai.aiTimer = rand(0.6, 1.4);
      ai.aiStrafe *= Math.random() < 0.4 ? -1 : 1;
    }

    let mx = 0;
    let mz = 0;
    if (dist > 17) { mx = nx; mz = nz; }
    else if (dist < 9) { mx = -nx; mz = -nz; }
    else { mx = -nz * ai.aiStrafe; mz = nx * ai.aiStrafe; }
    mx += nx * 0.25;
    mz += nz * 0.25;
    const ml = Math.hypot(mx, mz) || 1;

    // the AI picks its own altitude and flies there on its own schedule
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
    const dyAlt = ai.aiAlt - ai.y;
    let my = 0;
    if (Math.abs(dyAlt) > 1.2) my = clamp(dyAlt * 0.4, -0.95, 0.95);

    ai.sprinting = (dist > 18 || Math.abs(target.y - ai.y) > 8) && ai.dashTimer <= 0;
    this.setMove(ai, (mx / ml) * profile.speed, (mz / ml) * profile.speed, my);

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
      if (alignment > rand(profile.aimMin, profile.aimMax) || waited > profile.forcedShotMs / 1000) {
        const idx = this.pickAiAbility(ai, dist);
        if (idx >= 0) {
          if (this.tryCast(ai, idx)) {
            ai.aiWaitStarted = this.elapsed;
            ai.aiCastCd = rand(profile.reactionMin, profile.reactionMax);
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
    if (ai.cooldowns[idx] > 0) return false;
    if (ability.needsCharge && ai.charge < 100) return false;
    if (ability.needsDomain && ai.domainCharge < 100) return false;
    return true;
  }

  pickAiAbility(ai, dist) {
    const abilities = CHARACTERS[ai.charId].abilities;
    const combos = CHARACTERS[ai.charId].combos || [];
    const ready = (idx) => this.aiAbilityReady(ai, idx);

    // 1) finish a combo that is one hit away (only if the finisher is actually castable)
    for (const c of combos) {
      const n = c.seq.length;
      if (ai.comboChain.length < n - 1) continue;
      const tail = ai.comboChain.slice(-(n - 1));
      if (!tail.every((id, i) => id === c.seq[i])) continue;
      const idx = abilities.findIndex((a) => a.id === c.seq[n - 1]);
      if (idx >= 0 && ready(idx)) return idx;
    }

    // 2) summon Mahoraga
    const hasSummon = this.entities.some((e) => e.summon && e.ownerId === ai.id && e.alive);
    if (!hasSummon && ready(4) && this.elapsed > 6 && Math.random() < 0.6) return 4;

    // 3) domain when the target is inside its reach
    if (ready(3) && dist < 18) return 3;

    // 4) ultimate when charged and roughly in line
    if (ready(2) && dist < 42) return 2;

    // 5) mid-range secondary
    if (ready(1) && dist < 30 && Math.random() < 0.65) return 1;

    // 6) basic
    if (ready(0)) return 0;
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
    this.updateDialogue(dt);
    if (this.state !== "playing") { this.updateEffects(dt); return; }
    this.elapsed += dt;
    if (this.hitStop > 0) { this.hitStop -= dt; this.updateEffects(dt * 0.3); return; }
    for (const e of this.entities) this.updateEntity(e, dt);
    if (this.mode === "single") this.updateAI(dt);
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
    if (this.mode === "single" && DIFFICULTY[this.difficulty].gojoRegen) {
      const gojo = this.entities.find((e) => e.isPlayer && e.charId === "gojo");
      if (gojo?.alive && gojo.hp < gojo.maxHp) {
        gojo.hp = clamp(gojo.hp + GOJO_REGEN_PER_SECOND * dt, 0, gojo.maxHp);
      }
    }
    this.updateProjectiles(dt);
    this.updateBeams(dt);
    this.updateDomains(dt);
    this.updateEffects(dt);
  }
}


