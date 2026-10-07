import { CHARACTERS, STORY_STAGES } from './config3d.js';
import { beginCombatMotion } from './combatMotion.js';
import { chaseDirection, reactToThreat } from './battleQuality.js';
import { caseForDefendant, decideVerdict, confiscationFor, confiscationLocks, COURT_RESPONSES } from './judgeman.js';
export const isRaid = game => game.isStoryCombat() && Boolean(STORY_STAGES[game.storyStage]?.raid);
export const AMBER_LIFETIME = 90; // Gameplay adaptation, not a canonical duration.
function activateAmber(game, entity) {
  if (entity.amberActivated) return;
  entity.amberActivated = true;
  entity.amberUntil = game.elapsed + AMBER_LIFETIME;
  game.announce('幻兽琥珀 · 不可逆发动 · 90秒后肉体崩解（游戏改编）', '#9ee9ee', 3);
}
function enterCourt(game) {
  const main = game.entities.filter(e => !e.summon);
  const center = { x: (main[0].x + main[1].x) / 2, z: (main[0].z + main[1].z) / 2 };
  game.raid.courtCenter = center;
  game.raid.resumePositions = game.entities.map(e => ({ id: e.id, x: e.x, y: e.y, z: e.z }));
  game.entities.forEach((e, i) => {
    e.x = center.x + (i === 0 ? -2 : i === 1 ? 2 : 6); e.y = 0; e.z = center.z + 2;
    e.raidCast = null; e.vx = e.vy = e.vz = 0; e.dashTimer = 0; game.setMove(e, 0, 0, 0);
    e.pendingCast = null; e.meleeAttack = null; e.meleeRecovery = 0;
    e.queuedInput = null; e.combatAction = null; e.blackFlashUntil = 0;
  });
  // Nonviolence cancels attacks already in flight as well as their queued follow-ups.
  game.projectiles = []; game.beams = []; game.soulDelays = [];
}
function prepareHearing(game, owner, target) {
  const state = game.raid;
  state.ownerId = owner.id; state.condemned = target.id;
  state.caseFile = caseForDefendant(target.charId, state);
  state.response = null; state.verdict = null; state.swordGranted = false;
  state.defaultResponse = target.charId.startsWith('sukuna') || (state.culling && state.round === 2) ? 'confess' : 'deny';
  // A player can take time to read and respond; leaving it alone follows the chapter response.
  state.responseGrace = target.isPlayer ? 9 : 0;
  enterCourt(game);
  game.announce(`诛伏赐死 · ${target.name} · ${state.caseFile.charge}`, '#e9bc70', 3);
}
export function respondToCourt(game, entity, response) {
  const state = game.raid;
  if (game.state !== 'playing' || !(state?.trial > 0) || state.condemned !== entity?.id || !COURT_RESPONSES.includes(response) || state.response) return false;
  state.response = response; state.responseGrace = 0;
  return true;
}
export function startRaid(game) {
  game.raid = null;
  if (!isRaid(game) && !game.entities.some(e => ['higuruma', 'kashimo', 'sukunaRaid'].includes(e.charId))) return;
  game.raid = { trial: 0, judged: false, used: false, condemned: null, swordGranted: false, round: 1 };
  if (isRaid(game) && STORY_STAGES[game.storyStage]?.culling) {
    const yuji = game.entities.find(e => e.charId === 'yujiCulling');
    const judge = game.entities.find(e => e.charId === 'higurumaCulling');
    yuji.team = 'gojo'; judge.team = 'sukuna';
    Object.assign(game.raid, { culling: true, trial: 2.5, round: 1, condemned: yuji.id, swordGranted: false });
    prepareHearing(game, judge, yuji);
    return;
  }
  const sukuna = game.entities.find(e => e.charId === 'sukunaRaid');
  if (sukuna) sukuna.kamutoke = true;
  if (isRaid(game) && game.storyStage === 'kashimoDuel') {
    const kashimo = game.entities.find(e => e.charId === 'kashimo');
    if (kashimo) activateAmber(game, kashimo);
  }
  if (!isRaid(game)) return;
  if (game.storyStage !== 'higurumaRaid') return;
  const owner = game.entities.find(e => e.charId === 'higuruma');
  const yuji = game.makeEntity('yujiRaid', owner.x + 5, owner.z, false);
  Object.assign(yuji, { id: 'yuji_raid_support', team: owner.team, summon: true, companion: true, ownerId: owner.id, life: Infinity });
  game.entities.push(yuji);
}
export function raidAbilityLocked(game, entity, ability) {
  if (ability.maxUses && (entity.abilityUses?.[ability.id] || 0) >= ability.maxUses) return true;
  if (entity.amberExhausted) return true;
  if (confiscationLocks(entity, ability)) return true;
  if (entity.techniqueExtinguishedUntil > game.elapsed && ability.requiresTechnique) return true;
  if (entity.wickerBasketTimer > 0 && !['sukunaStory1', 'sukunaStory2', 'sukunaRaid'].includes(entity.charId) && ability.id !== 'wickerBasket') return true;
  if (game.raid?.trial > 0 || entity.raidCast) return true;
  if (ability.id === 'kamutoke') return !entity.kamutoke;
  if (ability.id === 'kashimoDischarge') return (entity.electricHits || 0) < 3;
  if (ability.id === 'sentencing') return Boolean(game.raid?.used);
  if (ability.id === 'appealCourt') return !game.raid?.culling || !game.raid.judged || game.raid.round >= 2;
  if (ability.id === 'cullingExecution') return !game.raid?.swordGranted;
  if (ability.id === 'executionerSword') return !game.raid?.swordGranted || game.raid.ownerId !== entity.id || entity.guardTimer > 0;
  if (entity.charId === 'higuruma' && entity.guardTimer > 0 && ability.id !== 'higurumaHeal') return true;
  return false;
}
export function castRaid(game, entity, ability, dir) {
  if (entity.charId === 'kashimo' && ['amberSound', 'amberRay'].includes(ability.id)) activateAmber(game, entity);
  const state = game.raid;
  if (ability.type === 'appeal') {
    state.round = 2; state.trial = 2.5;
    prepareHearing(game, game.entities.find(e => e.id === state.ownerId), entity);
  } else if (ability.type === 'sentencing') {
    if (!state) return false;
    state.used = true; state.trial = 2.5;
    const target = game.enemyList(entity).find(e => !e.summon && e.alive);
    if (!target || CHARACTERS[target.charId]?.cursedEnergy === 0) {
      state.trial = 0;
      game.announce('零咒力目标不被封闭领域自动捕获 · 未进行审判', '#e9bc70', 3);
    } else if (game.domains.some(d => d.alive && d.team !== entity.team)) {
      state.trial = 0;
      game.announce('对方领域正在展开 · 审判未成立', '#e9bc70', 2);
    } else prepareHearing(game, entity, target);
  } else if (ability.type === 'discharge') {
    const target = game.enemyList(entity).find(e => !e.summon && e.alive);
    entity.electricHits = 0;
    if (target) { game.damage(target, ability.damage, entity, ability.id); game.burst(target.x, 1.2, target.z, ability.color, 50, 8); }
  } else if (ability.type === 'execution' || ability.type === 'raidWindup') {
    entity.raidCast = { ability, dir: { ...dir }, remaining: ability.windup };
    entity.dashTimer = 0;
    game.announce(ability.type === 'execution' ? '处刑人之剑 · 蓄势刺击' : '龙鳞 · 反发 · 成双之流星 · 闪避斩击', ability.color, ability.windup);
  } else return false;
  return true;
}
export function raidDamageBlocked(game, target, source, id) {
  if (game.raid?.trial > 0) return true;
  if (id === 'kamutoke' && target.charId === 'kashimo') {
    game.announce('鹿紫云的电性质 · 神武解无效', '#9ee9ee', 1);
    return true;
  }
  return false;
}
export function recordRaidHit(game, target, source, id) {
  if (source?.charId === 'kashimo' && ['kashimoPunch', 'basicAttack'].includes(id)) {
    source.electricHits = Math.min(3, (source.electricHits || 0) + 1);
  }
}
export function updateRaid(game, dt) {
  if (game.state === 'playing') for (const entity of game.entities) {
    if (entity.alive && entity.amberActivated && game.elapsed >= entity.amberUntil) {
      entity.amberExhausted = true;
      entity.hp = 0;
      entity.meleeAttack = entity.pendingCast = entity.raidCast = entity.queuedInput = null;
      game.announce('幻兽琥珀结束 · 肉体崩解', '#9ee9ee', 3);
      game.kill(entity);
    }
  }
  if (game.state === 'ended') return true;
  if (!game.raid || game.state !== 'playing') return false;
  const state = game.raid;
  const judge = game.entities.find(e => e.id === state.ownerId);
  if (state.swordGranted && judge && !judge.alive) state.swordGranted = false;
  if (state.trial > 0) {
    if (state.responseGrace > 0) {
      state.responseGrace = Math.max(0, state.responseGrace - dt);
      return true;
    }
    state.trial = Math.max(0, state.trial - dt);
    if (!state.trial) {
      for (const position of state.resumePositions || []) {
        const entity = game.entities.find(e => e.id === position.id);
        if (entity) Object.assign(entity, { x: position.x, y: position.y, z: position.z });
      }
      state.resumePositions = [];
      state.judged = true;
      const target = game.entities.find(e => e.id === state.condemned);
      state.verdict = decideVerdict(state.caseFile, state.response || state.defaultResponse);
      const confiscation = target && state.verdict.guilty ? confiscationFor(target, CHARACTERS[target.charId]) : null;
      state.confiscation = confiscation;
      if (confiscation?.kind === 'tool') { target.kamutoke = false; target.confiscatedTool = confiscation.id; }
      if (confiscation?.kind === 'technique') { target.techniqueConfiscated = true; target.infinityTimer = 0; target.pendingCast = null; }
      if (confiscation?.kind === 'energy') { target.cursedEnergyConfiscated = true; target.simpleDomainTimer = 0; target.wickerBasketTimer = 0; target.blackFlashUntil = 0; }
      state.swordGranted = state.verdict.death;
      game.announce(`${state.verdict.label}${confiscation ? ' · 没收'+confiscation.label : ''}`, '#ffd685', 4);
      if (state.culling) {
        if (state.round === 1 && state.verdict.guilty) {
          game.queueDialogue('yujiCulling', '没有咒力，也要想办法让他答应。', 3, 8);
        } else if (state.swordGranted) state.mercyRemaining = 3;
      } else if (target?.charId.startsWith('sukuna') && confiscation?.kind === 'tool') {
        game.queueDialogue('higuruma', '被没收的是咒具，宿傩的术式仍然可用。虎杖，继续！', 4, 8);
      }
    }
    return true;
  }
  if (state.culling && state.swordGranted && state.mercyRemaining !== undefined) {
    state.mercyRemaining -= dt;
    if (state.mercyRemaining <= 0) {
      state.swordGranted = false;
      const judge = game.entities.find(e => e.charId === 'higurumaCulling');
      if (judge?.raidCast?.ability.type === 'execution') judge.raidCast = null;
      game.queueDialogue('higurumaCulling', '真正杀人的是宿傩。你没有必要承担他的罪。', 4, 9);
      game.announce('日车撤回处刑人之剑 · 继续击败对手即可通关', '#e9bc70', 4);
    }
  }
  for (const e of game.entities) {
    if (!e.alive || !e.raidCast) continue;
    e.raidCast.remaining -= dt;
    game.setMove(e, 0, 0, 0);
    if (e.raidCast.remaining > 0) continue;
    const { ability, dir } = e.raidCast;
    e.raidCast = null;
    if (ability.type === 'execution') {
      const target = game.entities.find(t => t.id === state.condemned && t.alive);
      const dx = target?.x - e.x, dz = target?.z - e.z;
      const distance = Math.hypot(dx, dz);
      const alignment = (dx * dir.x + dz * dir.z) / (distance || 1);
      if (state.swordGranted && state.verdict?.death && target && distance <= ability.range && alignment > .5) game.damage(target, 10000, e, ability.id);
      else game.announce('处刑人之剑 · 刺击落空', '#e9bc70', 1);
      beginCombatMotion(e, 'katana', game.elapsed);
    } else game.castBeam(e, { ...ability, type: 'beam' }, dir);
    if (game.state !== 'playing') return true;
  }
  return false;
}
// Keep the active ally separate from the ordinary duel AI and curse-summon AI.
export function updateRaidAI(game, dt) {
  for (const e of game.entities) {
    if (e.isPlayer || !e.alive || e.dummy) continue;
    const target = game.enemyList(e).find(t => t.alive && !t.summon);
    if (!target || e.stun > 0 || e.raidCast) { game.setMove(e, 0, 0, 0); continue; }
    if (reactToThreat(game, e, target, dt)) continue;
    const dx = target.x - e.x, dz = target.z - e.z, dist = Math.hypot(dx, dz) || 1;
    game.setAim(e, target.x, target.z);
    e.yaw = Math.atan2(dx, dz);
    const direction = chaseDirection(game, e, target, dt);
    game.setMove(e, dist > 2.6 ? direction.x : 0, dist > 2.6 ? direction.z : 0, 0);
    e.aiCastCd -= dt;
    if (e.aiCastCd > 0) continue;
    const abilities = CHARACTERS[e.charId].abilities;
    const ready = abilities.map((a, i) => ({ a, i })).filter(({ a, i }) => game.aiAbilityReady(e, i) && !raidAbilityLocked(game, e, a) &&
      (!['melee', 'execution'].includes(a.type) || Math.hypot(dist,target.y-e.y) <= a.range) &&
      (a.type !== 'guard' || target.meleeAttack || target.raidCast || game.domains.some(d=>d.alive&&d.team!==e.team)) &&
      (a.type !== 'heal' || e.hp < e.maxHp*.6));
    const preferred = ready.find(({ a }) => a.type === 'heal') || ready.find(({ a }) => a.id === 'kashimoDischarge' || a.id === 'cullingExecution') || ready[Math.floor(Math.random() * ready.length)];
    if (preferred) game.tryCast(e, preferred.i);
    const profile = game.getDifficultyProfile();
    e.aiCastCd = e.companion ? 1.3 : profile.reactionMin + Math.random() * (profile.reactionMax - profile.reactionMin);
  }
}
