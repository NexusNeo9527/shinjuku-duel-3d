import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game3D } from "../src/Game3D.js";
import { respondToCourt, updateRaidAI } from '../src/shinjukuRaid.js';
import { CHARACTERS, COPY_TECHNIQUES, STORY_STAGES } from "../src/config3d.js";
import { reactToThreat } from '../src/battleQuality.js';

// Headless starts below finish cinematic time explicitly; the browser normally
// advances this presentation clock separately from Game3D.update().
const game = new Game3D();
game.setStory("yuta", "ally");
game.start("story", "normal");game.timeStop=0;
assert.equal(game.player().charId, "yuta");
assert.equal(game.entities.find((e) => !e.isPlayer).charId, "sukunaStory1");
assert.equal(CHARACTERS.sukunaStory1.abilities.some((a) => a.id === "mahoraga" || a.id === "shrine"), false);
assert.equal(CHARACTERS.yuta.abilities.length, 5);
assert.equal(CHARACTERS.sukuna.abilities[0].type, "orb", "legacy Sukuna keeps the original ranged loadout");
for (const stage of ["yuta", "borrowed"]) {
  const duel = new Game3D();
  duel.setStory(stage, "ally");
  duel.start("story", "normal");duel.timeStop=0;
  const sukuna = duel.entities.find((entity) => !entity.isPlayer);
  const yuta = duel.player();
  const attacks = CHARACTERS[sukuna.charId].abilities.slice(0, 3);
  assert.ok(attacks.every((ability) => ability.type === "melee"), `${stage} Sukuna only has melee attacks`);
  if (stage === "borrowed") {
    assert.equal(duel.domains.length, 2, "borrowed domains remain in contention");
    assert.equal(CHARACTERS[sukuna.charId].abilities[3].id, "amplification");
    duel.updateAI(0.016);
    assert.ok(sukuna.moveInput.z > 0, "borrowed Sukuna closes distance");
    continue;
  }
  sukuna.charge = 100;
  sukuna.domainCharge = 0;
  sukuna.cooldowns.fill(0);
  assert.equal(duel.pickAiAbility(sukuna, 80), -1, `${stage} Sukuna does not select attacks at range`);
  const meleeIndex = duel.pickAiAbility(sukuna, 3);
  assert.equal(CHARACTERS[sukuna.charId].abilities[meleeIndex].type, "melee", `${stage} Sukuna attacks at close range`);
  if (stage === "borrowed") {
    sukuna.domainCharge = 100;
    assert.equal(duel.pickAiAbility(sukuna, 4), 3, "borrowed-stage Shrine remains available at close range");
    assert.equal(duel.pickAiAbility(sukuna, 80), -1, "borrowed-stage Shrine is not cast from a distance");
  }
  duel.updateAI(0.016);
  const towardOpponent = sukuna.moveInput.x * (yuta.x - sukuna.x) + sukuna.moveInput.z * (yuta.z - sukuna.z);
  assert.ok(towardOpponent > 0, `${stage} Sukuna closes distance instead of hovering at range`);
}
const yuta = game.player();
game.cycleCopy(yuta);
assert.equal(COPY_TECHNIQUES[yuta.copyIndex].id, "skyBreak");
assert.equal(game.tryCast(yuta, 2), true);
assert.equal(game.projectiles.at(-1).abilityId, "skyBreak");

const skillArtCases = [
  ["yuta", "ally", "yuta", 1, null, "yuta-rika"],
  ["yuta", "ally", "yuta", 2, 0, "yuta-cursed-speech"],
  ["yuta", "ally", "yuta", 2, 1, "yuta-sky-break"],
  ["yuta", "ally", "yuta", 2, 2, "yuta-jacobs-ladder"],
  ["yuta", "ally", "yuta", 4, null, "yuta-heal"],
  ["yuta", "enemy", "sukunaStory1", 3, null, "sukuna-guard"],
  ["yuta", "enemy", "sukunaStory1", 4, null, "sukuna-heal"],
];
for (const [stage, side, charId, slot, copyIndex, art] of skillArtCases) {
  const duel = new Game3D();
  duel.setStory(stage, side);
  duel.start("story", "normal");duel.timeStop=0;
  const caster = duel.entities.find((e) => e.charId === charId);
  caster.charge = 100;
  if (copyIndex !== null) caster.copyIndex = copyIndex;
  assert.equal(duel.tryCast(caster, slot), true, `${charId} can cast slot ${slot}`);
  assert.equal(duel.cutIn?.art, art, `${charId} slot ${slot} displays its illustration`);
  const png = readFileSync(new URL(`../public/assets/${art}.png`, import.meta.url));
  assert.equal(png.toString("hex", 0, 4), "89504e47", `${art} is a PNG`);
}

const meleeArtDuel = new Game3D();
meleeArtDuel.setStory("yuta", "ally");
meleeArtDuel.start("story", "normal");meleeArtDuel.timeStop=0;
const meleeYuta = meleeArtDuel.player();
const meleeSukuna = meleeArtDuel.entities.find((entity) => !entity.isPlayer);
assert.equal(meleeArtDuel.tryCast(meleeYuta, 0), true, "Yuta's melee skill remains usable");
assert.equal(meleeArtDuel.cutIn, null, "Yuta's melee skill does not show an illustration");
meleeArtDuel.updateEntity(meleeYuta, .13);
meleeArtDuel.updateEntity(meleeYuta, .21);
assert.equal(meleeArtDuel.tryBasicAttack(meleeYuta), true, "basic attack remains usable");
assert.equal(meleeArtDuel.cutIn, null, "basic attacks do not show skill illustrations");
assert.equal(meleeArtDuel.tryCast(meleeSukuna, 0), true, "Sukuna's melee attack remains usable");
assert.equal(meleeArtDuel.cutIn, null, "Sukuna's close-range attacks do not show illustrations");

const slashDuel = new Game3D();
slashDuel.setStory("yuta", "enemy");
slashDuel.start("story", "easy");slashDuel.timeStop=0;
const slashCaster = slashDuel.player();
const slashTarget = slashDuel.entities.find((e) => e !== slashCaster);
Object.assign(slashCaster, { x: 0, y: 0, z: 0, charge: 100, aim: { x: 0, z: 5 } });
Object.assign(slashTarget, { x: 0, y: 0, z: 5 });
assert.equal(slashDuel.tryCast(slashCaster, 2), true);
slashDuel.updateBeams(0.016);
assert.ok(Number.isFinite(slashTarget.vx) && Number.isFinite(slashTarget.vz), "世界斩命中后位置速度保持有效");

game.setStory("borrowed", "enemy");
game.start("story", "shura");game.timeStop=0;
assert.equal(game.player().charId, "sukunaStory2");
assert.equal(game.entities.find((e) => !e.isPlayer).charId, "yutaGojo");
assert.equal(game.storyTimer, 90);
assert.equal(game.domains.length, 2, "opening domains do not instantly shatter");
game.storyTimer = 0.001;
game.update(0.016);
assert.equal(game.state, "playing", "barrier expiry does not settle the chapter");
assert.equal(game.winner, null);
assert.equal(game.domains.length, 0);
game.update(3);
assert.equal(game.state, "playing", "combat continues without a special finisher");

game.start("dual", "normal");game.timeStop=0;
game.timeStop = 0;
const gojo = game.player();
const sukuna = game.entities.find((e) => e !== gojo);
gojo.domainCharge = 100;
sukuna.domainCharge = 100;
assert.equal(game.tryCast(gojo, 3), true);
game.timeStop = 0; // Renderer finishes the cinematic before the next input.
assert.equal(game.tryCast(sukuna, 3), true);
game.timeStop = 0;
assert.equal(game.domains.length, 2, "open versus closed domains coexist instead of instantly shattering");
game.updateDomains(3.5);
assert.equal(game.domains.length, 1, "outside slashes eventually break the closed barrier");
assert.equal(game.domains[0].type, "shrine");
assert.ok(gojo.burnout > 0 && sukuna.burnout === 0);
assert.equal(game.tryCast(gojo, 0), false, "burnout blocks cursed techniques");
assert.equal(game.tryBasicAttack(gojo), true, "physical attack remains available");
const hp = gojo.hp;
assert.equal(game.tryForceRestore(gojo), true);
assert.equal(gojo.hp, hp - 20);
assert.equal(gojo.burnout, 0);
assert.equal(gojo.domainLocked, true);
gojo.domainCharge = 100;
assert.equal(game.tryCast(gojo, 3), false, "forced recovery locks domain for the match");

game.start("dual", "normal");game.timeStop=0;
const attacker = game.player();
const defender = game.entities.find((e) => e !== attacker);
defender.domainCharge = 100;
assert.equal(game.tryCast(defender, 3), true);
const opposingDomain = game.domains[0];
const beam = CHARACTERS.gojo.abilities[2];
const direction = game.fireDir(attacker);
game.castBeam(attacker, beam, direction);
game.castBeam(attacker, beam, direction);
assert.equal(opposingDomain.alive, true, "shooting the shrine does not destroy the open domain");
assert.equal(defender.burnout, 0);
game.damage(defender, 35, attacker, "purple");
assert.equal(opposingDomain.alive, false, "injuring Sukuna prevents domain maintenance");
assert.ok(defender.burnout > 0);

game.start("dual", "normal");game.timeStop=0;
const lower = game.player();
const upper = game.entities.find((e) => e !== lower);
lower.x = upper.x = 0;
lower.z = upper.z = 0;
lower.y = 0;
upper.y = 0.2;
game.update(0.016);
assert.ok(lower.y >= 0 && upper.y >= 0, "collision separation cannot bury a fighter below the floor");

const buildingDuel = new Game3D();
buildingDuel.start("dual", "normal");buildingDuel.timeStop=0;
buildingDuel.setWorldObstacles([{ minX: -2, maxX: 2, minY: 0, maxY: 10, minZ: -2, maxZ: 2 }]);
const walker = buildingDuel.player();
Object.assign(walker, { x: -4, z: 0, speed: 100, moveInput: { x: 1, y: 0, z: 0 } });
buildingDuel.updateEntity(walker, 0.1);
assert.ok(walker.x <= -2.69, "continuous movement stops at a building instead of crossing it");
Object.assign(walker, { x: -4, z: 0, moveInput: { x: 0, y: 0, z: 0 }, dashTimer: 0.2, dashVx: 100, dashVy: 0, dashVz: 0 });
buildingDuel.updateEntity(walker, 0.1);
assert.ok(walker.x <= -2.69, "dash movement also collides with buildings");
Object.assign(walker, { x: 2.5, z: 0, speed: 2, dashTimer: 0, moveInput: { x: 1, y: 0, z: 0 } });
buildingDuel.updateEntity(walker, 0.1);
assert.ok(walker.x >= 2.69, "a fighter already overlapping a building is ejected toward the nearest side");
buildingDuel.updateEntity(walker, 0.1);
assert.ok(walker.x > 2.7, "a fighter can move outward after being ejected from a building");
Object.assign(walker, { x: -4, z: 0, y: 11, speed: 100, dashTimer: 0, moveInput: { x: 1, y: 0, z: 0 } });
buildingDuel.updateEntity(walker, 0.1);
assert.ok(walker.x > 2, "fighters can fly above a building shorter than their altitude");

game.start("single", "normal");game.timeStop=0;
assert.equal(game.player().charId, "gojo", "legacy single mode still starts");
game.start("practice", "normal");game.timeStop=0;
const trainee = game.player();
game.enterBurnout(trainee);
assert.equal(game.tryCast(trainee, 0), false, "practice infinite toggle does not bypass burnout");

for (const name of ["yuta", "rika", "yuta_gojo", "sukuna_shinjuku", "story_yuta", "story_borrowed", "malevolent-shrine"]) {
  const bytes = readFileSync(new URL(`../public/models/${name}.glb`, import.meta.url));
  assert.equal(bytes.toString("ascii", 0, 4), "glTF", `${name} is a GLB`);
  assert.ok(bytes.length > 20000, `${name} has geometry`);
  const jsonSize = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonSize));
  if (name === "malevolent-shrine") {
    assert.equal(gltf.scenes.length, 1, `${name} exports one active scene`);
    assert.equal(gltf.meshes.length, 12, `${name} keeps the twelve material batches`);
    const shrinePrimitives = gltf.meshes.flatMap((mesh) => mesh.primitives);
    assert.equal(shrinePrimitives.length, 12, `${name} keeps one primitive per material batch`);
    for (const primitive of shrinePrimitives) {
      assert.ok(primitive.attributes.POSITION !== undefined, `${name} has positions`);
      assert.ok(primitive.attributes.COLOR_0 !== undefined, `${name} keeps portable vertex colors`);
    }
  } else if (name.startsWith("story_")) {
    assert.ok(gltf.nodes.some((node) => node.name?.startsWith("breakable_")), `${name} has breakable props`);
    assert.ok(gltf.nodes.filter((node) => node.name?.startsWith("tower_") && node.name.includes("_core")).length >= 10,
      `${name} retains named tower cores used for building collision`);
  } else {
    assert.equal(gltf.scenes.length, 1, `${name} exports only the active character scene`);
    assert.equal(gltf.scenes[0].nodes.length, 1, `${name} has no unrelated scene objects`);
    assert.ok(!gltf.nodes.some((node) => node.name === "Cube"), `${name} excludes Blender's default cube`);
    const joints = gltf.nodes.map((node) => node.name?.replace(/[_\.]?\d+$/, ""));
    for (const joint of ["hips", "torso", "head", "armL", "armR", "foreL", "foreR"])
      assert.ok(joints.includes(joint), `${name} retains animation joint ${joint}`);
    if (name === "sukuna_shinjuku") {
      for (const joint of ["armLowerL", "armLowerR", "foreLowerL", "foreLowerR"])
        assert.ok(joints.includes(joint), `Sukuna retains articulated ${joint}`);
    }
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
      const position = gltf.accessors[primitive.attributes.POSITION];
      assert.ok(position.count > 0 && [...position.min, ...position.max].every(Number.isFinite), `${name} has finite vertex bounds`);
    }
  }
}


function duel(side = "ally", mode = "dual", difficulty = "normal") {
  const game = new Game3D();
  game.modeFamily = "story";
  game.setStory("borrowed", side);
  game.start(mode, difficulty);game.timeStop=0;
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
  game.timeStop = 0; // The renderer's cinematic clock runs independently of simulation.
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
console.log("Story modes, copy skills, burnout, forced recovery and GLB assets verified.");

function raidFixture(stage, difficulty = 'normal', side = 'ally') {
  const raidGame = new Game3D(); raidGame.modeFamily = 'story';
  raidGame.setStory(stage, side); raidGame.start('story', difficulty);raidGame.timeStop=0;
  const p = raidGame.player(), enemy = raidGame.enemyList(p).find(e => !e.summon);
  assert(enemy && p.team !== enemy.team, 'raid combatants must be opposing teams');
  return { g: raidGame, p, enemy };
}
assert.equal(STORY_STAGES.kashimoDuel.next, 'higurumaRaid');
assert.equal(STORY_STAGES.higurumaRaid.next, 'yuta');
const lightning = raidFixture('kashimoDuel');
assert.equal(lightning.g.tryCast(lightning.p, 2), false, 'discharge needs deposited charge');
const untouched = lightning.p.hp;
lightning.g.damage(lightning.p, 30, lightning.enemy, 'kamutoke');
assert.equal(lightning.p.hp, untouched, 'Kamutoke cannot damage Kashimo');
lightning.enemy.z = lightning.p.z - 2;
for (let i = 0; i < 3; i++) {
  lightning.g.hitStop = 0; // Presentation pause is advanced separately in this direct-entity fixture.
  lightning.enemy.invuln = 0; lightning.p.cooldowns[0] = 0;
  assert(lightning.g.tryCast(lightning.p, 0));
  lightning.g.elapsed += .13; lightning.g.updateEntity(lightning.p, .13);
  lightning.g.elapsed += .21; lightning.g.updateEntity(lightning.p, .21);
}
assert.equal(lightning.p.electricHits, 3);
lightning.enemy.invuln = 0;
lightning.g.hitStop = 0;
assert(lightning.g.tryCast(lightning.p, 2));
assert.equal(lightning.p.electricHits, 0, 'discharge consumes deposited charge');

const trial = raidFixture('higurumaRaid');
const yuji = trial.g.entities.find(e => e.companion);
assert(yuji && yuji.team === trial.p.team && yuji.charId === 'yujiRaid');
assert.equal(trial.g.tryCast(trial.p, 2), false, 'no sword before verdict');
assert(trial.g.tryCast(trial.p, 1));
const trialHp = trial.p.hp;
trial.g.damage(trial.p, 40, trial.enemy, 'slash');
assert.equal(trial.p.hp, trialHp, 'court prohibits violence');
assert.equal(trial.g.tryBasicAttack(trial.enemy), false);
assert.equal(trial.g.tryDash(trial.enemy, 1, 0, 0), false);
trial.g.update(2.6);
assert.equal(trial.enemy.kamutoke, false);
assert.equal(trial.g.tryCast(trial.enemy, 2), false, 'confiscated weapon stays unavailable');
assert.equal(trial.g.tryCast(trial.p, 1), false, 'one trial per encounter');
assert(trial.g.tryCast(trial.enemy, 0), 'Shrine technique remains available after confiscation');
trial.enemy.z = trial.p.z - 2;
trial.g.setAim(trial.p, trial.enemy.x, trial.enemy.z);
assert(trial.g.tryCast(trial.p, 2));
trial.enemy.x += 8;
trial.g.update(.7);
assert(trial.enemy.alive, 'execution strike can be dodged');
trial.enemy.x = trial.p.x; trial.enemy.z = trial.p.z - 2; trial.enemy.invuln = 0; trial.p.cooldowns[2] = 0;
trial.g.setAim(trial.p, trial.enemy.x, trial.enemy.z);
assert(trial.g.tryCast(trial.p, 2));
trial.g.update(.7);
assert.equal(trial.g.winner, trial.p, 'only the condemned target is executed and win settles normally');

const assist = raidFixture('higurumaRaid');
const activeYuji = assist.g.entities.find(e => e.companion);
activeYuji.x = assist.enemy.x; activeYuji.z = assist.enemy.z + 2;
activeYuji.aiCastCd = 0;
const beforeAssist = assist.enemy.hp;
assist.g.updateAI(.1);
assist.g.updateEntity(activeYuji, .13);
assert(assist.enemy.hp < beforeAssist, 'Yuji actively damages Sukuna');
activeYuji.invuln = 0; assist.g.damage(activeYuji, 10000, assist.enemy, 'cleave');
assert(!activeYuji.alive && assist.g.state === 'playing', 'support loss does not force defeat');

for (const stage of ['kashimoDuel', 'higurumaRaid']) {
  let lastHp = 0, lastDamage = 0;
  for (const difficulty of ['easy', 'normal', 'shura', 'abyss']) {
    const fight = raidFixture(stage, difficulty);
    assert(fight.enemy.maxHp > lastHp); lastHp = fight.enemy.maxHp;
    fight.g.damage(fight.p, 20, fight.enemy, 'slash');
    const dealt = fight.p.maxHp - fight.p.hp;
    assert(dealt > lastDamage); lastDamage = dealt;
    for (let i = 0; i < 200 && fight.g.state === 'playing'; i++) {
      fight.enemy.invuln = 0; fight.g.damage(fight.enemy, 10, fight.p, 'basicAttack');
    }
    assert.equal(fight.g.winner, fight.p, `${stage}/${difficulty}: ordinary attacks win`);
    const loss = raidFixture(stage, difficulty);
    loss.g.damage(loss.p, 10000, loss.enemy, 'cleave');
    assert.equal(loss.g.winner, loss.enemy, 'player defeat settles without support locking result');
  }
}
for (const id of ['kashimo', 'sukunaRaid', 'yujiRaid']) assert(!CHARACTERS[id].abilities.some(a => a.type === 'domain' || a.id === 'mahoraga' || a.id === 'flame'), 'period-appropriate loadouts');
console.log('Kashimo/Higuruma raids: charge, electric immunity, trial, confiscation, dodgeable execution, active Yuji, ordinary outcomes and four difficulties verified.');
const raidRestart = raidFixture('higurumaRaid');
raidRestart.g.tryCast(raidRestart.p, 1);
raidRestart.g.setStory('borrowed'); raidRestart.g.start('story');raidRestart.g.timeStop=0;
assert.equal(raidRestart.g.raid, null, 'trial state cannot leak into the next encounter');
assert.equal(raidRestart.g.domains.length, 2, 'borrowed domains still succeed after interrupted trial');

const culling = raidFixture('cullingTrial');
assert.equal(culling.p.charId, 'yujiCulling');
assert.equal(culling.enemy.charId, 'higurumaCulling');
assert.equal(culling.g.entities.length, 2, 'theater battle is a one-on-one duel');
assert.equal(culling.g.raid.round, 1);
const cullingHp = culling.p.hp;
culling.g.damage(culling.p, 20, culling.enemy, 'gavel');
assert.equal(culling.p.hp, cullingHp, 'first hearing forbids violence');
assert.equal(culling.g.tryCast(culling.enemy, 3), false, 'first hearing grants no execution sword');
assert(respondToCourt(culling.g, culling.p, 'deny'));
culling.g.update(2.6);
assert.equal(culling.p.cursedEnergyConfiscated, true);
assert.equal(culling.g.raid.swordGranted, false);
assert.equal(culling.p.z, 15, 'trial returns combatants to the theater');
assert(CHARACTERS.yujiCulling.abilities.every(a => a.physical));
assert(!CHARACTERS.higurumaCulling.abilities.some(a => a.type === 'heal' || a.type === 'amplification'), 'Culling Game Higuruma lacks later learned skills');
assert(culling.g.tryCast(culling.p, 3), 'Yuji can request one retrial');
assert(respondToCourt(culling.g, culling.p, 'confess'));
culling.g.update(2.6);
assert.equal(culling.g.raid.swordGranted, true);
culling.enemy.x = culling.p.x + 20;
culling.g.update(3.1);
assert.equal(culling.g.raid.swordGranted, false, 'Higuruma withdraws the sword after recognizing Yuji is not the killer');
assert.equal(culling.g.state, 'playing', 'mercy dialogue does not force a win or loss');
assert.equal(culling.g.tryCast(culling.p, 3), false, 'second hearing cannot repeat');
for (const difficulty of ['easy', 'normal', 'shura', 'abyss']) {
  const duel = raidFixture('cullingTrial', difficulty);
  respondToCourt(duel.g, duel.p, 'deny');
  duel.g.update(2.6);
  for (let i = 0; i < 200 && duel.g.state === 'playing'; i++) {
    duel.enemy.invuln = 0; duel.g.damage(duel.enemy, 10, duel.p, 'yujiBodyPunch');
  }
  assert.equal(duel.g.winner, duel.p, 'ordinary physical attacks win without retrial');
}
const { buildCullingTheater } = await import('../src/three/shinjukuRaid.js');
const theater = buildCullingTheater();
assert(theater.getObjectByName('bathtub_base') && theater.getObjectByName('red_stage_curtain'), 'separate theater scene includes first-meeting props');
console.log('Yuji versus Higuruma theater duel: nonviolence, cursed-energy confiscation, period loadouts, optional retrial, mercy and ordinary victory verified.');

// Validate Blender exports, collision positions and unobstructed initial combat lanes.
for (const name of ['culling-theater', 'shinjuku-lightning-ruins', 'shinjuku-trial-ruins', 'deadly-sentencing']) {
  const bytes = readFileSync(new URL(`../public/models/${name}.glb`, import.meta.url));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert.equal(gltf.scenes.length, 1);
  assert(!gltf.nodes.some(n => n.name === 'Cube' || n.camera !== undefined), 'only authored environment meshes are exported');
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    const pos = gltf.accessors[primitive.attributes.POSITION];
    assert([...pos.min, ...pos.max].every(Number.isFinite));
  }
  const colliders = gltf.nodes.filter(n => n.extras?.arenaCollider);
  if (name === 'deadly-sentencing') {
    assert.equal(colliders.length, 0, 'trial docks do not obstruct scripted participant positions');
    for (const material of ['Porcelain mask', 'Eye sutures', 'Guillotine steel']) {
      assert(gltf.materials.some(m => m.name.startsWith(material)), `court includes ${material}`);
    }
  } else {
    assert(colliders.length > 100);
    assert(gltf.nodes.filter(n => n.name?.startsWith('breakable_')).length >= 80);
    for (const n of colliders) {
      // Blender exporter bakes the Y-up rotation into vertices, retaining world-space origins.
      const p = gltf.accessors[gltf.meshes[n.mesh].primitives[0].attributes.POSITION];
      const t = n.translation || [0, 0, 0];
      for (const z of [-15, 0, 15]) {
        const intersectsLane = p.min[0]+t[0] < 4 && p.max[0]+t[0] > -4 && p.min[2]+t[2] < z+2 && p.max[2]+t[2] > z-2;
        assert(!intersectsLane, `${name}: spawn and central fighting corridor are clear`);
      }
    }
  }
  assert(gltf.meshes.length < 160, `${name}: decor stays batched for runtime performance`);
}
console.log('Canon Blender environments: finite geometry, isolated exports, material details, batched props and central collision lanes verified.');

// Real loader + destruction path: batching must retain independent collision
// boxes and hit proxies, including the eight-object limit and stage reset.
{
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { Renderer3D } = await import('../src/three/Renderer3D.js');
  const { batchArenaRubble, syncArenaRubble } = await import('../src/three/arenaRubble.js');
  const cost = JSON.parse(readFileSync(new URL('../docs/latest-arena-costs.json', import.meta.url)));
  for (const name of Object.keys(cost)) {
    const bytes = readFileSync(new URL(`../public/models/${name}.glb`, import.meta.url));
    const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const meshes = []; scene.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert(meshes.every(m => m.geometry.attributes.normal.normalized), 'loader keeps 16-bit normals');
    assert.equal(meshes.reduce((sum, m) => sum + m.geometry.index.count / 3, 0), cost[name].before.triangles);
    const colliders = Renderer3D.prototype.collectStoryCollisionBoxes(scene);
    const rubble = meshes.filter(m => m.name.startsWith('breakable_'));
    const originalPositions = rubble.map(m => m.getWorldPosition(new THREE.Vector3()).toArray());
    batchArenaRubble(scene);
    batchArenaRubble(scene); // idempotent across repeated stage selection
    assert.deepEqual(Renderer3D.prototype.collectStoryCollisionBoxes(scene), colliders);
    assert.deepEqual(rubble.map(m => m.getWorldPosition(new THREE.Vector3()).toArray()), originalPositions);
    const renderedTriangles = () => {
      let triangles = 0;
      scene.traverse(m => { if (m.isMesh && m.visible && m.layers.mask) triangles += Math.min(m.geometry.index.count, m.geometry.drawRange.count) / 3; });
      return triangles;
    };
    assert.equal(renderedTriangles(), cost[name].before.triangles, 'batch retains all triangles');
    if (rubble.length) {
      let bursts = 0;
      const game = { sceneHits: [{ x: 0, z: 0, radius: 1000 }], isStoryCombat: () => true, burst: () => bursts++ };
      Renderer3D.prototype.syncStoryHits.call({ storyScene: scene }, game);
      const hidden = rubble.filter(m => !m.visible);
      assert.equal(hidden.length, Math.min(8, rubble.length));
      assert.equal(bursts, hidden.length);
      assert.equal(game.sceneHits.length, 0);
      assert.equal(renderedTriangles(), cost[name].before.triangles - hidden.reduce((sum, m) => sum + m.geometry.index.count / 3, 0));
      rubble.forEach(m => { m.visible = true; }); syncArenaRubble(scene);
      assert.equal(renderedTriangles(), cost[name].before.triangles, 'stage reset restores rubble');
    }
    let draws = 0; scene.traverse(m => { if (m.isMesh && m.layers.mask) draws++; });
    assert.equal(draws, cost[name].mobile.fullSceneSubmissions);
    console.log(`${name}: ${meshes.length} → ${draws} full-scene submissions; collision/destruction preserved`);
  }
}

function freeDomainDuel(player, enemy) {
  const g = new Game3D();g.modeFamily = 'free';g.freePlayerChar = player;g.freeEnemyChar = enemy;g.start('dual', 'normal');g.timeStop=0;
  g.timeStop = 0;g.hitStop = 0;
  return { g, p: g.player(), e: g.entities.find(x => x !== g.player() && !x.summon) };
}
function hearingAgainst(enemy, response = 'deny') {
  const f = freeDomainDuel('higuruma', enemy);
  assert(f.g.tryCast(f.p, 1));
  if (f.g.raid.trial > 0) { assert(respondToCourt(f.g, f.e, response));f.g.update(2.6); }
  return f;
}
{
  const f = hearingAgainst('sukunaRaid', 'confess');
  assert(f.g.raid.verdict.death && f.g.raid.swordGranted);
  assert.equal(f.e.kamutoke, false);
  assert.equal(f.e.techniqueConfiscated, undefined, 'tool takes priority over CT');
  const noTool = hearingAgainst('sukuna', 'confess');
  assert.equal(noTool.e.techniqueConfiscated, true);
  assert.equal(noTool.g.tryCast(noTool.e, 0), false, 'confiscated Shrine cannot cast Dismantle');
  assert(noTool.g.tryBasicAttack(noTool.e), 'body attacks remain');
}
{
  const innocent = hearingAgainst('gojo');
  assert.equal(innocent.g.raid.verdict.guilty, false, 'no fabricated crime or death penalty');
  assert.equal(innocent.g.tryCast(innocent.p, 2), false, 'no execution sword on acquittal');
  const vessel = hearingAgainst('yujiShibuya', 'deny');
  assert.equal(vessel.g.raid.verdict.guilty, false, 'possession evidence supports denying Sukuna crimes');
  const confession = hearingAgainst('yujiCulling', 'confess');
  assert.equal(confession.e.cursedEnergyConfiscated, true);
  assert(confession.g.raid.swordGranted);
  assert(confession.g.tryCast(confession.e, 0), 'natural physical strength remains without CE');
  const toji = hearingAgainst('toji');
  assert.equal(toji.g.raid.trial, 0, 'zero-CE target is not automatically captured');
  assert.equal(toji.g.raid.verdict, undefined);
  const curse = hearingAgainst('mahito');
  assert.equal(curse.g.raid.caseFile.canon, false, 'unseen curse matchup is explicitly hypothetical');
  assert.equal(curse.e.techniqueConfiscated, true);
  assert.equal(curse.g.tryCast(curse.e, 0), false, 'physical-shaped soul CT still gets confiscated');
  const lightning = hearingAgainst('kashimo');
  lightning.e.electricHits = 3;
  assert.equal(lightning.g.tryCast(lightning.e, 1), false, 'Amber innate technique confiscated');
  assert(lightning.g.tryCast(lightning.e, 2), 'electrical CE property remains');
}
{
  const f = freeDomainDuel('gojo', 'sukuna');
  f.g.castDomain(f.p, CHARACTERS.gojo.abilities[3]);
  f.e.x=f.p.x+6;f.e.z=f.p.z;f.e.y=f.p.y;
  f.g.domains[0].life = 1;
  assert(f.g.inVoidStun(f.e), 'Void does not release targets in its second half');
  assert.equal(f.g.tryDash(f.e, 1, 0, 0), false);
  assert.equal(f.g.tryBasicAttack(f.e), false);
  const position = [f.e.x,f.e.y,f.e.z], hp=f.e.hp;
  f.g.setMove(f.e,1,0,0);f.e.vx=10;f.g.updateEntity(f.e,.1);
  assert.deepEqual([f.e.x,f.e.y,f.e.z],position, 'movement and knockback cannot bypass information lock');
  f.g.updateDomains(.2);assert.equal(f.e.hp,hp,'information overload is not generic HP ticks');
  f.e.x=f.p.x+2;assert.equal(f.g.inVoidStun(f.e),false,'contact with caster is exempt');
}
{
  const f = freeDomainDuel('yuta', 'sukuna');
  f.g.castDomain(f.p, CHARACTERS.yuta.abilities[3]);
  assert.equal(f.g.domains[0].sureHitTechnique,'jacobsLadder');
  f.e.wickerBasketTimer=4;const hp=f.e.hp;f.g.updateDomains(.2);
  assert.equal(f.e.hp,hp,'Hollow Wicker Basket neutralizes the sure-hit');
  f.e.wickerBasketTimer=0;f.g.updateDomains(.5);
  assert(f.e.hp<hp && f.e.techniqueExtinguishedUntil>f.g.elapsed);
  f.g.timeStop=0;f.p.cooldowns[2]=0;assert(f.g.tryCast(f.p,2));
  assert.equal(f.p.domainSwordUses,1);assert.equal(f.p.domainKatanaIndex,undefined,'each drawn katana is consumed');
  assert.equal(f.g.cycleCopy(f.p),false,'cannot preview or choose a random stored technique');
}
{
  const f = freeDomainDuel('yuta', 'gojo');
  f.g.castDomain(f.p,CHARACTERS.yuta.abilities[3]);f.g.castDomain(f.e,CHARACTERS.gojo.abilities[3]);
  assert.equal(f.g.domains.length,2,'equal closed domains contest without instant mutual destruction');
  assert.equal(f.g.inVoidStun(f.p),false,'contested sure-hit does not immobilize');
  const hp=f.g.entities.map(e=>e.hp);f.g.updateDomains(.2);assert.deepEqual(f.g.entities.map(e=>e.hp),hp);
}
{
  const f = freeDomainDuel('mahito','yujiShibuya');
  assert(f.g.tryCast(f.p,3));const hp=f.p.hp;f.g.updateDomains(.2);
  assert(f.p.hp<hp && f.g.domains.length===0,'sustained Mahito domain triggers Sukuna soul reprisal');
  const normal = freeDomainDuel('mahito','gojo');normal.g.tryCast(normal.p,3);normal.g.updateDomains(.2);
  assert(normal.e.soulTransfigured && normal.e.hp<normal.e.maxHp,'soul transformation is applied without touching');
}
console.log('Domain canon rules: contextual judgments, defenses, confiscation priorities, execution eligibility, Void immobilization/contact, equal clashes, copied katanas, Ladder, wicker basket and Mahito soul reprisal verified.');

// Gameplay quality: actual timed attacks, input ownership, navigation, training
// completion and isolated local records, not only successful casts.
{
  const { saveBattleRecord } = await import('../src/battleRecords.js');
  const originalRandom=Math.random;Math.random=()=>.99;
  try {
    const fixture=(player='yujiShibuya',enemy='toji')=>{
      const g=new Game3D();g.modeFamily='free';g.freePlayerChar=player;g.freeEnemyChar=enemy;g.start('single','normal');g.timeStop=0;
      g.hitStop=g.timeStop=0;g.cutIn=null;const p=g.player(),e=g.entities.find(x=>!x.isPlayer&&!x.summon);
      Object.assign(p,{x:0,y:0,z:0});Object.assign(e,{x:0,y:0,z:2});return {g,p,e};
    };
    for(const id of ['yujiShibuya','mahitoFinal']){
      const bare=fixture(id),guarded=fixture(id);guarded.g.castGuard(guarded.p,{id:id==='yujiShibuya'?'yujiGuard':'mahitoGuard'});
      bare.g.damage(bare.p,40,bare.e,'tojiBlade');guarded.g.damage(guarded.p,40,guarded.e,'tojiBlade');
      assert(guarded.p.hp>bare.p.hp,'physical guard reduces actual damage');
      const domain=fixture(id);domain.g.castGuard(domain.p,{id:'yujiGuard'});domain.g.damage(domain.p,20,domain.e,'domainTest');
      // A real domain tick must bypass physical guard.
      domain.p.invuln=0;domain.g.domains=[{alive:true,ownerId:domain.e.id,abilityId:'domainTest'}];
      const hp=domain.p.hp;domain.g.damage(domain.p,20,domain.e,'domainTest');assert.equal(hp-domain.p.hp,id==='mahitoFinal'?9:20);
    }
    {
      const {g,p,e}=fixture('yujiCulling','higurumaCulling');const hp=e.hp;
      assert(g.tryCast(p,0));assert.equal(e.hp,hp,'no damage before active frame');
      assert.equal(g.tryCast(p,1),false);assert.equal(p.cooldowns[1],0,'buffer does not consume cooldown');
      g.elapsed=.13;g.updateEntity(p,.13);assert(e.hp<hp,'active frame hits');g.hitStop=0;
      g.elapsed=.20;g.updateEntity(p,.07);g.tryCast(p,1);
      g.elapsed=.35;g.updateEntity(p,.15);assert(p.meleeAttack?.ability.id==='yujiBodyHeavy','late input executes after recovery');
      const miss=fixture('yujiCulling','higurumaCulling');miss.g.tryCast(miss.p,0);miss.e.z=10;
      miss.g.updateEntity(miss.p,.13);assert.equal(miss.e.hp,miss.e.maxHp,'escaping before contact avoids melee');
    }
    {
      const {g,p,e}=fixture('gojo','sukuna');Math.random=()=>0;g.damage(e,10,p,'blue');assert.equal(g.blackFlashCount,0,'ranged CT cannot randomly Black Flash');Math.random=()=>.99;
      const ground=fixture('gojo','mahitoFinal');assert(ground.g.groundDuel);ground.g.setMove(ground.p,0,0,1);assert.equal(ground.p.moveInput.y,0);
      ground.g.tryDash(ground.p,0,1,1);assert.equal(ground.p.dashVy,0);
    }
    {
      const {g,p,e}=fixture('yujiShibuya','mahitoFinal');p.z=10;e.z=0;
      g.setWorldObstacles([{minX:-3,maxX:3,minY:0,maxY:12,minZ:3,maxZ:5}]);
      for(let i=0;i<900;i++){g.elapsed+=1/60;g.updateAI(1/60);g.updateEntity(e,1/60);}
      assert(Math.hypot(e.x-p.x,e.z-p.z)<4,'AI routes around a solid wall');
      Object.assign(e,{x:0,z:2.3,navPath:null,meleeAttack:null,meleeRecovery:0});
      for(let i=0;i<900;i++){g.elapsed+=1/60;g.updateAI(1/60);g.updateEntity(e,1/60);}
      assert(Math.hypot(e.x-p.x,e.z-p.z)<4,'AI can recover after being pushed against a wall');
    }
    {
      const {g,p,e}=fixture('yujiShibuya','mahitoFinal');g.elapsed=1;p.attackStartedAt=0;p.raidCast={remaining:1,ability:{type:'execution'}};
      g.updateAI(.01);assert(e.dashTimer>0,'AI reacts to dangerous windup with a dodge');
      e.defenseWait=0;e.dashCooldown=1;g.elapsed=2;g.updateAI(.01);assert(e.guardTimer>0,'AI guards when dodge is unavailable');
    }
    for(const task of ['guard','dodge','blackFlash']){
      const g=new Game3D();g.startTraining(task);let acted=false;
      for(let i=0;i<400&&!g.trainingTask.complete;i++){
        if(task==='guard'&&g.elapsed>1.05&&!acted){g.tryCast(g.player(),4);acted=true;}
        if(task==='dodge'&&g.elapsed>1.35&&!acted){g.tryDash(g.player(),1,0,0);acted=true;}
        if(task==='blackFlash'){if(!acted){g.tryCast(g.player(),1);acted=true;}if(g.player().blackFlashUntil>g.elapsed)g.tryCast(g.player(),2);}
        g.update(.01);
      }assert(g.trainingTask.complete,`${task}: task completes from real gameplay`);
    }
    {
      const {g,p}=fixture();const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
      assert(saveBattleRecord(g,{won:true,seconds:20},storage).best);
      assert.equal(saveBattleRecord(g,{won:true,seconds:30},storage).seconds,20);
      g.difficulty='shura';assert(saveBattleRecord(g,{won:true,seconds:40},storage).best,'difficulty has independent best');
      assert.equal(saveBattleRecord(g,{won:false,seconds:1},storage),null);
      g.challenge='noHeal';g.elapsed=12;g.winner=p;g.finishEnd();assert(g.resultStats.challengeComplete);
    }
  } finally {Math.random=originalRandom;}
}
console.log('Gameplay quality: physical guarding, active frames, recovery/input buffer, wall routing, grounded matchups, Black Flash types, three training tasks and local records verified.');

// Six follow-up fixes. Cinematic time is normally advanced by the renderer;
// headless fixtures explicitly finish the opening presentation before accepting input.
{
  const { updateShibuya } = await import('../src/shibuyaBattle.js');
  const originalRandom = Math.random;
  Math.random = () => .99;
  function fixture(a='yujiShibuya', b='mahito', mode='dual') {
    const g = new Game3D();
    Object.assign(g, { modeFamily:'free', freePlayerChar:a, freeEnemyChar:b, practiceChar:a, practiceDummy:true });
    g.start(mode,'normal');g.timeStop=g.hitStop=0;g.cutIn=null;
    const p=g.player(),e=g.enemyList(p)[0];
    Object.assign(p,{x:0,y:0,z:0,charge:100,domainCharge:100});
    Object.assign(e,{x:0,y:0,z:2,invuln:0});
    return {g,p,e};
  }
  try {
    for (const reverse of [false,true]) for (const lethal of [false,true]) {
      const {g,p,e}=fixture('yujiShibuya','yujiShibuya');
      if(reverse)g.entities.reverse();
      if(lethal)p.hp=e.hp=5;
      assert(g.tryCast(p,0));assert(g.tryCast(e,0));g.update(.13);
      assert.equal(p.hp,e.hp,'same-step contact is independent of entity order');
      assert(p.hp<100,'both simultaneous strikes connect');
      if(lethal){assert.equal(g.state,'ended');assert.equal(g.winner,null,'mutual knockout is a draw');}
    }
    {
      const {g,p,e}=fixture('yujiShibuya','yujiShibuya');
      assert(g.tryCast(p,0));assert(g.tryCast(e,0));e.meleeAttack.remaining=.3;
      g.update(.13);assert.equal(p.hp,100);assert(e.hp<100);
      assert.equal(e.meleeAttack,null,'contact still interrupts an unfinished windup');
    }
    {
      const {g,p,e}=fixture();e.invuln=1;const hp=e.hp;
      assert(g.tryCast(p,1));g.updateEntity(p,.13);updateShibuya(g,.29);
      assert.equal(e.hp,hp);assert.equal(g.soulDelays.length,0);
      assert(!(p.blackFlashUntil>g.elapsed),'blocked first contact cannot open Black Flash');
    }
    {
      const {g,p,e}=fixture();assert(g.tryCast(p,1));g.updateEntity(p,.13);
      const hp=e.hp;e.invuln=1;updateShibuya(g,.29);
      assert.equal(e.hp,hp,'delayed contact respects a new dodge');
      assert(!(p.blackFlashUntil>g.elapsed));assert.equal(e.stun,0);
    }
    {
      const {g,p,e}=fixture();assert(g.tryCast(p,1));g.updateEntity(p,.13);
      const attackId=p.attackSerial;e.invuln=0;g.recordAttack(p);updateShibuya(g,.29);
      assert(p.blackFlashUntil>g.elapsed);assert(e.hp<96);
      assert(p.battleStats.landed.has(attackId));assert(!p.battleStats.landed.has(p.attackSerial),'delayed hit retains its originating attack ID');
    }
    {
      const {g,p,e}=fixture('yujiShibuya','sukuna');
      g.castSummon(e,CHARACTERS.sukuna.abilities.find(a=>a.type==='summon'));
      const summon=g.entities.find(e=>e.summon);Object.assign(summon,{x:0,y:0,z:2});
      e.z=30;g.lockTargetId=summon.id;const hp=summon.hp;
      assert(g.tryBasicAttack(p));g.updateEntity(p,.13);assert(summon.hp<hp);assert.equal(e.hp,e.maxHp);
      // The automatic close-range target also includes summons, with no manual lock.
      g.hitStop=0;g.lockTargetId=null;p.basicCooldown=0;p.meleeRecovery=0;summon.invuln=0;
      const nextHp=summon.hp;assert(g.tryBasicAttack(p));g.updateEntity(p,.13);assert(summon.hp<nextHp);
    }
    {
      const {g,p}=fixture('gojo','sukuna');assert(g.tryCast(p,2));assert(g.timeStop>0);
      const count=g.projectiles.length,cd=p.cooldowns[1],hp=p.hp;
      p.burnout=2;
      assert.equal(g.tryCast(p,1),false);assert.equal(g.tryBasicAttack(p),false);
      assert.equal(g.tryDash(p,1,0,0),false);assert.equal(g.trySimpleDomain(p),false);
      assert.equal(g.tryForceRestore(p),false);
      assert.equal(g.projectiles.length,count);assert.equal(p.cooldowns[1],cd);assert.equal(p.hp,hp);
      g.timeStop=g.hitStop=0;p.burnout=0;assert(g.tryCast(p,1),'input resumes after cinematic');
    }
    {
      const {g,p}=fixture('gojo','sukuna','practice');g.practiceInfinite=false;
      p.charge=p.domainCharge=0;g.updateEntity(p,.01);
      assert.equal(p.charge,0);assert.equal(p.domainCharge,0);assert.equal(g.tryCast(p,2),false);
      p.charge=100;assert(g.tryCast(p,2));assert.equal(p.charge,0);
      g.timeStop=g.hitStop=0;p.domainCharge=100;assert(g.tryCast(p,3));assert.equal(p.domainCharge,0);
      g.timeStop=0;g.practiceInfinite=true;g.updateEntity(p,.01);
      assert.equal(p.charge,100);assert.equal(p.domainCharge,100);
    }
    for(const immortal of [false,true]) {
      const {g,p,e}=fixture('kashimo','sukunaRaid','practice');g.practiceEnemyInvincible=immortal;
      for(let i=0;i<3;i++) {g.hitStop=0;p.cooldowns[0]=0;p.meleeRecovery=0;e.invuln=0;assert(g.tryCast(p,0));g.updateEntity(p,.13);}
      assert.equal(p.electricHits,3);g.hitStop=0;p.meleeRecovery=0;assert(g.tryCast(p,2),'immortal dummy still deposits electric charge');
      if(immortal){assert.equal(e.hp,e.maxHp);assert.equal(p.battleStats.damage,0);assert.equal(e.battleStats.taken,0);assert(p.battleStats.landed.size>0);}
      else assert(e.hp<e.maxHp);
    }
    {
      const {g,p,e}=fixture('yujiShibuya','mahito','practice');
      assert(g.tryCast(p,1));g.updateEntity(p,.13);e.invuln=0;updateShibuya(g,.29);
      assert(p.blackFlashUntil>g.elapsed);g.hitStop=0;p.meleeRecovery=0;e.invuln=0;
      assert(g.tryCast(p,2));g.updateEntity(p,.25);
      assert.equal(e.hp,e.maxHp);assert.equal(g.training.blackFlash,1,'immortal dummy preserves Black Flash feedback');
    }
  } finally {Math.random=originalRandom;}
}
console.log('Follow-up gameplay fixes: simultaneous trades/draws, valid Divergent Fist, summon melee targets, cinematic input gating, finite practice resources and immortal contact mechanics verified.');

{
  const { FREE_BATTLE_CHARACTERS } = await import('../src/config3d.js');
  const { updateShibuya } = await import('../src/shibuyaBattle.js');
  const originalRandom=Math.random;Math.random=()=>.75;
  function fixture(a,b,mode='dual') {
    const g=new Game3D();Object.assign(g,{modeFamily:'free',freePlayerChar:a,freeEnemyChar:b,practiceChar:a,practiceDummy:true});
    g.start(mode,'normal');g.timeStop=g.hitStop=0;g.cutIn=null;
    const p=g.player(),e=g.enemyList(p)[0];Object.assign(p,{x:0,y:0,z:0});Object.assign(e,{x:0,y:0,z:2,invuln:0});return {g,p,e};
  }
  try {
    for(const id of FREE_BATTLE_CHARACTERS) {
      const {g,p,e}=fixture('toji',id,'single');e.z=30;p.hp=p.maxHp=10000;
      for(let i=0;i<1800;i++){g.timeStop=0;g.cutIn=null;g.update(1/60);}
      assert(p.battleStats.taken>0,`${id}: free AI closes into a usable attack range`);
      assert(e.battleStats.attempts>0);
    }
    {
      const {g,p,e}=fixture('higuruma','mahito');assert(g.tryCast(e,0));
      e.queuedInput={index:1,expires:g.elapsed+.25};e.blackFlashUntil=2;
      // A real outstanding delayed hit is also canceled by nonviolence.
      g.soulDelays=[{source:e,target:p,remaining:.1}];
      assert(g.tryCast(p,1));assert.equal(e.meleeAttack,null);assert.equal(e.queuedInput,null);
      assert.equal(e.blackFlashUntil,0);assert.equal(g.soulDelays.length,0);
      assert(respondToCourt(g,e,'confess'));g.update(2.51);
      assert(e.techniqueConfiscated);const hp=p.hp;g.update(.13);assert.equal(p.hp,hp,'old attack cannot resume after verdict');
      assert.equal(g.tryCast(e,0),false,'confiscated technique remains unavailable');
    }
    {
      const {g,p,e}=fixture('higuruma','sukunaRaid');assert(g.tryCast(e,0));assert(g.projectiles.length>0);
      g.castBeam(e,CHARACTERS.sukunaRaid.abilities[2],{x:0,y:0,z:-1});assert(g.beams.length>0);
      g.hitStop=0;
      assert(g.tryCast(p,1));assert.equal(g.projectiles.length,0);assert.equal(g.beams.length,0);
    }
    {
      const {g,p,e}=fixture('yujiShibuya','higuruma');assert(g.tryCast(e,1));
      assert(respondToCourt(g,p,'confess'));g.update(2.51);assert(p.cursedEnergyConfiscated);
      const hp=e.hp;assert(g.tryCast(p,1));g.updateEntity(p,.13);
      assert(e.hp<hp,'confiscation preserves the physical first punch');const after=e.hp;
      e.invuln=0;updateShibuya(g,.29);assert.equal(e.hp,after);
      assert.equal(g.soulDelays.length,0);assert(!(p.blackFlashUntil>g.elapsed));
      assert.equal(g.tryCast(p,2),false,'Black Flash needs cursed energy');
      // Revocation also invalidates a delay that was already scheduled elsewhere.
      g.soulDelays=[{source:p,target:e,remaining:.01}];updateShibuya(g,.02);assert.equal(e.hp,after);
    }
    for(const immortal of [true,false]) for(const protectedPlayer of [true,false]) {
      const {g,p,e}=fixture(protectedPlayer?'gojo':'mahito',protectedPlayer?'mahito':'gojo','practice');
      g.practiceInvincible=g.practiceEnemyInvincible=immortal;
      const source=protectedPlayer?e:p,target=protectedPlayer?p:e;
      g.castDomain(source,{id:'mahitoDomain',type:'domain',closedBarrier:true,radius:16,exteriorRadius:12,life:5,tick:.65,damage:20,color:'#b5a3d8',core:'#eee2f4'});
      const hp=target.hp,max=target.maxHp;g.updateDomains(.7);
      if(immortal){assert.equal(target.hp,hp);assert.equal(target.maxHp,max);assert(!target.soulTransfigured);}
      else {assert(target.hp<hp);assert(target.maxHp<max);assert(target.soulTransfigured);}
    }
    {
      const {g,p,e}=fixture('yujiShibuya','mahito');assert(g.tryCast(p,1));g.updateEntity(p,.13);
      e.invuln=0;g.soulDelays[0].remaining=.01;g.hitStop=.1;
      const hp=e.hp,elapsed=g.elapsed;g.update(.02);
      assert.equal(e.hp,hp);assert.equal(g.elapsed,elapsed);assert.equal(g.soulDelays[0].remaining,.01);
      assert(!(p.blackFlashUntil>g.elapsed));g.update(.09);g.update(.02);assert(e.hp<hp);
    }
    {
      const {g,p,e}=fixture('higuruma','sukunaRaid');assert(g.tryCast(p,1));
      assert(respondToCourt(g,e,'confess'));g.hitStop=.1;const trial=g.raid.trial;
      g.update(.02);assert.equal(g.raid.trial,trial);assert.equal(g.elapsed,0);
    }
    {
      const {g,p,e}=fixture('toji','sukunaRaid');assert(g.tryCast(e,3));
      const remaining=e.raidCast.remaining;g.hitStop=.1;g.update(.02);
      assert.equal(e.raidCast.remaining,remaining);assert.equal(g.beams.length,0);
    }
    {
      const {g,p,e}=fixture('gojo','yujiShibuya');e.z=8;assert(g.tryCast(e,0));e.queuedInput={index:1,expires:1};
      g.castDomain(p,CHARACTERS.gojo.abilities[3]);g.updateDomains(.4);
      assert(g.inVoidStun(e));assert.equal(e.meleeAttack,null);assert.equal(e.queuedInput,null);
    }
  } finally {Math.random=originalRandom;}
}
console.log('State boundaries: all free AI loadouts, court attack cancellation, confiscated Divergent Fist, immortal soul effects, unified hit-stop timers and Void interruptions verified.');

{
  const originalRandom=Math.random;Math.random=()=>.99;
  function fixture(a='yujiCulling',b='higurumaCulling',mode='dual'){
    const g=new Game3D();Object.assign(g,{modeFamily:'free',freePlayerChar:a,freeEnemyChar:b,practiceChar:a,practiceDummy:true});
    g.start(mode);g.timeStop=g.hitStop=0;g.cutIn=null;g.drainEvents();
    const p=g.player(),e=g.enemyList(p)[0];Object.assign(p,{x:0,y:0,z:0});Object.assign(e,{x:0,y:0,z:2,invuln:0});return {g,p,e};
  }
  try {
    for(const type of ['hit','heavy','guard','miss','dodge']){
      const {g,p,e}=fixture();if(type==='guard'){e.guardTimer=1;e.guardKind='bodyGuard';}
      if(type==='dodge'){e.invuln=1;e.dashTimer=.2;}
      assert(g.tryCast(p,type==='heavy'?1:0));if(type==='miss')e.z=10;
      g.updateEntity(p,type==='heavy'?.25:.13);
      assert.equal(p.attackFeedback.kind,type);const events=g.drainEvents().filter(e=>e.type==='sfx').map(e=>e.kind);
      assert.equal(events.filter(x=>x==='ability').length,1,'one swing sound per attack');
      if(type==='miss'||type==='dodge'){assert.equal(e.hp,e.maxHp);assert(!events.includes('impact'));assert.equal(g.hitStop,0);}
      else if(type==='guard'){assert(events.includes('guardImpact'));assert(!events.includes('impact'));}
      else {assert(events.includes('impact'));assert(g.hitStop>0);}
    }
    {
      const {g,p,e}=fixture('yujiCulling','higurumaCulling','practice');assert(g.tryCast(p,0));g.updateEntity(p,.13);
      assert(p.attackFeedback.text.includes('无敌陪练'));assert.equal(e.hp,e.maxHp);
      assert(g.damageTexts.some(t=>t.text==='命中 · 无敌'));assert(!g.damageTexts.some(t=>/^-/ .test(t.text)));
    }
    for(const beam of [false,true]){
      const {g,p,e}=fixture('sukuna','gojo');e.invuln=1;e.dashTimer=.2;
      if(beam){g.castBeam(p,{id:'testBeam',damage:10,length:12,width:3,life:.3,knock:7,color:'#fff',core:'#fff'},{x:0,y:0,z:1});g.updateBeams(.01);}
      else {g.castOrb(p,{id:'testOrb',damage:10,speed:20,radius:.5,life:1,knock:7,color:'#fff',core:'#fff'},{x:0,y:0,z:1});g.updateProjectiles(.04);}
      assert.equal(e.hp,e.maxHp);assert.equal(e.vx,0);assert.equal(e.vz,0,'rejected contact cannot knock back');
    }
    {
      const {g,p,e}=fixture('sukuna','gojo');e.invuln=0;
      g.castBeam(p,{id:'testBeam',damage:10,length:12,width:3,life:.3,knock:7,color:'#fff',core:'#fff'},{x:0,y:0,z:1});g.updateBeams(.01);
      assert(e.hp<e.maxHp);assert(e.vz>0,'valid contact still knocks back');
    }
    {
      const {g,p,e}=fixture('gojo','sukuna','practice');g.castDomain(e,CHARACTERS.sukuna.abilities[3]);g.timeStop=g.hitStop=0;
      const domain=g.domains[0];assert(g.damage(e,60,p,'blue'));assert.equal(domain.ownerDamage,0);assert(domain.alive);
    }
    {
      const {g,p,e}=fixture('gojo','sukuna');e.z=20;g.hitStop=.05;p.burnout=2;
      assert.equal(g.tryCast(p,1),false);p.burnout=0;
      assert.equal(g.tryCast(p,1),false);assert.equal(p.cooldowns[1],0);assert.equal(g.projectiles.length,0);
      assert.equal(g.tryDash(p,1,0,0),false);assert.equal(g.tryForceRestore(p),false);
      g.update(.06);g.update(.01);assert(p.cooldowns[1]>0);assert.equal(p.queuedInput,null);assert(g.projectiles.length>0,'buffered cast starts after hit stop');
    }
  } finally {Math.random=originalRandom;}
}
console.log('Attack feedback: hit/heavy/guard/miss/dodge, separate sounds, immortal labels, hit-stop buffer and valid-contact knockback verified.');

{
  const originalRandom=Math.random;Math.random=()=>.99;
  function fixture(a='gojo',b='sukuna',mode='dual',legacySide='gojo'){
    const g=new Game3D();Object.assign(g,{modeFamily:'free',freePlayerChar:a,freeEnemyChar:b,singleChar:legacySide,practiceChar:a,practiceDummy:true});g.start(mode);
    g.timeStop=g.hitStop=0;g.cutIn=null;const p=g.player(),e=g.enemyList(p)[0];Object.assign(p,{x:0,y:0,z:0});Object.assign(e,{x:0,y:0,z:32,invuln:0});return {g,p,e};
  }
  try {
    for(const immune of [false,true]){
      const {g,p,e}=fixture('gojoTeen','toji');e.invuln=immune?1:0;
      g.castAttraction(p,CHARACTERS.gojoTeen.abilities[0]);
      if(immune){assert.equal(e.hp,e.maxHp);assert.equal(e.vz,0,'dodge protects against attraction displacement');}
      else {assert(e.hp<e.maxHp);assert(e.vz<0,'valid Blue still attracts');}
    }
    const profiles=[];
    for(const side of ['gojo','sukuna']){
      const {g,p,e}=fixture('yujiShibuya','gojo','single',side);g.damage(p,10,e,'red');
      assert(g.tryCast(e,0));profiles.push({hp:e.maxHp,damage:p.battleStats.taken,cooldown:e.cooldowns[0]});
    }
    assert.deepEqual(profiles[0],profiles[1],'free battle cannot inherit classic selected-side handicaps');
    assert.equal(profiles[0].hp,100);assert.equal(profiles[0].damage,10);
    {
      const g=new Game3D();g.setSingleChar('sukuna');g.start('single');g.timeStop=g.hitStop=0;
      const enemy=g.enemyList(g.player())[0];assert.equal(enemy.maxHp,90,'classic handicap remains active in its original mode');
    }
    for(const mode of ['dual','practice']) for(const char of ['gojo','sukuna','mahito','yuta']){
      const {g,p}=fixture(char,'toji',mode);const index=CHARACTERS[char].abilities.findIndex(a=>['domain','soulDomain'].includes(a.type));
      p.domainCharge=100;assert(g.tryCast(p,index));assert.equal(g.domains.length,1);
      g.timeStop=g.hitStop=0;p.cooldowns[index]=0;p.domainCharge=100;
      assert.equal(g.tryCast(p,index),false);assert.equal(g.aiAbilityReady(p,index),false);
      assert.equal(p.domainCharge,100);assert.equal(p.cooldowns[index],0);assert.equal(g.domains.length,1);
      g.castDomain(p,CHARACTERS[char].abilities[index]);assert.equal(g.domains.length,1,'internal casts cannot duplicate an owner');
      g.domains[0].alive=false;g.updateDomains(0);p.burnout=0;
      assert(g.tryCast(p,index),'owner may expand again after old domain ends');assert.equal(g.domains.length,1);
    }
    {
      const {g,p}=fixture();p.cooldowns[1]=.01;p.queuedInput={index:1,expires:.25};
      g.update(.016);assert(p.queuedInput,'transient cooldown does not discard buffered input');
      g.update(.016);assert.equal(p.queuedInput,null);assert(p.cooldowns[1]>0);assert(g.projectiles.length>0);
    }
    {
      const {g,p}=fixture();p.cooldowns[1]=1;p.queuedInput={index:1,expires:.02};
      g.update(.016);g.update(.016);assert.equal(p.queuedInput,null);assert.equal(g.projectiles.length,0,'buffer still expires instead of firing much later');
    }
  } finally {Math.random=originalRandom;}
}
console.log('Further regressions: valid attraction, free/classic tuning isolation, one domain per owner and bounded input buffer retries verified.');

// Setting regressions: period identity, soul awareness, contact CT, and one-use body cost.
{
  const savedRandom = Math.random;
  function fixture(a, b, mode = 'dual') {
    const g = new Game3D();
    Object.assign(g, { modeFamily: 'free', freePlayerChar: a, freeEnemyChar: b, practiceChar: a, practiceDummy: true });
    g.start(mode); g.timeStop = g.hitStop = 0; g.cutIn = null;
    const p = g.player(), e = g.enemyList(p)[0];
    Object.assign(p, { x: 0, y: 0, z: 0 }); Object.assign(e, { x: 0, y: 0, z: 2, invuln: 0 });
    return { g, p, e };
  }
  try {
    Math.random = () => .99;
    for (const id of ['yujiShibuya', 'yujiCulling', 'yujiRaid']) {
      const { g, p, e } = fixture(id, 'mahito');
      g.damage(e, 20, p, 'basicAttack'); assert.equal(e.maxHp - e.hp, 20, `${id} perceives souls`);
      g.hitStop = 0; g.damage(p, 20, e, 'soulTouch');
      assert.equal(p.maxHp - p.hp, id === 'yujiRaid' ? 20 : 8, 'only vessels receive Sukuna contact protection');
      const domain = fixture(id, 'mahito');
      domain.g.castDomain(domain.e, { id: 'mahitoDomain', type: 'domain', closedBarrier: true, radius: 16, exteriorRadius: 12, life: 5, tick: .65, damage: 20, color: '#b5a3d8', core: '#eee2f4' });
      domain.g.timeStop = domain.g.hitStop = 0;
      domain.g.updateDomains(.7);
      if (id === 'yujiRaid') {
        assert(domain.p.hp < domain.p.maxHp); assert.equal(domain.e.hp, domain.e.maxHp);
      } else {
        assert.equal(domain.p.hp, domain.p.maxHp); assert.equal(domain.e.maxHp - domain.e.hp, 35);
        assert(domain.e.burnout > 0);
      }
    }
    for (const [id, index] of [['sukunaStory1', 0], ['sukunaRaid', 1], ['higuruma', 0], ['higurumaCulling', 2], ['mahito', 0]]) {
      const { g, p } = fixture(id, 'yujiRaid'); p.burnout = 5;
      assert.equal(g.tryCast(p, index), false, `${id} cannot cast contact CT during burnout`);
      assert.equal(g.aiAbilityReady(p, index), false);
      assert(g.tryBasicAttack(p), 'ordinary fists survive burnout');
    }
    Math.random = () => 0;
    for (const [id, attack, eligible] of [['mahito', 'basicAttack', true], ['mahito', 'soulTouch', false], ['mahitoFinal', 'soulHeavy', true], ['mahitoFinal', 'soulBlade', false], ['higuruma', 'gavel', false], ['sukunaRaid', 'cleave', false]]) {
      const { g, p, e } = fixture(id, 'yujiRaid'); g.damage(e, 10, p, attack);
      assert.equal(g.blackFlashCount, eligible ? 1 : 0, `${attack} Black Flash eligibility`);
    }
    Math.random = () => .99;
    {
      const { g, p } = fixture('yujiRaid', 'toji', 'practice');
      g.practiceInfinite = false; p.hp = 20;
      assert.equal(g.tryCast(p, 1), false, 'finite healing requires charge');
      for (let i = 0; i < 3; i++) {
        p.charge = 100; p.cooldowns[1] = 0; p.burnout = 4;
        assert(g.tryCast(p, 1), 'RCT remains usable during innate CT burnout');
      }
      assert.equal(p.hp, 62); assert.equal(p.abilityUses.yujiRaidHeal, 3);
      p.charge = 100; p.cooldowns[1] = 0;
      assert.equal(g.tryCast(p, 1), false); assert.equal(g.aiAbilityReady(p, 1), false);
      assert.equal(p.charge, 100, 'exhausted healing does not consume resources');
      g.start('practice'); assert.equal(g.player().abilityUses?.yujiRaidHeal, undefined, 'new match resets uses');
    }
    {
      const { g, p } = fixture('kashimo', 'toji'); assert.equal(p.amberActivated, undefined);
      assert(g.tryCast(p, 1)); const until = p.amberUntil;
      g.timeStop = g.hitStop = 0; p.cooldowns[1] = 0; g.elapsed = 30;
      assert(g.tryCast(p, 1)); assert.equal(p.amberUntil, until, 'recasting cannot renew irreversible body lifetime');
      g.timeStop = g.hitStop = 0; g.elapsed = until; g.update(.01);
      assert.equal(p.amberExhausted, true); assert.equal(p.alive, false); assert.equal(g.state, 'ended');
    }
    {
      const g = new Game3D(); g.setStory('kashimoDuel', 'ally'); g.start('story');
      assert(g.player().amberActivated, 'canonical raid starts after activation');
      assert.equal(g.player().amberUntil, 90);
    }
    {
      const g = new Game3D(); g.setStory('higurumaRaid', 'ally'); g.start('story');
      g.timeStop = g.hitStop = 0; g.cutIn = null;
      const yuji = g.entities.find(e => e.charId === 'yujiRaid');
      yuji.hp = 30; yuji.charge = 100; yuji.aiCastCd = 0;
      g.entities.filter(e => e.charId === 'sukunaRaid').forEach(e => e.dummy = true);
      updateRaidAI(g, .016);
      assert.equal(yuji.hp, 44); assert.equal(yuji.abilityUses.yujiRaidHeal, 1, 'support AI actually casts finite RCT');
    }
  } finally { Math.random = savedRandom; }
}
console.log('Canon setting fixes: period-specific vessel/soul traits, Mahito Black Flash, contact CT burnout, irreversible Amber and limited Yuji RCT verified.');

// Collision and defense must follow space/time, rather than array order.
{
  const fixture = () => {
    const g = new Game3D(); g.modeFamily = 'free'; g.freePlayerChar = 'gojo'; g.freeEnemyChar = 'sukuna'; g.start('dual');
    g.timeStop = g.hitStop = 0; g.projectiles = []; g.entities.forEach(e => { e.x = 30; e.z = 30; });
    return g;
  };
  const shot = (owner, z, vz, extra = {}) => ({ ownerId: owner.id, team: owner.team, abilityId: 'blue', attackId: 1,
    x: 0, y: 1, z, vx: 0, vy: 0, vz, radius: .3, life: 2, power: 1, damage: 10, knock: 1, color: '#fff', alive: true, ...extra });
  for (const reverse of [false, true]) {
    const g = fixture(), [p, far] = g.entities;
    const near = g.makeEntity('sukuna', 0, 2, false); near.id = 'near';
    Object.assign(far, { x: 0, z: 4 }); g.entities.push(near);
    if (reverse) g.entities.reverse();
    g.projectiles.push(shot(p, 0, 100)); g.updateProjectiles(.06);
    assert.equal(near.hp, near.maxHp - 10, 'front target absorbs the projectile');
    assert.equal(far.hp, far.maxHp, 'projectile cannot skip the front target due to array order');
  }
  {
    const g = fixture(), [p, e] = g.entities;
    g.projectiles.push(shot(p, -2, 100), shot(e, 2, -100)); g.updateProjectiles(.04);
    assert.equal(g.projectiles.length, 0, 'fast opposing projectiles clash while crossing between frames');
  }
  {
    const g = fixture(), [p, e] = g.entities;
    Object.assign(e, { x: 0, z: 2 });
    g.projectiles.push(shot(p, 0, 100), shot(e, 6, -100)); g.updateProjectiles(.06);
    assert.equal(e.hp, e.maxHp - 10, 'a nearer fighter is hit before a farther projectile clash');
    assert.equal(g.projectiles.length, 1);
  }
  {
    const g = fixture(), [p, e] = g.entities;
    g.projectiles.push(shot(p, -2, 100), shot(e, 2, -100, { visualOnly: true })); g.updateProjectiles(.04);
    assert.equal(g.projectiles.length, 2, 'visual-only attraction cannot trade with real attacks');
  }
  {
    const g = fixture(), [p, e] = g.entities;
    Object.assign(e, { x: 0, z: 2 });
    const shield = g.makeEntity('toji', 0, 5, false); shield.id = 'shield'; shield.spearGuardTimer = 1;
    g.entities.push(shield); g.projectiles.push(shot(p, 0, 100)); g.updateProjectiles(.06);
    assert.equal(e.hp, e.maxHp - 10, 'a spear behind another target cannot cancel a nearer hit');
  }
  {
    const g = fixture(), [p, e] = g.entities;
    g.projectiles.push(shot(p, -2, 100), shot(e, 2, -100, { y: 6 })); g.updateProjectiles(.04);
    assert.equal(g.projectiles.length, 2, 'projectiles at different altitudes do not clash');
  }
  {
    const g = fixture(), [p, e] = g.entities;
    Object.assign(p, { x: 0, y: 0, z: 0 }); Object.assign(e, { x: 0, y: 0, z: 0 });
    g.resolveEntityCollisions();
    assert(Math.hypot(p.x-e.x, p.y-e.y, p.z-e.z) >= 1.399, 'coincident fighters separate');
  }
  {
    const g = fixture(), [p, e] = g.entities; g.elapsed = 10;
    Object.assign(p, { x: 0, z: -20 }); Object.assign(e, { x: 0, z: 0 });
    g.projectiles.push(shot(p, -3, 20));
    assert.equal(reactToThreat(g, e, p, .016), false, 'projectile reaction has a perceptible delay');
    g.elapsed += g.getDifficultyProfile().reactionMin + .01;
    assert.equal(reactToThreat(g, e, p, .016), true, 'AI reacts to an approaching projectile even without caster attack timestamp');
  }
  for (const extra of [{vz:-20}, {y:10}, {visualOnly:true}]) {
    const g = fixture(), [p,e] = g.entities; Object.assign(p,{x:0,z:-20}); Object.assign(e,{x:0,z:0});
    g.projectiles.push(shot(p,-3,20,extra));
    reactToThreat(g,e,p,.016); g.elapsed+=2;
    assert.equal(reactToThreat(g,e,p,.016),false,'AI ignores receding, overhead and purely visual projectiles');
  }
}
console.log('Spatial collision order, swept projectile clashes, coincident fighters and projectile defense verified.');
