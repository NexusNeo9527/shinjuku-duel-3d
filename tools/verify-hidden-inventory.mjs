import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { Game3D } from "../src/Game3D.js";
import { CHARACTERS, STORY_STAGES } from "../src/config3d.js";
import { buildHiddenArena, buildHiddenFighter } from "../src/three/hiddenInventory.js";
import { buildPlaceholder, loadGltf } from "../src/three/models.js";
import { beginCombatMotion } from "../src/combatMotion.js";
import { HIDDEN_INVENTORY_IMAGE_FILES } from "../src/hiddenInventoryArt.js";

for (const file of HIDDEN_INVENTORY_IMAGE_FILES) {
  const png = readFileSync(new URL(`../public/assets/${file}`, import.meta.url));
  assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
  assert.ok(png.readUInt32BE(16) >= 1200 && png.readUInt32BE(20) >= 700, `${file} is full-size artwork`);
}

function duel(stage, side = "ally", mode = "story", difficulty = "normal") {
  const game = new Game3D();
  game.modeFamily = "story";
  game.setStory(stage, side);
  game.start(mode, difficulty);
  game.finishStoryTransition();
  return game;
}
const intro = new Game3D();
intro.setStory("hiddenInventory", "ally"); intro.start("story");
assert.equal(intro.state, "storyTransition");
assert.equal(intro.storyTransition.scene, "opening");
const introHp = intro.player().hp;
intro.update(10);
assert.equal(intro.elapsed, 0, "illustration pauses the simulation");
assert.equal(intro.player().hp, introHp);
assert.equal(intro.tryCast(intro.player(), 0), false);
assert.equal(intro.finishStoryTransition(), true);
assert.equal(intro.state, "playing");
assert.equal(intro.finishStoryTransition(), false);
const first = duel("hiddenInventory");
const student = first.entities.find(e => e.charId === "gojoTeen");
const assassin = first.entities.find(e => e.charId === "toji");
assert.equal(student.hp, student.maxHp);
assert.equal(student.team, "gojo");
assert.equal(assassin.team, "sukuna");
assert.deepEqual(CHARACTERS.gojoTeen.abilities.map(a => a.id), ["blue", "blueMax", "infinity", "fallingBlossom"]);
assert.equal(first.canUseSimpleDomain(student), false);
// The production loader now uses Blender GLBs. Supply local asset transport in Node.
const assetRequest = globalThis.Request;
const assetFetch = globalThis.fetch;
const assetDocument = globalThis.document;
globalThis.ProgressEvent ??= class { constructor(type, values) { Object.assign(this, { type }, values); } };
globalThis.Request = class extends assetRequest {
  constructor(url, options) { super(new URL(url, 'http://local.test'), options); }
};
globalThis.self ??= globalThis;
globalThis.fetch = async request => {
  const url = typeof request === 'string' ? request : request.url;
  if (/^(blob:|data:)/.test(url)) return assetFetch(request);
  return new Response(readFileSync(new URL('../public' + new URL(url).pathname, import.meta.url)));
};
// Decode dimensions for loader checks; the browser validates actual texture pixels.
globalThis.createImageBitmap = async blob => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(bytes[0], 137);
  const header = new DataView(bytes.buffer);
  return { width: header.getUint32(16), height: header.getUint32(20), close() {} };
};
globalThis.document = { createElement: () => ({ getContext: () => ({
  createRadialGradient: () => ({ addColorStop() {} }), fillRect() {},
}) }) };
for (const id of ["gojoTeen", "gojoAwakened", "toji", "tojiRematch"]) {
  assert.equal(CHARACTERS[id].abilities.some(a => a.needsDomain || a.id === "mahoraga"), false);
}
first.setMove(assassin, 0, 0, 1);
assert.equal(assassin.moveInput.y, 0);
first.tryDash(assassin, 1, 1, 0);
assert.equal(assassin.dashVy, 0);
assassin.invuln = 0;
student.infinityTimer = 3;
first.damage(student, 10, assassin, "tojiBlade");
assert.equal(student.hp, student.maxHp, "ordinary blade cannot cross Infinity");
first.damage(student, 10, assassin, "invertedSpear");
assert.equal(student.infinityTimer, 0);
assert.ok(student.hp < student.maxHp, "Heaven spear reaches Gojo");
assert.ok(student.burnout > 0);
assert.equal(first.tryForceRestore(student), false, "student cannot force reverse-technique restoration");
first.elapsed = 35;
first.update(0.016);
assert.equal(first.state, "playing", "initial battle does not force defeat at 35 seconds");
assassin.invuln = 0;
first.damage(assassin, 10000, student, "blue");
assert.equal(assassin.hp, 0, "initial battle permits defeating Toji");
assert.equal(first.state, "ended");
assert.equal(first.winner.charId, "gojoTeen");
assert.equal(STORY_STAGES.hiddenInventory.next, "hiddenInventoryRematch");

for (const side of ["ally", "enemy"]) {
  for (const difficulty of ["easy", "normal", "shura", "abyss"]) {
    const game = duel("hiddenInventoryRematch", side, "story", difficulty);
    const gojo = game.entities.find(e => e.charId === "gojoAwakened");
    const toji = game.entities.find(e => e.charId === "tojiRematch");
    gojo.charge = 100;
    assert.equal(game.tryCast(gojo, 2), true, "charged Purple works without a Red prerequisite");
    toji.invuln = 0;
    game.damage(toji, 10000, gojo, "blue");
    assert.equal(toji.hp, 0, "Blue can finish the rematch");
    assert.equal(game.state, "ended", `${difficulty}/${side} defeat ends the rematch`);
    assert.equal(game.winner.charId, "gojoAwakened");
  }
}
const free = duel("hiddenInventory", "ally", "dual");
const freeToji = free.entities.find(e => e.charId === "toji");
free.damage(freeToji, 10000, free.player(), "blue");
assert.equal(free.winner.charId, "gojoTeen", "local duel does not force the story outcome");
const practice = duel("hiddenInventoryRematch");
practice.setPracticeChar("gojoAwakened"); practice.start("practice");
assert.equal(practice.tryCast(practice.player(), 2), true, "practice can use Purple directly");

const aiGame = duel("hiddenInventory");
const tojiAi = aiGame.entities.find(e => e.charId === "toji");
tojiAi.cooldowns[2] = 10;
const rangedPick = aiGame.pickAiAbility(tojiAi, 20);
assert.equal(CHARACTERS.toji.abilities[rangedPick]?.id, "handgun", "Toji uses his handgun rather than swinging a short blade from afar");
tojiAi.cooldowns[rangedPick] = 10;
assert.equal(aiGame.pickAiAbility(tojiAi, 20), -1);
for (let i = 0; i < 200; i++) aiGame.update(0.016);
assert.equal(tojiAi.y, 0);
assert.ok(aiGame.entities.every(e => [e.x, e.y, e.z, e.hp].every(Number.isFinite)));
assert.equal(aiGame.blackFlashCount, 0);

const cloud = duel("hiddenInventory", "enemy");
assert.equal(cloud.tryCast(cloud.player(), 2), true);
assert.equal(cloud.player().flyheadTimer, 4);
const longChain = duel("hiddenInventoryRematch", "enemy");
assert.equal(longChain.tryCast(longChain.player(), 2), true);
assert.equal(longChain.beams[0].shape, "chain");
assert.equal(longChain.beams[0].length, 20);

const parry = duel("hiddenInventoryRematch");
const defender = parry.entities.find(e => e.charId === "tojiRematch");
const attacker = parry.player();
defender.x = 0; defender.z = 4; attacker.x = attacker.z = 0;
parry.tryCast(defender, 1);
parry.updateEntity(defender, .13); // The spear's contact window begins after melee startup.
const hpBeforeBlue = defender.hp;
parry.tryCast(attacker, 0);
assert.equal(defender.hp, hpBeforeBlue, "Blue contact can be neutralized in the spear window");
parry.castOrb(attacker, CHARACTERS.gojoAwakened.abilities[1], { x: 0, y: 0, z: 1 });
parry.updateProjectiles(0.1);
assert.equal(defender.hp, hpBeforeBlue, "swept Red contact is neutralized by the spear");
assert.ok(parry.projectiles.every(p => p.abilityId !== "red"));

for (const id of ["gojoTeen", "gojoAwakened", "toji", "tojiRematch"]) {
  const model = buildHiddenFighter(id);
  const loaded = await loadGltf(id);
  const floorBounds = new THREE.Box3().setFromObject(loaded);
  assert.ok(Math.abs(floorBounds.min.y) < 1e-6, `${id} loaded feet meet the ground`);
  assert.ok(Math.abs(floorBounds.max.y - 86) < 1e-6);
  const placeholderBounds = new THREE.Box3().setFromObject(buildPlaceholder(id));
  assert.ok(Math.abs(placeholderBounds.min.y + 43) < 1e-6);
  const entity = { charId: id };
  beginCombatMotion(entity, id.startsWith("toji") ? "invertedSpear" : "blue", 0);
  model.userData.animate(0.2, 1, entity.combatAction, false, 0.016, id);
  model.updateMatrixWorld(true);
  let count = 0;
  model.traverse(object => {
    assert.ok(object.matrixWorld.elements.every(Number.isFinite));
    if (object.isMesh) count++;
  });
  assert.ok(count > 30);
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(bounds.getSize(new THREE.Vector3()).y > 70);
}
globalThis.Request = assetRequest;
globalThis.fetch = assetFetch;
globalThis.document = assetDocument;
for (const stage of ["hiddenInventory", "hiddenInventoryRematch"]) {
  const arena = buildHiddenArena(stage);
  let colliders = 0;
  arena.traverse(object => { if (object.userData.arenaCollider) colliders++; });
  assert.ok(colliders > 2);
}
console.log("Hidden Inventory: artwork, paused/skippable transitions, loadouts, Infinity/Heaven spear, grounded AI, canon/free outcomes, four difficulties, effects, models and arenas passed.");
