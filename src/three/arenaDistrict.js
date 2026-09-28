import * as THREE from "three";
import { ARENA } from "../config3d.js";

// Original layouts inspired by the successive destruction of Shinjuku.
// Keep the exported foreground at human scale; extend the district around it.
export function buildArenaDistrict(stage = "yuta") {
  const root = new THREE.Group();
  root.name = "expanded_shinjuku_district";
  const opening = stage === "opening", late = stage === "borrowed";
  const batches = new Map();
  let seed = 223;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const box = (kind, color, x, y, z, w, h, d, angle = 0, layer = "exterior") => {
    const batch = batches.get(kind) || { color, layer, items: [] };
    batch.items.push([x, y, z, w, h, d, angle]);
    batches.set(kind, batch);
  };
  box("ground", late ? 0x55534e : 0x41474b, 0, -.14, 0, 440, .2, 440);
  // Four continuous outer streets connect the original foreground to the new blocks.
  for (const side of [-1, 1]) {
    box("roads", 0x282e32, side * 64, .005, 0, 16, .01, 160);
    box("roads", 0x282e32, 0, .005, side * 70, 112, .01, 16);
    for (let p = -68; p <= 68; p += 7) {
      box("lane_paint", 0x9e9a88, side * 64, .018, p, .13, .012, 2.8);
      box("lane_paint", 0x9e9a88, p, .018, side * 70, 2.8, .012, .13);
    }
  }
  // Outside the playable square: no decorative skyline can trap a fighter.
  for (let row = 0; row < 3; row++) {
    for (const side of [-1, 1]) {
      for (let i = -4; i <= 4; i++) {
        const x = side * (88 + row * 43), z = i * 35 + (row % 2) * 9;
        const w = 14 + random() * 10, d = 17 + random() * 9;
        const fullHeight = 24 + random() * 62;
        const h = fullHeight * (opening ? 1 : late ? .22 : .55);
        box("concrete", opening ? 0x777d80 : 0x666963, x, h / 2, z, w, h, d);
        for (let floor = 4; floor < h; floor += 4) {
          box("facade", 0x344650, x - side * (w / 2 + .04), floor, z, .08, 2, d - 2);
          box("slabs", 0x999a90, x, floor - 1.3, z, w + .5, .25, d + .5);
        }
        if (!opening) {
          box("broken_core", 0x424644, x + w * .2, h + 1.5, z, w * .25, 3, d * .65);
          for (let j = 0; j < 4; j++) box("rebar", 0x353937, x - 4 + j * 2, h + 2, z, .09, 4, .09);
        }
        // A perpendicular row closes the south horizon; north retains the GLB landmarks.
        if (row === 1 && side === 1) box("concrete", opening ? 0x777d80 : 0x666963, i * 34, h / 2, -127, w, h, d);
      }
    }
  }
  // Low scattered rubble describes damage without adding walking obstacles.
  if (!opening) for (let i = 0; i < 220; i++) {
    const x = (random() - .5) * 190, z = (random() - .5) * 190;
    if (Math.max(Math.abs(x), Math.abs(z)) < 49 || Math.abs(Math.abs(x) - 64) < 8 || Math.abs(Math.abs(z) - 70) < 8) continue;
    box("rubble", late ? 0x777267 : 0x8b8980, x, .09, z, .3 + random() * 1.5, .18, .4 + random(), random() * Math.PI);
    if (late) box("scorch", 0x343532, x, .012, z, 2 + random() * 5, .01, .15, random() * Math.PI);
  }
  // A restrained square boundary matches the actual square movement clamp.
  for (const side of [-1, 1]) {
    box("boundary", 0x687a84, side * ARENA.half, .025, 0, .12, .025, ARENA.half * 2);
    box("boundary", 0x687a84, 0, .025, side * ARENA.half, ARENA.half * 2, .025, .12);
  }
  if (stage === "yuta") {
    box("domain_ground", 0x999585, 0, -.18, 0, 440, .2, 440, 0, "authenticLove");
    for (let i = 0; i < 64; i++) {
      const a = i * 2.399963, r = 138 + (i % 4) * 19;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 12 + random() * 22;
      box("domain_crosses", 0x85867c, x, h / 2, z, 2, h, 2, a, "authenticLove");
      box("domain_crosses", 0x85867c, x, h * .73, z, 10, 2, 2, a, "authenticLove");
    }
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const transform = new THREE.Object3D();
  for (const [name, { color, layer, items }] of batches) {
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .92 }), items.length);
    mesh.name = `district_${name}`;
    mesh.userData.arenaLayer = layer;
    mesh.visible = layer === "exterior";
    mesh.receiveShadow = true;
    // Distant detail does not need another shadow pass for every building.
    mesh.castShadow = false;
    items.forEach(([x, y, z, w, h, d, angle], i) => {
      transform.position.set(x, y, z); transform.scale.set(w, h, d); transform.rotation.set(0, angle, 0);
      transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    root.add(mesh);
  }
  return root;
}
