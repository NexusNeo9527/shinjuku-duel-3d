import { beginCombatMotion } from "./combatMotion.js";
import { STORY_STAGES, CHARACTERS } from "./config3d.js";

export const isShibuyaStory = game => game.mode === "story" && Boolean(STORY_STAGES[game.storyStage]?.shibuya);
export function startShibuya(game) {
  game.shibuya = null;
  game.soulDelays = [];
  if (!isShibuyaStory(game)) return;
  const final = game.storyStage === "shibuyaFinal";
  game.shibuya = { phase: "combat", final, domainUsed: final, feintUsed: false };
  const yuji = game.entities.find(e => e.charId === "yujiShibuya");
  const todo = game.makeEntity(final ? "todoInjured" : "todoShibuya", yuji.x + 6, yuji.z + 2, false);
  Object.assign(todo, { id: "todo_support", summon: true, support: true, team: yuji.team, ownerId: yuji.id, life: Infinity });
  game.entities.push(todo);
}
export function shibuyaAbilityLocked(game, entity, ability) {
  if (ability.id === "yujiBlackFlash") {
    const target = game.enemyList(entity).find(e => !e.summon && e.alive);
    return !(entity.blackFlashUntil > game.elapsed) || !target || Math.hypot(target.x - entity.x, target.z - entity.z) > ability.range;
  }
  if (isShibuyaStory(game) && game.shibuya?.phase !== "combat") return true;
  if (ability.id === "todoSupport") return !isShibuyaStory(game) || ((game.shibuya.final || game.shibuya.domainUsed) && game.shibuya.feintUsed);
  // Player-controlled Mahito may trigger the same one-time chapter event.
  if (ability.id === "mahitoDomain" && isShibuyaStory(game)) return !entity.isPlayer || game.shibuya.domainUsed;
  return false;
}
export function castSoulDomain(game, entity) {
  if (!isShibuyaStory(game)) {
    game.castDomain(entity, { id: 'mahitoDomain', label: '自闭圆顿裹', type: 'domain', closedBarrier: true, radius: 16, exteriorRadius: 12, life: 5, tick: .65, damage: 20, color: '#b5a3d8', core: '#eee2f4' });
    return;
  }
  entity.soulDomainUntil = game.elapsed + .2;
  entity.burnout = 6;
  if (!game.shibuya.domainUsed) {
    game.shibuya.domainUsed = true;
    injureTodo(game);
  }
  beginCombatMotion(entity, "mahitoDomain", game.elapsed);
  game.burst(entity.x, 1.2, entity.z, "#b5a3d8", 80, 12);
  game.flash = .7;
  game.announce("自闭圆顿裹 · 0.2秒", "#b5a3d8", 2);
  // Yuji houses Sukuna. This is not an ordinary lethal soul-transfiguration tick.
  const enemy = game.enemyList(entity).find(e => !e.summon && e.alive);
  if (enemy && Math.hypot(enemy.x - entity.x, enemy.z - entity.z) < 12) {
    if (enemy.charId === "yujiShibuya") game.queueDialogue("mahito", "只能展开一瞬，不能再触怒宿傩。", 2.5, 7);
    else if (!(enemy.simpleDomainTimer > 0) && !(enemy.wickerBasketTimer > 0) && CHARACTERS[enemy.charId]?.cursedEnergy !== 0) game.damage(enemy, 20, entity, "mahitoDomain");
  }
}
function injureTodo(game) {
  const todo = game.entities.find(e => e.support);
  if (!todo || todo.charId === 'todoInjured') return;
  // Ch. 130: the attempted defense is slower than Mahito's activation.
  game.trySimpleDomain(todo);
  todo.simpleDomainTimer = 0; todo.simpleDomainIntegrity = 0;
  game.queueDialogue('todoShibuya', '简易领域……来不及了！', 2, 8);
  todo.id = 'todo_support_injured'; todo.charId = 'todoInjured'; todo.name = '东堂葵 · 左手损伤';
  game.queueDialogue('todoInjured', '左手中了术式……兄弟，继续战斗！', 3, 9);
  game.announce('东堂左手损伤 · 支援改为一次佯攻 · 继续击败真人', '#e6c780', 3);
}
export function castTodoSupport(game, yuji) {
  const state = game.shibuya;
  const todo = game.entities.find(e => e.support && e.alive);
  const target = game.enemyList(yuji).find(e => !e.summon && e.alive);
  if (!state || !todo || !target) return;
  beginCombatMotion(todo, "todoSupport", game.elapsed);
  if (state.final || state.domainUsed) {
    state.feintUsed = true;
    target.stun = Math.max(target.stun, 1);
    game.queueDialogue("todoInjured", "即使不能再交换，也能让你误判。", 2.5, 7);
    game.announce("东堂佯装拍手 · 制造攻击机会", "#e6c780", 3);
  } else {
    // Boogie Woogie swaps two cursed-energy-bearing fighters, not a teleport attack.
    [yuji.x, todo.x] = [todo.x, yuji.x];
    [yuji.z, todo.z] = [todo.z, yuji.z];
    game.queueDialogue("todoShibuya", "别停下，兄弟！", 2, 6);
    game.announce("不义游戏 · 虎杖与东堂换位", "#e6c780", 2);
  }
  game.burst(todo.x, 1.5, todo.z, "#e6c780", 30, 3);
}
export function updateShibuya(game, dt) {
  for (const hit of game.soulDelays || []) {
    hit.remaining -= dt;
    if (hit.remaining > 0 || hit.done) continue;
    hit.done = true;
    const { source, target } = hit;
    if (!source.alive || !target.alive || source.cursedEnergyConfiscated || Math.hypot(source.x - target.x, source.z - target.z) > 4.5) continue;
    if (!game.damage(target, 8, source, "divergentDelay", hit.attackId)) continue;
    source.blackFlashUntil = game.elapsed + 2;
    target.stun = Math.max(target.stun, .45);
    game.announce("逕庭拳 · 延迟命中 · 2秒黑闪机会", "#ff867e", 2);
  }
  game.soulDelays = (game.soulDelays || []).filter(h => !h.done);
  const state = game.shibuya;
  if (!isShibuyaStory(game) || !state || game.state !== "playing") return false;
  const yuji = game.entities.find(e => e.charId === "yujiShibuya");
  const mahito = game.entities.find(e => e.charId.startsWith("mahito"));
  const todo = game.entities.find(e => e.support);
  if (state.phase === "combat") {
    // Support follows outside the duel rather than behaving as a summoned curse.
    if (todo) { todo.x += (yuji.x + 6 - todo.x) * Math.min(1, dt * 2); todo.z += (yuji.z + 2 - todo.z) * Math.min(1, dt * 2); todo.yaw = yuji.yaw; }
    if (!state.domainUsed && mahito.alive && mahito.hp <= mahito.maxHp * .45 && yuji.alive) {
      castSoulDomain(game, mahito);
    }
    return false;
  }
  return false;
}
