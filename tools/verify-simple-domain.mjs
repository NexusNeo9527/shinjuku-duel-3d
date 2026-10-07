import assert from "node:assert/strict";
import { Game3D } from "../src/Game3D.js";
import { SIMPLE_DOMAIN } from "../src/config3d.js";
import { BINDINGS, loadInputSettings } from "../src/inputSettings.js";

function duel() {
  const game = new Game3D();
  game.start("dual", "normal");
  game.timeStop = game.hitStop = 0;
  const gojo = game.entities.find((entity) => entity.charId === "gojo");
  const sukuna = game.entities.find((entity) => entity.charId === "sukuna");
  gojo.x = gojo.z = sukuna.x = sukuna.z = 0;
  sukuna.domainCharge = 100;
  assert.equal(game.tryCast(sukuna, 3), true);
  game.timeStop = game.hitStop = 0;
  return { game, gojo, sukuna };
}

{
  const { game, gojo, sukuna } = duel();
  gojo.burnout = 6;
  assert.equal(game.trySimpleDomain(gojo), true, "can deploy during innate-technique burnout");
  assert.equal(game.trySimpleDomain(gojo), false, "an active barrier cannot be refreshed");
  const hp = gojo.hp;
  for (let i = 0; i < Math.ceil(SIMPLE_DOMAIN.integrity / 5); i++) game.updateDomains(0.4);
  assert.equal(gojo.hp, hp, "sure-hits, including the final erosion tick, are neutralized");
  assert.equal(gojo.simpleDomainTimer, 0, "Shrine erodes the barrier");
  assert.equal(game.domains.length, 1, "Simple Domain leaves the opposing expansion intact");
  game.updateDomains(0.4);
  assert.ok(gojo.hp < hp, "sure-hit damage resumes after the barrier breaks");
  assert.equal(game.trySimpleDomain(gojo), false, "cooldown survives destruction");
  game.updateEntity(gojo, SIMPLE_DOMAIN.cooldown);
  assert.equal(game.trySimpleDomain(gojo), true, "can redeploy after cooldown");
  sukuna.z = 10;
  const beforeOrdinaryHit = gojo.hp;
  game.damage(gojo, 10, sukuna, "slash");
  assert.ok(gojo.hp < beforeOrdinaryHit, "ordinary techniques still damage the protected caster");
  assert.equal(game.trySimpleDomain(sukuna), false, "Sukuna retains his own anti-domain loadout");
  game.finishEnd();
  assert.equal(gojo.simpleDomainTimer, 0, "settlement clears the effect");
}

{
  const { game, gojo, sukuna } = duel();
  game.domains[0].type = "void";
  game.domains[0].radius = 80;
  assert.equal(game.inVoidStun(gojo), false, 'contact with the caster exempts the target');
  gojo.z = sukuna.z + 5;
  assert.equal(game.inVoidStun(gojo), true);
  assert.equal(game.trySimpleDomain(gojo), true);
  assert.equal(game.inVoidStun(gojo), false, "the sure-hit suppression also relieves Void's lockout");
  game.updateEntity(gojo, SIMPLE_DOMAIN.duration);
  assert.equal(game.inVoidStun(gojo), true, "Void's lockout resumes when the effect expires");
  gojo.simpleDomainCooldown = 0;
  game.domains[0].tickSerial = 1;
  assert.equal(game.trySimpleDomain(gojo), false, 'cannot deploy after Void information has already immobilized the target');
  gojo.stun = 1;
  assert.equal(game.trySimpleDomain(gojo), false, "ordinary hit stun still prevents deployment");
  gojo.stun = 0;
  gojo.alive = false;
  assert.equal(game.trySimpleDomain(gojo), false);
  gojo.alive = true;
  game.state = "paused";
  assert.equal(game.trySimpleDomain(gojo), false);
  assert.equal(game.canUseSimpleDomain(game.makeEntity("yutaGojo", 0, 0, true)), false, "borrowed body is not proof of learning Simple Domain");
  assert.equal(game.canUseSimpleDomain(game.makeEntity("yuta", 0, 0, true)), false);
  void sukuna;
}

{
  const { game, gojo } = duel();
  game.practice = true;
  game.practiceInfinite = true;
  gojo.simpleDomainCooldown = 10;
  assert.equal(game.trySimpleDomain(gojo), true, "infinite practice allows deployment during cooldown");
}

{
  const game = new Game3D();
  game.singleChar = "sukuna";
  game.start("single", "normal");
  game.timeStop = game.hitStop = 0;
  const sukuna = game.player();
  const gojo = game.entities.find((entity) => !entity.isPlayer);
  gojo.x = gojo.z = sukuna.x = sukuna.z = 0;
  sukuna.domainCharge = 100;
  assert.equal(game.tryCast(sukuna, 3), true);
  game.timeStop = game.hitStop = 0;
  game.updateAI(0.016);
  assert.ok(gojo.simpleDomainTimer > 0, "Gojo AI responds to a nearby opposing domain");
}

// Period-specific access also applies in free battle and to actual human allies.
{
  const game = new Game3D();
  for (const id of ["gojo", "yujiRaid", "todoShibuya"]) {
    assert.equal(game.canUseSimpleDomain(game.makeEntity(id, 0, 0, true)), true, id);
  }
  for (const id of ["gojoTeen", "gojoAwakened", "yujiShibuya", "yujiCulling", "todoInjured", "yuta", "yutaGojo", "yutaGojoFree", "higuruma", "kashimo", "mahito", "sukuna"]) {
    assert.equal(game.canUseSimpleDomain(game.makeEntity(id, 0, 0, true)), false, id);
  }
  const curse = game.makeEntity("gojo", 0, 0, false); curse.summon = true;
  assert.equal(game.canUseSimpleDomain(curse), false, "ordinary summons cannot acquire the human skill");
  game.modeFamily = "free"; game.freePlayerChar = "yujiRaid"; game.freeEnemyChar = "sukuna";
  game.start("single"); game.timeStop = game.hitStop = 0;
  const yuji = game.player(); yuji.burnout = 5;
  assert.equal(game.trySimpleDomain(yuji), true, "trained Yuji can deploy during burnout");
  yuji.simpleDomainTimer = 0; yuji.simpleDomainCooldown = 0; yuji.cursedEnergyConfiscated = true;
  assert.equal(game.trySimpleDomain(yuji), false, "energy confiscation prevents deployment");
}
{
  const game = new Game3D(); game.modeFamily = "story";
  game.setStory("higurumaRaid", "ally"); game.start("story");
  game.timeStop = game.hitStop = 0; game.raid.trial = 0;
  const yuji = game.entities.find(e => e.charId === "yujiRaid");
  const sukuna = game.entities.find(e => e.charId === "sukunaRaid");
  assert.equal(game.canUseSimpleDomain(yuji), true, "trained human companion remains eligible");
  game.castDomain(sukuna, { id: "testShrine", label: "御厨子", type: "shrine", radius: 80, life: 10, tick: .5, damage: 5, openBarrier: true });
  game.timeStop = game.hitStop = 0; game.updateAI(.016);
  assert.ok(yuji.simpleDomainTimer > 0, "raid ally automatically counters opposing domain");
  const hp = yuji.hp; game.updateDomains(.5);
  assert.equal(yuji.hp, hp, "ally Simple Domain suppresses sure-hit damage");
}
{
  const game = new Game3D(); game.modeFamily = "story";
  game.setStory("shibuyaClash", "ally"); game.start("story");
  game.timeStop = game.hitStop = 0;
  const todo = game.entities.find(e => e.support);
  assert.equal(game.trySimpleDomain(todo), true, "pre-injury Todo can deploy despite support bookkeeping");
  todo.simpleDomainTimer = 0; todo.simpleDomainCooldown = 0;
  const mahito = game.entities.find(e => e.charId === "mahito");
  mahito.hp = mahito.maxHp * .4; game.update(.016);
  assert.equal(todo.charId, "todoInjured");
  assert.ok(todo.simpleDomainCooldown > 0, "Todo attempted a response to 0.2s domain");
  assert.equal(todo.simpleDomainTimer, 0, "Mahito was faster, no persistent barrier after injury");
  assert.equal(game.trySimpleDomain(todo), false, "injured stage does not invent a new activation");
}
assert.equal(new Set(BINDINGS.map((binding) => binding.defaultCode)).size, BINDINGS.length, "new keyboard defaults do not conflict");
const previousBindings = Object.fromEntries(BINDINGS.filter((binding) => !binding.id.endsWith(".simpleDomain")).map((binding) => [binding.id, binding.defaultCode]));
previousBindings["p1.descend"] = "KeyC";
previousBindings["p2.descend"] = "Period";
globalThis.localStorage = { getItem: () => JSON.stringify({ bindings: previousBindings }) };
const migrated = loadInputSettings().bindings;
assert.equal(migrated["p1.descend"], "KeyC", "adding Simple Domain preserves customized C binding");
assert.equal(migrated["p2.descend"], "Period", "adding Simple Domain preserves customized period binding");
assert.equal(new Set(Object.values(migrated)).size, BINDINGS.length, "new controls choose unused keys on migration");
delete globalThis.localStorage;
console.log("Simple Domain: burnout, sure-hit suppression, erosion, ordinary damage, expiry, cooldown, eligibility, AI, key migration and cleanup verified.");
