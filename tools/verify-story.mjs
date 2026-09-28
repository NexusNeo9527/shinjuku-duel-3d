import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game3D } from "../src/Game3D.js";
import { CHARACTERS, COPY_TECHNIQUES } from "../src/config3d.js";

const game = new Game3D();
game.setStory("yuta", "ally");
game.start("story", "normal");
assert.equal(game.player().charId, "yuta");
assert.equal(game.entities.find((e) => !e.isPlayer).charId, "sukunaStory1");
assert.equal(CHARACTERS.sukunaStory1.abilities.some((a) => a.id === "mahoraga" || a.id === "shrine"), false);
assert.equal(CHARACTERS.yuta.abilities.length, 5);
assert.equal(CHARACTERS.sukuna.abilities[0].type, "orb", "legacy Sukuna keeps the original ranged loadout");
for (const stage of ["yuta", "borrowed"]) {
  const duel = new Game3D();
  duel.setStory(stage, "ally");
  duel.start("story", "normal");
  const sukuna = duel.entities.find((entity) => !entity.isPlayer);
  const yuta = duel.player();
  const attacks = CHARACTERS[sukuna.charId].abilities.slice(0, 3);
  assert.ok(attacks.every((ability) => ability.type === "melee"), `${stage} Sukuna only has melee attacks`);
  sukuna.charge = 100;
  sukuna.domainCharge = 0;
  sukuna.cooldowns.fill(0);
  assert.equal(duel.pickAiAbility(sukuna, 12), -1, `${stage} Sukuna does not select attacks at range`);
  const meleeIndex = duel.pickAiAbility(sukuna, 3);
  assert.equal(CHARACTERS[sukuna.charId].abilities[meleeIndex].type, "melee", `${stage} Sukuna attacks at close range`);
  if (stage === "borrowed") {
    sukuna.domainCharge = 100;
    assert.equal(duel.pickAiAbility(sukuna, 4), 3, "borrowed-stage Shrine remains available at close range");
    assert.equal(duel.pickAiAbility(sukuna, 12), -1, "borrowed-stage Shrine is not cast from a distance");
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
  ["borrowed", "ally", "yutaGojo", 0, null, "limitless-blue"],
  ["borrowed", "ally", "yutaGojo", 1, null, "limitless-red"],
  ["borrowed", "ally", "yutaGojo", 2, null, "gojo-murasaki"],
  ["borrowed", "ally", "yutaGojo", 4, null, "borrowed-heal"],
  ["yuta", "enemy", "sukunaStory1", 3, null, "sukuna-guard"],
  ["yuta", "enemy", "sukunaStory1", 4, null, "sukuna-heal"],
];
for (const [stage, side, charId, slot, copyIndex, art] of skillArtCases) {
  const duel = new Game3D();
  duel.setStory(stage, side);
  duel.start("story", "normal");
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
meleeArtDuel.start("story", "normal");
const meleeYuta = meleeArtDuel.player();
const meleeSukuna = meleeArtDuel.entities.find((entity) => !entity.isPlayer);
assert.equal(meleeArtDuel.tryCast(meleeYuta, 0), true, "Yuta's melee skill remains usable");
assert.equal(meleeArtDuel.cutIn, null, "Yuta's melee skill does not show an illustration");
assert.equal(meleeArtDuel.tryBasicAttack(meleeYuta), true, "basic attack remains usable");
assert.equal(meleeArtDuel.cutIn, null, "basic attacks do not show skill illustrations");
assert.equal(meleeArtDuel.tryCast(meleeSukuna, 0), true, "Sukuna's melee attack remains usable");
assert.equal(meleeArtDuel.cutIn, null, "Sukuna's close-range attacks do not show illustrations");

const slashDuel = new Game3D();
slashDuel.setStory("yuta", "enemy");
slashDuel.start("story", "easy");
const slashCaster = slashDuel.player();
const slashTarget = slashDuel.entities.find((e) => e !== slashCaster);
Object.assign(slashCaster, { x: 0, y: 0, z: 0, charge: 100, aim: { x: 0, z: 5 } });
Object.assign(slashTarget, { x: 0, y: 0, z: 5 });
assert.equal(slashDuel.tryCast(slashCaster, 2), true);
slashDuel.updateBeams(0.016);
assert.ok(Number.isFinite(slashTarget.vx) && Number.isFinite(slashTarget.vz), "世界斩命中后位置速度保持有效");

game.setStory("borrowed", "enemy");
game.start("story", "shura");
assert.equal(game.player().charId, "sukunaStory2");
assert.equal(game.entities.find((e) => !e.isPlayer).charId, "yutaGojo");
assert.equal(game.storyTimer, 300);
game.storyTimer = 0;
const borrowed = game.entities.find((e) => e.charId === "yutaGojo");
borrowed.domainCharge = 100;
assert.equal(game.tryCast(borrowed, 3), false, "five-minute limit blocks another domain");
const storySukuna = game.player();
game.damage(storySukuna, 10, borrowed, "blue");
assert.equal(storySukuna.hp, 92, "borrowed-body damage is reduced after the timer");
assert.equal(game.state, "playing", "timer expiry does not end the match");

game.start("dual", "normal");
const gojo = game.player();
const sukuna = game.entities.find((e) => e !== gojo);
gojo.domainCharge = 100;
sukuna.domainCharge = 100;
assert.equal(game.tryCast(gojo, 3), true);
assert.equal(game.tryCast(sukuna, 3), true);
assert.equal(game.domains.length, 0, "equal clash clears both domains");
assert.ok(gojo.burnout > 0 && sukuna.burnout > 0);
assert.equal(game.tryCast(gojo, 0), false, "burnout blocks cursed techniques");
assert.equal(game.tryBasicAttack(gojo), true, "physical attack remains available");
const hp = gojo.hp;
assert.equal(game.tryForceRestore(gojo), true);
assert.equal(gojo.hp, hp - 20);
assert.equal(gojo.burnout, 0);
assert.equal(gojo.domainLocked, true);
gojo.domainCharge = 100;
assert.equal(game.tryCast(gojo, 3), false, "forced recovery locks domain for the match");

game.start("dual", "normal");
const attacker = game.player();
const defender = game.entities.find((e) => e !== attacker);
defender.domainCharge = 100;
assert.equal(game.tryCast(defender, 3), true);
const opposingDomain = game.domains[0];
const beam = CHARACTERS.gojo.abilities[2];
const direction = game.fireDir(attacker);
game.castBeam(attacker, beam, direction);
game.castBeam(attacker, beam, direction);
assert.equal(opposingDomain.alive, false, "two strong beams break an active domain");
assert.ok(defender.burnout > 0, "a broken domain burns out its owner");

game.start("dual", "normal");
const lower = game.player();
const upper = game.entities.find((e) => e !== lower);
lower.x = upper.x = 0;
lower.z = upper.z = 0;
lower.y = 0;
upper.y = 0.2;
game.update(0.016);
assert.ok(lower.y >= 0 && upper.y >= 0, "collision separation cannot bury a fighter below the floor");

const buildingDuel = new Game3D();
buildingDuel.start("dual", "normal");
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

game.start("single", "normal");
assert.equal(game.player().charId, "gojo", "legacy single mode still starts");
game.start("practice", "normal");
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

console.log("Story modes, copy skills, burnout, forced recovery and GLB assets verified.");
