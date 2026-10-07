import assert from "node:assert/strict";
import { Game3D } from "../src/Game3D.js";
import { CHARACTERS, ARENA } from "../src/config3d.js";

const shrine = CHARACTERS.sukuna.abilities[3];
assert.equal(shrine.openBarrier, true);
assert.equal(shrine.closedBarrier, false);
assert.equal(shrine.canonMaxRadius, 200);
assert.equal(shrine.radius,200);
assert.equal(ARENA.metersPerUnit,1);

function duel(enemy = "gojo") {
  const game = new Game3D();
  game.modeFamily = "free";
  game.freePlayerChar = "sukuna";
  game.freeEnemyChar = enemy;
  game.start("dual");
  return game;
}

// The border is traversable and the sure-hit stops outside its real range.
let game = duel("toji");
let [sukuna, target] = game.entities;
sukuna.x = sukuna.z = -71; target.x = -66; target.z = -71;
game.castDomain(sukuna, shrine);
assert.equal(game.closedDomain(), undefined);
assert.equal(target.domainReturnPosition, undefined);
target.invuln = 1;
game.updateDomains(0.2);
assert.ok(target.hp < target.maxHp, "sure-hit bypasses ordinary dash immunity");
assert.equal(game.domains[0].visualTargets[0].slashKind, "dismantle", "zero cursed energy is targeted by Dismantle");
game.resolveWorldMovement(target, target.x, target.z, 71, 71);
assert.equal(target.x, 71);
assert.equal(target.z,71);
assert.ok(Math.hypot(target.x-sukuna.x,target.z-sukuna.z)>shrine.radius);
const escapedHp = target.hp;
game.updateDomains(0.5);
assert.equal(target.hp, escapedHp, "escaped targets receive no domain ticks");

// From the centre, the real 200m sphere covers every legal corner and flight altitude.
game = duel(); [sukuna,target] = game.entities; sukuna.x=sukuna.y=sukuna.z=0;
game.castDomain(sukuna,shrine);
for(const x of [-71,0,71]) for(const z of [-71,0,71]) for(const y of [0,30]) {
 Object.assign(target,{x,y,z,invuln:0}); const hp=target.hp;
 game.domains[0].tickTimer=0; game.updateDomains(.001);
 assert.ok(target.hp<hp,`sure-hit reaches legal world position ${x},${y},${z}`);
}
// Both control sides retain the same canon range. Only the ch.262 clash focuses it.
for(const side of ['ally','enemy']) {
 const borrowed=new Game3D(); borrowed.setStory('borrowed',side); borrowed.start('story','normal');
 const open=borrowed.domains.find(d=>d.openBarrier), closed=borrowed.closedDomain();
 assert.equal(open.rangeMode,'barrierFocused'); assert.ok(open.radius<shrine.radius);
 assert.equal(closed.exteriorRadius,.12); assert.ok(closed.radius>closed.exteriorRadius,'expanded interior is distinct from basketball shell');
 const extent=Math.hypot(closed.exteriorX-open.x,closed.exteriorY-open.y,closed.exteriorZ-open.z)+closed.exteriorRadius;
 assert.ok(open.radius>=extent && open.radius<extent+.11,'focused range just encloses the physical shell');
}

// Casting order must not change the open/closed-domain interaction.
for (const openFirst of [true, false]) {
  game = duel();
  const [owner, gojo] = game.entities;
  for (const fighter of openFirst ? [owner, gojo] : [gojo, owner]) {
    game.castDomain(fighter, CHARACTERS[fighter.charId].abilities[3]);
  }
  assert.equal(game.domains.length, 2);
  const health = game.entities.map((entity) => entity.hp);
  game.updateDomains(0.2);
  assert.deepEqual(game.entities.map((entity) => entity.hp), health, "sure-hits cancel during contention");
  game.updateDomains(3.3);
  assert.equal(game.domains.length, 1);
  assert.equal(game.domains[0].type, "shrine");
  assert.ok(gojo.burnout > 0);
  assert.equal(owner.burnout, 0);
}

game = duel();
[sukuna, target] = game.entities;
game.castDomain(sukuna, shrine);
const domain = game.domains[0];
game.castBeam(target, CHARACTERS.gojo.abilities[2], game.fireDir(target));
assert.equal(domain.alive, true, "the visual shrine is not a destructible barrier");
game.damage(sukuna, 35, target, "purple");
assert.equal(domain.alive, false, "injury ends domain maintenance");
assert.ok(sukuna.burnout > 0);

game = duel();
[sukuna, target] = game.entities;
game.castDomain(sukuna, shrine);
game.timeStop = game.hitStop = 0;
assert.equal(game.trySimpleDomain(target), true);
const guardedHp = target.hp;
game.updateDomains(0.2);
assert.equal(target.hp, guardedHp, "Simple Domain neutralizes sure-hit while intact");
assert.ok(target.simpleDomainIntegrity < 32);
console.log("Open Shrine: escape, sure-hit, no cursed energy, both cast orders, exterior erosion, maintenance and Simple Domain verified.");
