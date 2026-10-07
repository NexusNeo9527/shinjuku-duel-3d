import * as THREE from "three";
import { buildHiddenFighter } from "./hiddenInventory.js";

const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .85 });
function box(parent, name, color, x, y, z, w, h, d, collider = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.name = name; mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true; mesh.userData.arenaCollider = collider;
  parent.add(mesh); return mesh;
}
function sphere(parent, name, color, x, y, z, radius) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), mat(color));
  mesh.name = name; mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
export function buildShibuyaFighter(id) {
  const yuji = id === "yujiShibuya", todo = id.startsWith("todo"), final = id === "mahitoFinal";
  // Reuse the articulated skeleton, with independent meshes/materials per instance.
  const root = buildHiddenFighter("gojoAwakened");
  const remove = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    if (["torn_shirt", "blood_stain", "uniform_collar", "uniform_button"].includes(o.name)) remove.push(o);
    const hair = o.name.startsWith("hair");
    if (hair) o.material = mat(yuji ? 0xde8d89 : todo ? 0x242027 : 0x99a7b6);
    if (["shirt", "upper_arm", "forearm", "waist", "thigh", "shin"].includes(o.name)) o.material = mat(final ? 0x5e7377 : todo ? (["shirt", "upper_arm", "forearm"].includes(o.name) ? 0xc99976 : 0x546747) : yuji ? 0x20293a : 0x34364d);
    if (o.name === "eye") o.material = mat(yuji || todo ? 0x49362d : 0xaccbea);
    if (todo && hair) remove.push(o);
  });
  remove.forEach(o => o.removeFromParent());
  const torso = root.getObjectByName("torso"), head = root.getObjectByName("head");
  if (yuji) {
    const hood = sphere(torso, "red_hood", 0xb93442, 0, 22, -5, 10); hood.scale.set(1, .55, .8);
    box(torso, "red_collar", 0xb93442, 0, 23, 4, 18, 5, 7);
    for (const x of [-6, 6]) box(head, "face_scratch", 0x915f55, x, -1, 7, .5, 3, .5);
  } else if (todo) {
    sphere(head, "dark_hair", 0x242027, 0, 4, -2, 9).scale.y = .7;
    sphere(head, "topknot", 0x242027, 0, 13, -3, 4);
    box(head, "todo_face_scar", 0x855746, -4, 0, 8, .8, 11, .6).rotation.z = -.35;
    if (id === "todoInjured") {
      const fore = root.getObjectByName("foreL");
      fore.getObjectByName("hand")?.removeFromParent();
      box(fore, "left_wrist_bandage", 0xdcd5c0, 0, -15, 0, 6, 4, 6);
    }
  } else {
    for (let i = -2; i <= 2; i++) {
      const lock = sphere(head, "long_hair", 0x99a7b6, i * 3.4, -5, -5, 3.4);
      lock.scale.y = 4;
    }
    for (const y of [-3, 3]) {
      box(head, "face_stitch_seam", 0x30303b, 0, y, 8.2, 15, .45, .4);
      for (let x = -6; x <= 6; x += 3) box(head, "face_stitch", 0x30303b, x, y, 8.5, .4, 1.8, .4);
    }
    for (const x of [-5, 5]) box(torso, "patchwork_panel", 0xa3a5b3, x, 8, 8, 7, 20, .7);
    if (final) {
      for (const side of ["L", "R"]) {
        const fore = root.getObjectByName(`fore${side}`);
        box(fore, "elbow_blade", 0xabb4ac, side === "L" ? -5 : 5, -3, -1, 3, 23, 5).rotation.z = side === "L" ? -.25 : .25;
      }
      box(head, "armored_face", 0x697c7c, 0, -1, 8.7, 16, 12, 2);
      for (const x of [-7, 7]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(2.7, 14, 6), mat(0xb2b9aa));
        horn.name = "spirit_horn"; horn.position.set(x, 12, -2); horn.rotation.z = x * -.04; head.add(horn);
      }
      torso.scale.x = 1.2;
    }
  }
  root.userData.assetId = id;
  return root;
}

export function buildShibuyaArena(stage) {
  const final = stage === "shibuyaFinal";
  const root = new THREE.Group(); root.name = "shibuya_surface_ruins";
  box(root, "shibuya_asphalt", 0x474952, 0, -.35, 0, 150, .7, 150);
  for (const x of [-40, 40]) {
    box(root, "sidewalk", 0x73777d, x, .1, 0, 13, .2, 135);
    for (let i = -2; i <= 2; i++) {
      const z = i * 25;
      box(root, "damaged_building", 0x5b6070, x + (x < 0 ? -13 : 13), 12, z, 17, 24, 20, true);
      for (let y = 4; y < 23; y += 6) for (const dz of [-6, 0, 6]) box(root, "dark_window", 0x252d3d, x + (x < 0 ? -4.4 : 4.4), y, z + dz, .2, 3, 3);
    }
  }
  for (let z = -60; z < 70; z += 10) box(root, "road_marking", 0xa7a499, -12, .03, z, .4, .04, 5);
  for (let i = -4; i <= 4; i++) box(root, "crosswalk", 0xc1bbb0, i * 4, .04, -35, 2.3, .05, 12);
  for (let i = 0; i < 30; i++) {
    const a = i * 2.39996, r = 25 + i % 5 * 6;
    const rubble = box(root, "breakable_shibuya_rubble", 0x858382, Math.cos(a) * r, .6, Math.sin(a) * r, 2 + i % 3, 1.2, 2, true);
    rubble.rotation.y = a;
  }
  if (final) {
    const crater = new THREE.Mesh(new THREE.CircleGeometry(19, 48), mat(0x30333a));
    crater.name = "crater_floor"; crater.rotation.x = -Math.PI / 2; crater.position.y = .05; root.add(crater);
    for (let i = 0; i < 12; i++) box(root, "impact_crack", 0x1a1d24, Math.sin(i) * 14, .07, Math.cos(i) * 14, .25, .02, 9).rotation.y = i;
  }
  return root;
}
