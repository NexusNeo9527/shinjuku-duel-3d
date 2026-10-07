import assert from "node:assert/strict";
import { Game3D } from "../src/Game3D.js";
import { CHARACTERS } from "../src/config3d.js";

function duel(side = "ally", mode = "dual", difficulty = "normal") {
  const game = new Game3D();
  game.modeFamily = "story";
  game.setStory("borrowed", side);
  game.start(mode, difficulty);
  game.timeStop = game.hitStop = 0;
  const yuta = game.entities.find(e => e.charId === "yutaGojo");
  const sukuna = game.entities.find(e => e.charId === "sukunaStory2");
  Object.assign(yuta, { x: 0, y: 0, z: 2 });
  Object.assign(sukuna, { x: 0, y: 0, z: 0 });
  return { game, yuta, sukuna };
}

for (const mode of ["story", "dual"]) for (const side of ["ally", "enemy"]) {
  const { game, yuta, sukuna } = duel(side, mode);
  assert.equal(game.domains.length, 2);
  const health = [yuta.hp, sukuna.hp];
  game.updateDomains(2);
  assert.deepEqual([yuta.hp, sukuna.hp], health, "sure-hits cancel during contention");
  assert.equal(game.inVoidStun(sukuna), false);
  assert.equal(game.tryForceRestore(yuta), false);
  assert.equal(game.canUseSimpleDomain(yuta), false);
}
assert.equal(duel("ally", "story", "easy").game.storyTimer, 110);
assert.equal(duel("enemy", "story", "easy").game.storyTimer, 90);

{
  const { game, yuta, sukuna } = duel();
  const hp = yuta.hp;
  game.damage(yuta, 10, sukuna, "bodyHeavy");
  assert.equal(yuta.hp, hp, "Infinity stops unamplified physical attacks");
  assert.equal(game.tryCast(sukuna, 3), true);
  game.damage(yuta, 10, sukuna, "bodyHeavy");
  assert.equal(yuta.hp, hp - 10, "amplification permits physical contact");
  sukuna.invuln = 0;
  game.damage(sukuna, 8, yuta, "blue");
  assert.equal(sukuna.hp, sukuna.maxHp - 4, "amplification mitigates Blue");
  game.updateBorrowedCast(sukuna, 5);
  assert.equal(sukuna.amplification, false);
  assert.equal(sukuna.amplificationEnergy, 0);
  assert.equal(game.tryCast(sukuna, 3), false, "no free reactivation at zero energy");
  game.updateBorrowedCast(sukuna, 2);
  assert.ok(sukuna.amplificationEnergy > 0);
}

{
  const { game, yuta, sukuna } = duel();
  yuta.charge = 100;
  assert.equal(game.tryCast(yuta, 2), true);
  assert.equal(game.beams.length, 0, "Purple is not instant");
  assert.equal(game.tryDash(yuta, 0, 0, 1), false);
  assert.equal(game.tryCast(yuta, 4), false, "guard cannot cancel preparation");
  game.setMove(yuta, 1, 1, 1);
  const position = [yuta.x, yuta.y, yuta.z];
  game.updateEntity(yuta, 0.1);
  assert.deepEqual([yuta.x, yuta.y, yuta.z], position, "preparation locks all movement axes");
  sukuna.amplification = true;
  game.damage(yuta, 6, sukuna, "bodyJab");
  assert.equal(yuta.pendingCast, null);
  assert.equal(yuta.charge, 50, "interruption refunds half the resource");
  assert.ok(yuta.cooldowns[2] >= 3);
  game.updateBorrowedCast(yuta, 3);
  assert.equal(game.beams.length, 0, "interrupted Purple cannot fire later");
}

{
  const { game, yuta, sukuna } = duel();
  assert.equal(game.recorderReady(), true, "recording needs no hit-count prerequisite");
  for (let i = 0; i < 3; i++) { sukuna.invuln = 0; game.damage(sukuna, 6, yuta, "bodyJab"); }
  for (let i = 0; i < 2; i++) { sukuna.invuln = 0; game.damage(sukuna, 8, yuta, "blue"); }
  assert.equal(game.recorderReady(), true);
  game.timeStop = game.hitStop = 0;
  assert.equal(game.tryCast(yuta, 3), true);
  assert.equal(sukuna.stun, 1.6);
  assert.equal(game.tryCast(yuta, 3), false, "external support has one use");
  yuta.charge = 100;
  assert.equal(game.tryCast(yuta, 2), true, "recording use leaves Purple available");
}

{
  const { game, yuta, sukuna } = duel();
  sukuna.z = -7;
  yuta.charge = 100;
  assert.equal(game.tryCast(yuta, 2), true);
  game.updateBorrowedCast(yuta, 2.21);
  assert.equal(game.beams.length, 1);
  game.hitStop = 0; // Advance gameplay after the beam's presentation freeze.
  game.storyTimer = 0.001;
  game.update(0.016);
  assert.equal(game.state, "playing", "a nonlethal Purple and domain timeout do not decide victory");
  assert.ok(sukuna.alive && sukuna.hp < sukuna.maxHp, "Purple deals ordinary health damage");
  assert.equal(Boolean(yuta.knockedDown), false);
  assert.equal(game.domains.length, 0);
  game.timeStop = game.hitStop = 0;
  game.updateEntity(sukuna, .6); // Finish the beam's hit stun before the next input.
  assert.equal(game.tryBasicAttack(sukuna), true, "combat continues after domains end");
  sukuna.invuln = 0;
  game.damage(sukuna, 10000, yuta, "blue");
  assert.equal(game.state, "ended");
  assert.equal(game.winner, yuta);
}

{
  const { game, yuta, sukuna } = duel();
  sukuna.hp = 1;
  game.damage(sukuna, 8, yuta, "blue");
  assert.equal(sukuna.hp, 0);
  assert.equal(game.state, "ended", "ordinary damage wins without Purple");
  assert.equal(game.winner, yuta);
}

{
  const { game, yuta, sukuna } = duel();
  sukuna.amplification = true;
  yuta.hp = 1;
  game.damage(yuta, 6, sukuna, "bodyJab");
  assert.equal(game.state, "ended", "player defeat settles immediately");
  assert.equal(game.winner, sukuna);
}

{
  const { game, sukuna, yuta } = duel();
  yuta.z = 8;
  assert.equal(game.tryCast(sukuna, 2), true);
  assert.equal(sukuna.dashTimer, 0, "pursuit has a telegraphed startup");
  game.updateBorrowedCast(sukuna, 0.36);
  assert.ok(sukuna.dashTimer > 0);
  assert.equal(sukuna.invuln, 0, "pursuit has no evasive invulnerability");
  game.updateBorrowedCast(sukuna, 0.21);
  assert.equal(sukuna.recovery, 0.55);
  assert.equal(yuta.charge, 12, "evading one pursuit awards resource once");
}

assert.equal(CHARACTERS.gojo.abilities[1].id, "red");
assert.equal(CHARACTERS.sukuna.abilities[0].type, "orb");
assert.equal(CHARACTERS.sukunaStory1.abilities[0].id, "slash");
console.log("Borrowed-body contention, amplification, interruption, recording, pursuit and defeat-based outcomes verified.");
