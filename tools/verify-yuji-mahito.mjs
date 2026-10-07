import assert from "node:assert/strict";
import { Game3D } from "../src/Game3D.js";
import { CHARACTERS } from "../src/config3d.js";
import { updateShibuya, castSoulDomain } from "../src/shibuyaBattle.js";
import { buildShibuyaFighter, buildShibuyaArena } from "../src/three/shibuya.js";

function duel(stage = "shibuyaFinal", difficulty = "normal") {
  const game = new Game3D(); game.modeFamily = "story";
  game.setStory(stage, "ally"); game.start("story", difficulty);
  assert.equal(game.player().charId, "yujiShibuya");
  assert.equal(game.state, "playing", "new story never uses Gojo awakening artwork");
  const yuji = game.player(), mahito = game.entities.find(e => e.charId.startsWith("mahito"));
  yuji.x = mahito.x = 0; yuji.z = 0; mahito.z = 2.5;
  return { game, yuji, mahito, todo: game.entities.find(e => e.support) };
}
for (const diff of ["easy", "normal", "shura", "abyss"]) {
  const { game, yuji, mahito, todo } = duel("shibuyaClash", diff);
  assert.notEqual(yuji.team, mahito.team); assert.equal(todo.team, yuji.team);
  assert.equal(game.tryForceRestore(yuji), false); assert.equal(game.canUseSimpleDomain(yuji), false);
  assert.equal(game.tryCast(yuji, 2), false, "black flash needs an opportunity");
  const positions = [yuji.x, yuji.z, todo.x, todo.z];
  assert.equal(game.tryCast(yuji, 3), true);
  assert.deepEqual([todo.x, todo.z, yuji.x, yuji.z], positions, "real two-fighter exchange");
  mahito.hp = mahito.maxHp * .4;
  updateShibuya(game, .01);
  assert.equal(game.shibuya.domainUsed, true);
  assert.equal(todo.charId, "todoInjured");
  assert.equal(game.state, "playing", "domain event does not auto-win or pause combat");
  assert.equal(updateShibuya(game, 3.1), false);
  assert.equal(game.state, "playing", "player still has to defeat Mahito");
  mahito.invuln = 0; game.damage(mahito, 1000, yuji, "yujiPunch");
  assert.equal(mahito.hp, 0, "ordinary punch can finish first phase");
  assert.equal(game.state, "ended"); assert.equal(game.winner, yuji);
}
{
  const { game, yuji, mahito, todo } = duel();
  const positions = [yuji.x, yuji.z, todo.x, todo.z];
  assert.equal(game.tryCast(yuji, 3), true);
  assert.deepEqual([yuji.x, yuji.z, todo.x, todo.z], positions, "final clap is a feint, not a swap");
  yuji.cooldowns[3] = 0; assert.equal(game.tryCast(yuji, 3), false);
  mahito.invuln = 0; const before = mahito.hp;
  assert.equal(game.tryCast(yuji, 1), true); game.updateEntity(yuji, .13); assert.ok(mahito.hp < before);
  const firstHit = mahito.hp; game.elapsed = .3; game.updateEntity(mahito, .3); updateShibuya(game, .3);
  assert.ok(mahito.hp < firstHit, "Divergent Fist has an actual delayed second hit");
  assert.ok(yuji.blackFlashUntil > game.elapsed);
  game.timeStop = game.hitStop = 0; game.updateEntity(yuji, .21);
  assert.equal(game.tryCast(yuji, 2), true);
  game.updateEntity(mahito, .25); game.updateEntity(yuji, .25);
  assert.equal(yuji.blackFlashUntil, 0);
  mahito.invuln = 0; game.damage(mahito, 1000, yuji, "yujiPunch"); assert.equal(mahito.hp, 0, "final phase permits an ordinary finisher");
  assert.equal(game.state, "ended"); assert.equal(game.winner, yuji);
  game.setStory("yuta", "ally"); game.start("story"); assert.equal(game.shibuya, null); assert.deepEqual(game.soulDelays, []);
}
{
  const { game, yuji, mahito } = duel();
  game.tryCast(yuji, 1); game.updateEntity(yuji, .13); yuji.z = 20; game.elapsed = .3; updateShibuya(game, .3);
  assert.equal(yuji.blackFlashUntil, undefined, "delayed fist misses outside close range");
  game.modeFamily = "free"; game.freePlayerChar = "yujiShibuya"; game.freeEnemyChar = "mahito"; game.start("single");
  const p = game.player(), m = game.entities.find(e => !e.isPlayer);
  assert.equal(game.shibuya, null); assert.equal(game.entities.length, 2); assert.equal(game.tryCast(p, 3), false);
  m.invuln = 0; game.damage(m, 1000, p, "yujiPunch"); assert.equal(game.state, "ended", "free battle has no story HP floor");
}
{
  const { game, yuji } = duel("shibuyaClash");
  const m = game.entities.find(e => e.charId === "mahito"); const hp = yuji.hp;
  castSoulDomain(game, m); assert.equal(yuji.hp, hp, "brief soul domain does not freely transfigure Sukuna's vessel");
  assert.equal(m.burnout, 6);
}
for (const id of ["yujiShibuya", "mahito", "mahitoFinal", "todoShibuya", "todoInjured"]) {
  assert.ok(CHARACTERS[id].grounded);
  const model = buildShibuyaFighter(id); assert.equal(typeof model.userData.animate, "function");
  model.userData.animate(.2, 1); assert.ok(model.getObjectByName("head"));
  if (id === "todoInjured") assert.equal(model.getObjectByName("foreL").getObjectByName("hand"), undefined);
  if (id === "mahitoFinal") assert.ok(model.getObjectByName("elbow_blade"));
}
for (const stage of ["shibuyaClash", "shibuyaFinal"]) assert.ok(buildShibuyaArena(stage).getObjectByName("shibuya_asphalt"));
for (const stage of ["shibuyaClash", "shibuyaFinal"]) {
  const { game, yuji, mahito } = duel(stage, "easy");
  // Exercise the actual update loop, cooldowns, AI, dashes, hit-stop and final kill.
  for (let frame = 0; frame < 7200 && game.state === "playing"; frame++) {
    const dx = mahito.x - yuji.x, dz = mahito.z - yuji.z, distance = Math.hypot(dx, dz) || 1;
    game.setMove(yuji, distance > 2.7 ? dx / distance : 0, distance > 2.7 ? dz / distance : 0, 1);
    game.setAim(yuji, mahito.x, mahito.z);
    if (distance < 3.4) {
      if (yuji.blackFlashUntil > game.elapsed) game.tryCast(yuji, 2);
      else if (yuji.cooldowns[1] <= 0) game.tryCast(yuji, 1);
      else game.tryCast(yuji, 0);
      game.tryCast(yuji, 4);
    }
    game.update(1 / 60);
    assert.equal(yuji.y, 0, "grounded even when ascent is requested");
  }
  assert.equal(game.state, "ended", `${stage} can complete through normal simulation`);
  assert.equal(game.winner, yuji, `${stage} is winnable with its advertised combo`);
}
for (const stage of ["shibuyaClash", "shibuyaFinal"]) {
  for (const side of ["ally", "enemy"]) {
    for (const difficulty of ["easy", "normal", "shura", "abyss"]) {
      const game = new Game3D(); game.modeFamily = "story";
      game.setStory(stage, side); game.start("story", difficulty);
      const player = game.player();
      const yuji = game.entities.find(e => e.charId === "yujiShibuya");
      const mahito = game.entities.find(e => e.charId.startsWith("mahito"));
      const todo = game.entities.find(e => e.support);
      assert.equal(game.storySide, side);
      assert.equal(player, side === "enemy" ? mahito : yuji);
      assert.equal(todo.team, yuji.team);
      assert.notEqual(yuji.team, mahito.team);
      if (side === "enemy") {
        game.update(1 / 60);
        assert.equal(game.state, "playing");
        if (stage === "shibuyaClash") {
          mahito.hp = mahito.maxHp * .4; updateShibuya(game, .01);
          assert.equal(todo.charId, "todoInjured");
        }
        assert.equal(game.tryCast(yuji, 3), true, "Todo support stays available to opposing Yuji");
        yuji.invuln = 0; game.damage(yuji, 1000, mahito, "soulBlade");
        assert.equal(game.state, "ended"); assert.equal(game.winner, player);
      }
      const opposite = side === "enemy" ? "ally" : "enemy";
      game.setStory(stage, opposite); game.start("story", difficulty);
      assert.equal(game.player().charId, opposite === "ally" ? "yujiShibuya" : stage === "shibuyaClash" ? "mahito" : "mahitoFinal");
    }
  }
}
console.log("Shibuya: four difficulties, grounded canon loadouts, soul damage, delayed fist, Black Flash window, Todo swaps/one feint, 0.2s domain, phase endings and free battle verified.");
