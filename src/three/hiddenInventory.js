import * as THREE from "three";
import { installCombatAnimation } from "./combatRig.js";

const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
function mesh(parent, name, geometry, mat, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, mat);
  object.name = name;
  object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(parent, name, mat, x, y, z, w, h, d, collider = false) {
  const object = mesh(parent, name, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  object.userData.arenaCollider = collider;
  return object;
}

// Stylized game models, with student-era costume and Toji's actual equipment.
// Model space is centered around the hips, roughly 86 units tall.
export function buildHiddenFighter(id) {
  const toji = id.startsWith("toji");
  const awakened = id === "gojoAwakened";
  const root = new THREE.Group();
  const skin = material(toji ? 0xe5bd9e : 0xf5d5c4);
  const cloth = material(toji ? 0x141b19 : 0x182332);
  const trousers = toji ? material(0xd6d0bc) : cloth;
  const hair = material(toji ? 0x142622 : 0xf0f1ec);
  const metal = material(0xb9c0c8);
  const dark = material(0x161619);
  const joints = {};
  const joint = (parent, name, x, y, z) => {
    const group = new THREE.Group(); group.name = name; group.position.set(x, y, z);
    parent.add(group); joints[name] = { node: group, rest: group.quaternion.clone() }; return group;
  };
  const hips = joint(root, "hips", 0, 0, 0);
  mesh(hips, "waist", new THREE.CapsuleGeometry(10, 3, 6, 12), trousers);
  const torso = joint(hips, "torso", 0, 12, 0);
  const chest = mesh(torso, "shirt", new THREE.CapsuleGeometry(toji ? 13 : 11, 11, 6, 16), cloth, 0, 8);
  chest.scale.z = 0.64;
  if (!toji) {
    box(torso, "uniform_collar", cloth, 0, 22, 0, 17, 6, 11);
    for (const y of [6, 13, 20]) mesh(torso, "uniform_button", new THREE.SphereGeometry(0.9, 8, 8), material(0xc6a76a), 2, y, 8);
    if (awakened) {
      box(torso, "torn_shirt", material(0xe7e4df), -2, 12, 8.1, 5, 19, 0.7);
      for (const [x, y] of [[-7, 9], [5, 18], [-3, 21]]) box(torso, "blood_stain", material(0x65252b), x, y, 8.6, 3, 6, 0.5);
    }
  }
  mesh(torso, "neck", new THREE.CylinderGeometry(3.8, 4.5, 8, 12), skin, 0, 26);
  const head = joint(torso, "head", 0, 35, 0);
  const face = mesh(head, "face", new THREE.SphereGeometry(10, 20, 16), skin);
  face.scale.set(0.84, 1.04, 0.82);
  mesh(head, "hair_cap", new THREE.SphereGeometry(10.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.57), hair, 0, 2, -0.6);
  for (let i = 0; i < 9; i++) {
    const a = i / 8 * Math.PI;
    const lock = mesh(head, "hair_lock", new THREE.ConeGeometry(toji ? 2.2 : 2.6, toji ? 10 : 13, 5), hair,
      Math.cos(a) * 7, toji ? 3 : 10, toji ? 6 : -1);
    lock.rotation.z = toji ? Math.PI + (i - 4) * 0.12 : (i - 4) * -0.14;
  }
  const eye = material(toji ? 0x234235 : 0x70cdff);
  for (const x of [-3.8, 3.8]) {
    mesh(head, "eye", new THREE.SphereGeometry(1, 10, 8), eye, x, 0.5, 7.5);
    if (!toji && !awakened) mesh(head, "round_sunglasses", new THREE.SphereGeometry(3.4, 16, 8), dark, x, 1, 8).scale.z = 0.2;
  }
  if (!toji && !awakened) box(head, "glasses_bridge", dark, 0, 1, 8, 3, 0.8, 1);
  box(head, "mouth", material(0x955f52), 0, -4.5, 7.8, 4, 0.6, 0.4);
  if (toji) box(head, "lip_scar", material(0x976956), 3, -4.6, 7.8, 0.6, 3, 0.5);
  for (const [side, sign] of [["L", -1], ["R", 1]]) {
    const arm = joint(torso, `arm${side}`, sign * (toji ? 14 : 12), 18, 0);
    mesh(arm, "upper_arm", new THREE.CapsuleGeometry(toji ? 4.6 : 3.8, 12, 6, 12), toji ? skin : cloth, 0, -9);
    if (toji) mesh(arm, "sleeve", new THREE.CapsuleGeometry(5, 4, 6, 12), cloth, 0, -3);
    const fore = joint(arm, `fore${side}`, 0, -19, 0);
    mesh(fore, "forearm", new THREE.CapsuleGeometry(toji ? 3.8 : 3.1, 10, 6, 12), toji ? skin : cloth, 0, -8);
    mesh(fore, "hand", new THREE.SphereGeometry(3.3, 12, 10), skin, 0, -17);
    const leg = joint(hips, `leg${side}`, sign * 6, -7, 0);
    mesh(leg, "thigh", new THREE.CapsuleGeometry(toji ? 6 : 4.5, 12, 6, 12), trousers, 0, -9);
    const shin = joint(leg, `shin${side}`, 0, -21, 0);
    mesh(shin, "shin", new THREE.CapsuleGeometry(toji ? 4.8 : 3.7, 11, 6, 12), trousers, 0, -8);
    box(shin, "shoe", dark, 0, -18, 2, 8, 5, 13);
  }
  let spear, knife, chain;
  if (toji) {
    // Inventory cursed spirit coils around the shoulder; it is not a combat summon.
    const wormMat = material(0x9f769b);
    for (let i = 0; i < 17; i++) {
      const a = i / 16 * Math.PI * 1.65;
      mesh(torso, "inventory_curse_segment", new THREE.SphereGeometry(4.7, 12, 10), wormMat,
        Math.cos(a) * 16, 11 + Math.sin(a) * 12, -7);
    }
    const wormHead = mesh(torso, "inventory_curse_head", new THREE.SphereGeometry(6.5, 16, 12), wormMat, -14, 23, 3);
    wormHead.scale.y = 1.2;
    for (const x of [-16, -12]) mesh(torso, "curse_eye", new THREE.SphereGeometry(0.7, 8, 8), dark, x, 25, 8.8);
    box(torso, "curse_mouth", material(0x53364c), -14, 20, 8.7, 6, 2, 1);
    spear = new THREE.Group(); spear.name = "inverted_spear_of_heaven";
    joints.foreR.node.add(spear); spear.position.set(0, -18, 2);
    box(spear, "spear_handle", dark, 0, -5, 0, 2.2, 10, 2.2);
    box(spear, "spear_blade", metal, 0, 8, 0, 3, 16, 0.9);
    for (const sign of [-1, 1]) {
      box(spear, "spear_fork", metal, sign * 3.2, 5, 0, 1.5, 8, 0.9);
      box(spear, "spear_crosspiece", metal, sign * 1.7, 1, 0, 4, 1.5, 0.9);
    }
    knife = new THREE.Group(); joints.foreR.node.add(knife); knife.position.set(0, -18, 2);
    box(knife, "knife_handle", dark, 0, -4, 0, 2, 8, 2);
    mesh(knife, "knife_blade", new THREE.ConeGeometry(2, 14, 3), metal, 0, 7);
    chain = new THREE.Group(); spear.add(chain);
    for (let i = 0; i < 15; i++) {
      const link = mesh(chain, "thousand_mile_chain_link", new THREE.TorusGeometry(1.3, 0.32, 6, 10), metal, Math.sin(i * 0.3) * 3, -10 - i * 1.5);
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    }
    chain.visible = id === "tojiRematch";
  }
  root.userData.animate = (time, move = 0, action = null) => {
    const swing = Math.sin(time * 8) * move;
    for (const [side, sign] of [["L", 1], ["R", -1]]) {
      joints[`arm${side}`].node.rotation.x = swing * sign * 0.55;
      joints[`fore${side}`].node.rotation.x = -0.25;
      joints[`leg${side}`].node.rotation.x = -swing * sign * 0.55;
      joints[`shin${side}`].node.rotation.x = Math.max(0, swing * sign) * 0.65;
    }
    if (toji) {
      const blade = action?.id === "katana";
      spear.visible = !blade; knife.visible = blade;
      if (chain) chain.rotation.z = Math.sin(time * 4) * 0.2;
    }
  };
  installCombatAnimation(root, joints);
  root.userData.assetId = id;
  return root;
}

export function buildHiddenArena(stage) {
  const initial = stage === "hiddenInventory";
  const root = new THREE.Group(); root.name = initial ? "jujutsu_high_grounds" : "star_religious_group_exterior";
  const stone = material(0xc6c1b0), plaster = material(0xe1ddd1), roof = material(0x3a4446), wood = material(0x594539);
  box(root, "ground", material(initial ? 0x777c68 : 0xbcb8ab), 0, -0.3, 0, 150, 0.6, 150);
  box(root, "stone_walkway", stone, 0, 0.02, 0, initial ? 18 : 65, 0.1, 140);
  if (initial) {
    // School gate and traditional buildings behind the forest clearing.
    for (const x of [-10, 10]) box(root, "school_gate_pillar", wood, x, 5, -45, 2, 10, 2, true);
    box(root, "school_gate_lintel", wood, 0, 10, -45, 25, 2, 3);
    box(root, "gate_roof", roof, 0, 11.5, -45, 29, 1.5, 8);
    for (const x of [-34, 34]) {
      box(root, "school_hall", plaster, x, 4, -48, 24, 8, 16, true);
      box(root, "school_hall_roof", roof, x, 9, -48, 28, 2, 20);
      for (let i = -2; i <= 2; i++) box(root, "hall_window", wood, x + i * 4, 4.5, -39.9, 2, 3, 0.2);
    }
    const trunk = material(0x61513c), foliage = material(0x34513b);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      const radius = 46 + (i % 4) * 6;
      const x = Math.sin(a) * radius, z = Math.cos(a) * radius;
      if (z < -36 && Math.abs(x) < 22) continue;
      const height = 10 + i % 6;
      mesh(root, "tree_trunk", new THREE.CylinderGeometry(0.5, 0.9, height, 8), trunk, x, height / 2, z).userData.arenaCollider = true;
      for (let j = 0; j < 3; j++) mesh(root, "forest_canopy", new THREE.IcosahedronGeometry(4.5 + j, 1), foliage, x + j * 1.4, height - 1 + j * 2, z);
    }
    for (let i = 0; i < 16; i++) box(root, "breakable_school_rubble", stone, Math.sin(i * 2.3) * 27, 0.3, Math.cos(i * 1.4) * 27, 1.7, 0.6, 1.4);
  } else {
    // The rematch is outside the religious association, not in Shinjuku or the Tomb.
    box(root, "association_main_building", plaster, 0, 9, -54, 68, 18, 20, true);
    box(root, "association_facade_roof", stone, 0, 18.6, -54, 72, 1.2, 23);
    box(root, "association_door", material(0x716957), 0, 6, -43.8, 14, 10, 0.3);
    for (const x of [-29, -20, 20, 29]) box(root, "association_window", material(0x5b6d72), x, 11, -43.8, 6, 8, 0.3);
    for (let i = 0; i < 6; i++) box(root, "entrance_steps", stone, 0, 0.25 + i * 0.25, -38 - i, 32, 0.5, 2);
    for (const x of [-41, 41]) {
      box(root, "boundary_wall", plaster, x, 3, -4, 1.6, 6, 80, true);
      for (let i = 0; i < 8; i++) box(root, "breakable_wall_section", plaster, x, 2.5, 40 + i * 3, 1.6, 5, 2.8, true);
    }
    for (const x of [-25, 25]) box(root, "planter", stone, x, 0.7, -33, 9, 1.4, 5, true);
  }
  return root;
}
