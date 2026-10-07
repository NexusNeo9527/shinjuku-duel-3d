import assert from "node:assert/strict";
import * as THREE from "three";
import { Game3D } from "../src/Game3D.js";
import { CHARACTERS } from "../src/config3d.js";
import { DomainBreaks } from "../src/three/DomainBreaks.js";

for (const reverse of [false, true]) {
  for (const power of [1, 2, 3]) {
    const game = new Game3D();
    game.start("single", "normal");
    const entities = reverse ? [...game.entities].reverse() : game.entities;
    const [first, second] = entities;
    const ability = (entity) => CHARACTERS[entity.charId].abilities.find((a) => a.type === "domain");
    game.castDomain(first, { ...ability(first), domainPower: 2 });
    game.castDomain(second, { ...ability(second), domainPower: power });
    assert.equal(game.domainBreaks.length, power === 2 ? 0 : 1);
    assert.equal(game.domains.length, power === 2 ? 2 : 1);
    if (power === 2) {
      const health=game.entities.map(e=>e.hp);game.updateDomains(.2);
      assert.deepEqual(game.entities.map(e=>e.hp),health,'equal domains suppress sure-hits');
      game.recordDomainBreak(game.domains.find(d=>d.closedBarrier));
    }
    if (power !== 2) assert.equal(game.domains[0].ownerId, power > 2 ? second.id : first.id);
    assert.equal(game.cutIn.presentation, "compact");
    const scene = new THREE.Scene();
    const visuals = new DomainBreaks(scene);
    visuals.sync(game.domainBreaks);
    const entry = [...visuals.entries.values()][0];
    const before = entry.geometry.attributes.position.array.slice();
    game.updateDomains(.7);
    visuals.sync(game.domainBreaks);
    const after = entry.geometry.attributes.position.array;
    assert.ok(after.every(Number.isFinite));
    assert.ok(after.some((v, i) => v !== before[i]), "fragments must move");
    let disposed = 0;
    entry.geometry.addEventListener("dispose", () => disposed++);
    game.updateDomains(1);
    visuals.sync(game.domainBreaks);
    assert.equal(scene.children.length, 0);
    assert.equal(disposed, 1);
    game.start("single", "normal");
    assert.equal(game.domainBreaks.length, 0);
    game.castDomain(game.entities[0], ability(game.entities[0]));
    game.updateDomains(100);
    assert.equal(game.domainBreaks.length, 0, "natural expiry is not a clash fracture");
    game.recordDomainBreak({ x: 0, y: 1, z: 0, radius: 17, type: "void" });
    visuals.sync(game.domainBreaks);
    game.finishEnd();
    visuals.clear();
    assert.equal(game.domainBreaks.length, 0);
    assert.equal(scene.children.length, 0);
  }
}
console.log("Domain clash winners, both cast orders, fracture motion, expiry and cleanup verified.");
