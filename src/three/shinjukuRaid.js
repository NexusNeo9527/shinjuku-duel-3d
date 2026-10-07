import * as THREE from 'three';
import { buildHiddenFighter } from './hiddenInventory.js';
import { buildShibuyaFighter } from './shibuya.js';
import { buildArenaDistrict } from './arenaDistrict.js';
const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .75 });
function box(parent, name, color, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.name = name; m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
export function buildRaidFighter(id) {
  if (id === 'yujiRaid') return buildShibuyaFighter('yujiShibuya');
  const root = buildHiddenFighter('gojoAwakened');
  const kashimo = id === 'kashimo', sukuna = id === 'sukunaRaid';
  const remove = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    if (['torn_shirt', 'blood_stain', 'uniform_collar', 'uniform_button'].includes(o.name)) remove.push(o);
    if (o.name.startsWith('hair')) o.material = mat(kashimo ? 0x93c9c7 : sukuna ? 0xcf9491 : 0x26242d);
    if (['shirt', 'upper_arm', 'forearm'].includes(o.name)) o.material = mat(kashimo ? 0xc3d9d0 : sukuna ? 0xd3a78e : 0x292c36);
    if (['waist', 'thigh', 'shin'].includes(o.name)) o.material = mat(kashimo ? 0xf0e7d6 : sukuna ? 0xdbceae : 0x292c36);
  });
  remove.forEach(o => o.removeFromParent());
  const head = root.getObjectByName('head'), torso = root.getObjectByName('torso');
  const right = root.getObjectByName('foreR');
  if (kashimo) {
    for (const x of [-9, 9]) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(4.5, 12, 10), mat(0x93c9c7));
      bun.name = 'kashimo_hair_bun'; bun.position.set(x, 7, -4); head.add(bun);
      box(head, 'amber_face_mark', 0x378185, x * .45, -2, 8.2, 1.2, 6, .5);
    }
    const aura = new THREE.Mesh(new THREE.IcosahedronGeometry(23, 1), new THREE.MeshBasicMaterial({ color: 0x91eeee, transparent: true, opacity: .16, wireframe: true, depthWrite: false }));
    aura.name = 'amber_electric_aura'; aura.scale.set(.8, 1.3, .8); torso.add(aura);
    box(head, 'amber_third_eye', 0xb0ffff, 0, 5, 8.8, 3, 1.5, .6);
  } else if (sukuna) {
    for (const side of ['L', 'R']) {
      const extra = root.getObjectByName(`arm${side}`).clone(true);
      extra.name = `armLower${side}`; extra.position.y = 1;
      extra.rotation.z = side === 'L' ? .35 : -.35; torso.add(extra);
    }
    for (const x of [-5, 5]) for (const y of [-2, 3]) box(head, 'sukuna_face_mark', 0x30272a, x, y, 8, 4, .7, .5);
    box(torso, 'belly_mouth', 0x512830, 0, 0, 8, 13, 4, 1);
    for (const x of [-6, 6]) box(torso, 'sukuna_chest_mark', 0x30272a, x, 14, 8, 2, 15, .6);
    const weapon = new THREE.Group(); weapon.name = 'kamutoke_weapon'; weapon.position.set(0, -17, 4); right.add(weapon);
    box(weapon, 'vajra_grip', 0xc7b47f, 0, -4, 0, 2, 10, 2);
    for (const x of [-3, 0, 3]) box(weapon, 'vajra_prong', 0xded8b3, x, 4, 0, 1.4, 7, 2).rotation.z = -x * .15;
  } else {
    box(torso, 'white_shirt', 0xf0e6d5, 0, 17, 8.3, 6, 10, .6);
    box(torso, 'lawyer_tie', 0x7c6c51, 0, 15, 9, 1.5, 9, .7);
    const gavel = new THREE.Group(); gavel.name = 'gavel_weapon'; gavel.position.set(0, -17, 4); right.add(gavel);
    box(gavel, 'gavel_handle', 0x6a4430, 0, -7, 0, 2, 15, 2);
    box(gavel, 'gavel_head', 0x704b34, 0, -15, 0, 12, 6, 6);
    const sword = new THREE.Group(); sword.name = 'executioner_weapon'; sword.position.copy(gavel.position); right.add(sword); sword.visible = false;
    const blade = box(sword, 'executioner_blade', 0xffd77d, 0, -19, 0, 3, 34, 1.5);
    blade.material.emissive.set(0xffb841); blade.material.emissiveIntensity = 1;
    box(sword, 'executioner_guard', 0xffdf94, 0, -3, 0, 11, 2, 3);
  }
  const animate = root.userData.animate;
  root.userData.animate = (...args) => {
    animate(...args);
    if (sukuna) for (const side of ['L', 'R']) root.getObjectByName(`armLower${side}`).rotation.x = root.getObjectByName(`arm${side}`).rotation.x * .7;
  };
  root.userData.assetId = id;
  return root;
}
export function buildRaidArena(stage) {
  const root = new THREE.Group(); root.name = stage === 'kashimoDuel' ? 'shinjuku_lightning_ruins' : 'shinjuku_trial_ruins';
  box(root, 'ruined_asphalt', 0x42434b, 0, -.35, 0, 150, .7, 150);
  root.add(buildArenaDistrict('yuta'));
  for (let i = 0; i < 20; i++) {
    const a = i * 2.4, r = 27 + i % 4 * 7;
    const m = box(root, `breakable_raid_rubble_${i}`, 0x817a74, Math.sin(a) * r, .6, Math.cos(a) * r, 3, 1.2, 2.5);
    m.rotation.y = a; m.userData.arenaCollider = true;
  }
  for (let i = 0; i < 10; i++) box(root, 'slash_ground_scar', 0x17181f, i * 3 - 14, .03, -30, .2, .02, 40).rotation.y = .4;
  return root;
}
export function buildCourtroom() {
  const root = new THREE.Group(); root.name = 'deadly_sentencing_court';
  const color = 0x70503a;
  box(root, 'judicial_platform', color, 0, .2, -5, 10, .4, 3);
  for (const x of [-5, 5]) {
    box(root, 'court_bar', color, x, .9, 0, .2, .2, 13);
    for (let z = -6; z <= 6; z += 2) box(root, 'court_rail', color, x, .45, z, .2, .9, .2);
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(.75, 16, 12), mat(0x242127)); body.position.set(0, 3.1, -5); body.scale.y = 1.4; root.add(body);
  box(root, 'judgeman_closed_eyes', 0xdfcaa4, 0, 3.5, -4.3, .8, .09, .1);
  for (const x of [-1.5, 1.5]) {
    box(root, 'scale_chain', 0xb6975f, x, 2.8, -5, .03, 1.8, .03);
    box(root, 'justice_scale_pan', 0xb6975f, x, 1.9, -5, 1.2, .1, .8);
  }
  box(root, 'scales_of_justice', 0xb6975f, 0, 3.8, -5, 3.5, .06, .06);
  return root;
}

export function buildCullingTheater() {
  const root = new THREE.Group(); root.name = 'tokyo_colony_theater';
  box(root, 'theater_floor', 0x4c3430, 0, -.25, 0, 98, .5, 116);
  for (const x of [-46, 46]) {
    const wall = box(root, 'theater_side_wall', 0x302b36, x, 7, 0, 2, 14, 116);
    wall.userData.arenaCollider = true;
    for (let z = -42; z <= 42; z += 14) {
      box(root, 'theater_column', 0x86705a, x * .97, 7, z, .6, 14, .8);
      const lamp = box(root, 'theater_wall_lamp', 0xffd6a1, x * .95, 7, z, .3, 1.2, 1.2);
      lamp.material.emissive.set(0xffc48a); lamp.material.emissiveIntensity = .8;
    }
  }
  box(root, 'theater_ceiling', 0x302b36, 0, 14, 0, 98, .5, 116);
  for (const z of [-55, 55]) {
    const wall = box(root, 'theater_end_wall', 0x302b36, 0, 7, z, 96, 14, 2); wall.userData.arenaCollider = true;
  }
  box(root, 'stage_platform', 0x69504a, 0, .3, -46, 72, .6, 14);
  for (const x of [-27, 27]) box(root, 'red_stage_curtain', 0x7a2539, x, 6, -51, 19, 12, 1.2);
  box(root, 'stage_backdrop', 0x151922, 0, 6, -52, 40, 12, .4);
  box(root, 'curtain_valance', 0x7a2539, 0, 12, -50, 76, 2, 2);
  // Side banks of seats leave a clear central aisle for spawn and combat.
  for (const side of [-1, 1]) for (let row = 0; row < 7; row++) for (let seat = 0; seat < 6; seat++) {
    const x = side * (13 + seat * 4), z = -24 + row * 8;
    const chair = new THREE.Group(); chair.name = `breakable_theater_seat_${side}_${row}_${seat}`; chair.position.set(x, 0, z);
    box(chair, 'red_seat_back', 0x762938, 0, 1.1, .7, 2.4, 1.6, .45);
    box(chair, 'red_seat_cushion', 0x902f43, 0, .55, -.2, 2.4, .35, 1.8);
    box(chair, 'chair_frame', 0x25272d, 0, .25, 0, 1.7, .5, 1.2);
    chair.children.forEach(m => { m.name = `breakable_theater_chair_${row}_${seat}_${m.name}`; m.userData.arenaCollider = true; });
    root.add(chair);
  }
  // Higuruma's bathtub from the first meeting, kept beside the acting area.
  box(root, 'bathtub_base', 0xc7c7b7, 25, .5, -43, 5, 1, 2.8);
  for (const z of [-44.4, -41.6]) box(root, 'bathtub_rim', 0xe5decd, 25, 1.2, z, 5.4, .5, .3);
  for (const x of [22.5, 27.5]) box(root, 'bathtub_end', 0xe5decd, x, 1.2, -43, .3, .5, 3);
  return root;
}
