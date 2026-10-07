import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { articulateHands, installCombatAnimation } from "./combatRig.js";
import { buildArenaDistrict } from "./arenaDistrict.js";
import { buildHiddenArena, buildHiddenFighter } from "./hiddenInventory.js";

import { buildShibuyaFighter, buildShibuyaArena } from "./shibuya.js";
import { buildRaidFighter, buildRaidArena, buildCullingTheater } from './shinjukuRaid.js';
const RAID_MODELS = ['kashimo', 'higuruma', 'yujiRaid', 'sukunaRaid'];
const SHIBUYA_MODELS = ["yujiShibuya", "mahito", "mahitoFinal", "todoShibuya", "todoInjured"];
const loader = new GLTFLoader();
const rawGltfPromises = new Map();
const storyScenePromises = new Map();
let domainShrinePromise = null;
let unlimitedVoidPromise = null;
let mahitoDomainPromise = null;
let courtroomPromise = null;

export function loadCourtroom() {
  if (!courtroomPromise) {
    const url = `${import.meta.env.BASE_URL}models/deadly-sentencing.glb`;
    courtroomPromise = loadRawGltf(url).then(({ scene }) => {
      scene.traverse(o => {
        if (!o.isMesh) return;
        o.material.side = THREE.DoubleSide;
        o.material.fog = false;
        o.castShadow = false;
        o.receiveShadow = false;
        if (o.name.startsWith('domain_shell')) o.material = new THREE.MeshBasicMaterial({ color: 0x010102, side: THREE.DoubleSide });
      });
      return scene;
    }).catch(error => {
      courtroomPromise = null;
      rawGltfPromises.delete(url);
      console.warn('Unable to load Deadly Sentencing', error);
      return null;
    });
  }
  return courtroomPromise;
}

export function loadMahitoDomain() {
  if (!mahitoDomainPromise) {
    const url = `${import.meta.env.BASE_URL}models/mahito-domain.glb`;
    mahitoDomainPromise = loadRawGltf(url).then(({ scene }) => {
      scene.traverse(o => {
        if (!o.isMesh) return;
        o.material.side = THREE.DoubleSide;
        o.material.fog = false;
        o.castShadow = false;
        o.receiveShadow = false;
      });
      return scene;
    }).catch(error => {
      mahitoDomainPromise = null;
      rawGltfPromises.delete(url);
      console.warn('Unable to load Mahito domain', error);
      return null;
    });
  }
  return mahitoDomainPromise;
}

export function loadUnlimitedVoid() {
  if (!unlimitedVoidPromise) {
    unlimitedVoidPromise = loadRawGltf(`${import.meta.env.BASE_URL}models/unlimited-void.glb`)
      .then(({ scene }) => {
        scene.traverse((object) => {
          if (!object.isMesh) return;
          const dark = object.name === "void_shell" || object.name === "event_horizon";
          object.material = new THREE.MeshBasicMaterial({
            color: dark ? 0x01020a : object.material.color,
            side: THREE.DoubleSide, fog: false, toneMapped: false
          });
          object.castShadow = false;
          object.receiveShadow = false;
        });
        return scene;
      }).catch((error) => {
        unlimitedVoidPromise = null;
        rawGltfPromises.delete(`${import.meta.env.BASE_URL}models/unlimited-void.glb`);
        console.warn("Unable to load Unlimited Void", error);
        return null;
      });
  }
  return unlimitedVoidPromise;
}

export const FIGHTER_STYLE = {
  yujiShibuya: { aura: 0xff867e, aura2: 0xdc514e },
  mahito: { aura: 0xb5a3d8, aura2: 0x776589 },
  mahitoFinal: { aura: 0xb5a3d8, aura2: 0x776589 },
  todoShibuya: { aura: 0xe6c780, aura2: 0xbd994d },
  todoInjured: { aura: 0xe6c780, aura2: 0xbd994d },
  gojoTeen: { aura: 0x44d9ff, aura2: 0x266fff },
  gojoAwakened: { aura: 0x44d9ff, aura2: 0x266fff },
  toji: { aura: 0xb6caac, aura2: 0x6d8368 },
  tojiRematch: { aura: 0xb6caac, aura2: 0x6d8368 },
  gojo: { aura: 0x44d9ff, aura2: 0x266fff },
  sukuna: { aura: 0xff4e64, aura2: 0x9a1732 },
  mahoraga: { aura: 0xe4c866, aura2: 0x8e7938 },
  yuta: { aura: 0xc7b8ff, aura2: 0x7e6baa },
  yutaGojo: { aura: 0x85cfff, aura2: 0x558acc },
  sukunaStory1: { aura: 0xff4e64, aura2: 0x9a1732 },
  sukunaStory2: { aura: 0xff4e64, aura2: 0x9a1732 },
  rika: { aura: 0xd9c8ff, aura2: 0x887bb8 }
};

function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let glowTexture = null;
export function getGlowTexture() {
  if (!glowTexture) glowTexture = makeGlowTexture();
  return glowTexture;
}

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.15, ...opts });
}

function limb(radius, length, material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 12), material);
  mesh.position.y = -(length / 2 + radius);
  return mesh;
}

function joint(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function auraFor(style, scale) {
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 24),
    new THREE.MeshBasicMaterial({
      color: style.aura, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  aura.scale.setScalar(40 * scale);
  aura.userData.isAura = true;
  return aura;
}

// Build a character in "game unit" space (radius 35 -> ~86 units tall), centered on origin.
function buildCharacter(id) {
  const visualId = id.startsWith("sukuna") ? "sukuna" : id === "yutaGojo" ? "gojo" : id === "yuta" ? "gojo" : id === "rika" ? "mahoraga" : id;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinMat = std(0xf0d5c6, { roughness: 0.7, metalness: 0.02 });
  const darkMat = std(0x35496e, { roughness: 0.7, metalness: 0.05 });
  const accentMat = std(0x266fff, { roughness: 0.45, metalness: 0.2, emissive: 0x266fff, emissiveIntensity: 0.55 });
  const hairMat = std(0xf5f8ff, { roughness: 0.55 });
  let hasWheel = false;

  if (visualId === "gojo") {
    skinMat.color.set(0xf0d5c6);
  } else if (visualId === "sukuna") {
    skinMat.color.set(0xe2b7aa);
    hairMat.color.set(0xf2798c);
    darkMat.color.set(0x6e2436);
    accentMat.color.set(0xb3203d);
    accentMat.emissive.set(0xb3203d);
  } else {
    skinMat.color.set(0xc7cec6);
    hairMat.color.set(0x1b212b);
    darkMat.color.set(0x4d5866);
    accentMat.color.set(0x8e7938);
    accentMat.emissive.set(0x8e7938);
  }
  accentMat.userData.baseEmissive = accentMat.emissiveIntensity;

  // hips
  const hips = joint(body, 0, -14, 0);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(24, 18, 15), darkMat);
  pelvis.position.y = 0;
  hips.add(pelvis);

  // torso
  const torso = joint(hips, 0, 9, 0);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 17), darkMat);
  chest.position.y = 8;
  chest.scale.set(1, 1, 0.92);
  torso.add(chest);

  // collar / upper accent
  const collar = new THREE.Mesh(new THREE.BoxGeometry(24, 7, 18), accentMat);
  collar.position.y = 23;
  torso.add(collar);

  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 7, 10), skinMat);
  neck.position.y = 26;
  torso.add(neck);
  const headJoint = joint(torso, 0, 30, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(12.5, 20, 20), skinMat);
  head.scale.set(0.94, 1.02, 0.98);
  headJoint.add(head);

  // hair
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(13.6, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.66),
    hairMat
  );
  hair.position.y = 2;
  headJoint.add(hair);
  if (visualId !== "mahoraga") {
    const spikes = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 6 - 0.5) * Math.PI * 1.1;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(2.6, 12 + Math.random() * 6, 6), hairMat);
      spike.position.set(Math.sin(a) * 9, 10 + Math.cos(a) * 3, -2 - Math.random() * 3);
      spike.rotation.x = -0.6 - Math.random() * 0.3;
      spike.rotation.z = -a * 0.5;
      spikes.add(spike);
    }
    headJoint.add(spikes);
  }

  // face
  if (visualId === "gojo") {
    const band = new THREE.Mesh(new THREE.BoxGeometry(27, 8, 26), std(0x05070c, { roughness: 0.4 }));
    band.position.y = 1;
    headJoint.add(band);
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(27.4, 1.2, 26.4),
      new THREE.MeshBasicMaterial({ color: 0x44d9ff })
    );
    line.position.y = 1;
    headJoint.add(line);
  } else {
    const eyeMat = new THREE.MeshBasicMaterial({ color: visualId === "sukuna" ? 0xff2f4d : 0xf6df73 });
    for (const sx of [-5, 5]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 1), eyeMat);
      eye.position.set(sx, 1, 12);
      headJoint.add(eye);
    }
    if (visualId === "sukuna") {
      const markMat = std(0x120208, { roughness: 0.5 });
      for (const sx of [-1, 1]) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6, 1), markMat);
        mark.position.set(sx * 7, -3, 11.5);
        headJoint.add(mark);
      }
    }
  }

  // arms
  const armMaterial = visualId === "sukuna" ? skinMat : darkMat;
  function buildArm(side) {
    const shoulder = joint(torso, side * 15, 21, 0);
    const upper = limb(4.4, 13, armMaterial);
    shoulder.add(upper);
    const elbow = joint(shoulder, 0, -22, 0);
    const fore = limb(3.6, 12, visualId === "sukuna" ? skinMat : darkMat);
    elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(4.2, 10, 10), skinMat);
    hand.position.y = -19;
    elbow.add(hand);
    return { shoulder, elbow };
  }
  const armL = buildArm(-1);
  const armR = buildArm(1);

  // legs
  function buildLeg(side) {
    const hip = joint(hips, side * 7, -9, 0);
    const thigh = limb(5.2, 14, visualId === "sukuna" ? skinMat : darkMat);
    hip.add(thigh);
    const knee = joint(hip, 0, -23, 0);
    const shin = limb(4.4, 13, darkMat);
    knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 12), std(0x0a0e16));
    foot.position.set(0, -20, 3);
    knee.add(foot);
    return { hip, knee };
  }
  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  // pose (combat float)
  armL.shoulder.rotation.z = 0.7;
  armR.shoulder.rotation.z = -0.7;
  armL.elbow.rotation.z = -0.5;
  armR.elbow.rotation.z = 0.5;
  legL.hip.rotation.z = 0.25;
  legR.hip.rotation.z = -0.25;
  legL.knee.rotation.z = -0.35;
  legR.knee.rotation.z = 0.35;

  // mahoraga wheel
  if (visualId === "mahoraga") {
    hasWheel = true;
    const wheel = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(16, 1.6, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xe4c866, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    wheel.add(ring);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 16, 6),
        new THREE.MeshBasicMaterial({ color: 0xe4c866, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      spoke.rotation.z = -a;
      spoke.position.set(Math.cos(a) * 8, Math.sin(a) * 8, 0);
      wheel.add(spoke);
    }
    wheel.position.y = 50;
    root.add(wheel);
    root.userData.wheel = wheel;
  }

  const aura = auraFor(FIGHTER_STYLE[id], 1);
  body.add(aura);

  root.userData.body = body;
  root.userData.joints = { torso, head: headJoint, armL, armR, legL, legR, hips };
  root.userData.hasWheel = hasWheel;
  root.userData.animate = (t, move = 0) => {
    const pace = t * 8;
    const swing = Math.sin(pace) * move;
    body.position.y = Math.abs(Math.sin(pace)) * 3 * move + Math.sin(t * 2.1) * 1.2 * (1 - move);
    torso.rotation.z = Math.sin(t * 1.7) * 0.05 * (1 - move);
    torso.rotation.x = 0.07 * move;
    headJoint.rotation.z = Math.sin(t * 1.9 + 0.5) * 0.05 * (1 - move);
    armL.shoulder.rotation.x = swing * 0.9;
    armR.shoulder.rotation.x = -swing * 0.9;
    armL.shoulder.rotation.z = 0.7 + Math.sin(t * 2.4) * 0.1 * (1 - move) - 0.3 * move;
    armR.shoulder.rotation.z = -0.7 - Math.sin(t * 2.4 + 0.6) * 0.1 * (1 - move) + 0.3 * move;
    armL.elbow.rotation.z = -0.5 - Math.sin(t * 2.2 + 1) * 0.12 * (1 - move) - 0.35 * move;
    armR.elbow.rotation.z = 0.5 + Math.sin(t * 2.2 + 1.4) * 0.12 * (1 - move) + 0.35 * move;
    legL.hip.rotation.x = -swing * 1.15;
    legR.hip.rotation.x = swing * 1.15;
    legL.knee.rotation.x = Math.max(0, swing) * 0.9;
    legR.knee.rotation.x = Math.max(0, -swing) * 0.9;
    legL.knee.rotation.z = -0.35 + Math.sin(t * 2.0) * 0.06 * (1 - move);
    legR.knee.rotation.z = 0.35 - Math.sin(t * 2.0 + 0.7) * 0.06 * (1 - move);
    if (root.userData.wheel) root.userData.wheel.rotation.z = t * 2.4;
  };

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const actionJoints = { torso, head: headJoint, hips,
    armL: armL.shoulder, armR: armR.shoulder, foreL: armL.elbow, foreR: armR.elbow,
    legL: legL.hip, legR: legR.hip, shinL: legL.knee, shinR: legR.knee };
  installCombatAnimation(root, Object.fromEntries(Object.entries(actionJoints).map(([name, node]) =>
    [name, { node, rest: node.quaternion.clone() }])));
  return root;
}

function normalizedHiddenFighter(id, centered = false) {
    const model = RAID_MODELS.includes(id) ? buildRaidFighter(id) : SHIBUYA_MODELS.includes(id) ? buildShibuyaFighter(id) : buildHiddenFighter(id);
    const bounds = new THREE.Box3().setFromObject(model);
    const scale = 86 / bounds.getSize(new THREE.Vector3()).y;
    const center = bounds.getCenter(new THREE.Vector3());
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale - (centered ? 43 : 0), -center.z * scale);
    const wrapper = new THREE.Group();
    wrapper.add(model);
    wrapper.userData.animate = model.userData.animate;
    wrapper.userData.assetId = id;
    return wrapper;
}

export function buildPlaceholder(id) {
  if (id === 'agito') {
    // Procedural beast silhouette: antlers, wings, striped torso and serpent tail.
    const root = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: '#bba88a', roughness: .85 });
    const dark = new THREE.MeshStandardMaterial({ color: '#37322c', roughness: .9 });
    const part = (geometry, material, x, y, z) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x,y,z); root.add(mesh); return mesh; };
    part(new THREE.SphereGeometry(1, 12, 8), fur, 0, 2, 0).scale.set(20, 27, 12);
    part(new THREE.SphereGeometry(12, 12, 8), fur, 0, 30, 2);
    for (const sign of [-1,1]) {
      part(new THREE.CylinderGeometry(5,7,27,8), dark, sign * 12,-29,0);
      part(new THREE.CylinderGeometry(4,6,34,8), fur, sign * 24,0,0).rotation.z = sign * .3;
      part(new THREE.ConeGeometry(4,17,6), dark, sign * 8,47,0).rotation.z = sign * -.3;
      part(new THREE.BoxGeometry(30,3,20), dark, sign * 31,17,-9).rotation.z = sign * -.25;
      part(new THREE.SphereGeometry(2,8,6), new THREE.MeshBasicMaterial({color:'#d7b849'}), sign * 5,32,13);
    }
    const tail = part(new THREE.TorusGeometry(15,3,6,16,Math.PI * 1.5), dark, 0,-15,-17);
    tail.rotation.x = Math.PI/2;
    root.position.y = -5;
    root.userData.animate = (_dt, time) => { tail.rotation.z = Math.sin(time * 3) * .25; };
    return root;
  }
  if (RAID_MODELS.includes(id) || SHIBUYA_MODELS.includes(id) || ["gojoTeen", "gojoAwakened", "toji", "tojiRematch"].includes(id)) return normalizedHiddenFighter(id, true);
  return buildCharacter(id);
}

function loadRawGltf(path) {
  if (!rawGltfPromises.has(path)) rawGltfPromises.set(path, loader.loadAsync(path));
  return rawGltfPromises.get(path);
}

export async function loadGltf(id) {
  if (id === 'agito') return null;
  if (RAID_MODELS.includes(id) || SHIBUYA_MODELS.includes(id) || ["gojoTeen", "gojoAwakened", "toji", "tojiRematch"].includes(id)) return normalizedHiddenFighter(id);
  const base = import.meta.env?.BASE_URL ?? '/';
  const paths = {
    gojo: `${base}models/gojo.glb`,
    sukuna: `${base}models/sukuna.glb`,
    mahoraga: `${base}models/mahoraga.glb`,
    yuta: `${base}models/yuta.glb`,
    rika: `${base}models/rika.glb`,
    yutaGojo: `${base}models/yuta_gojo.glb`,
    sukunaStory1: `${base}models/sukuna_shinjuku.glb`,
    sukunaStory2: `${base}models/sukuna_shinjuku.glb`
  };
  try {
    const gltf = await loadRawGltf(paths[id]);
    const model = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 86 / (size.y || 1);
    model.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const wrapper = new THREE.Group();
    wrapper.add(model);
    const aura = auraFor(FIGHTER_STYLE[id], 1);
    aura.position.y = 43;
    aura.material.opacity = 0.035;
    wrapper.add(aura);
    // Blender exports articulated empty nodes; preserve their rest quaternions.
    const parts = {};
    model.traverse((o) => {
      const name = o.name.replace(/[_\.]?\d+$/, "");
      if (/^(hips|torso|head|arm[LR]|fore[LR]|armLower[LR]|foreLower[LR]|leg[LR]|shin[LR]|wheel)$/.test(name)) {
        parts[name] = { node: o, rest: o.quaternion.clone() };
      }
    });
    const q = new THREE.Quaternion();
    const xAxis = new THREE.Vector3(1, 0, 0);
    const zAxis = new THREE.Vector3(0, 0, 1);
    function rotate(name, angle, axis = xAxis) {
      const part = parts[name];
      if (part) part.node.quaternion.copy(part.rest).multiply(q.setFromAxisAngle(axis, angle));
    }
    const baseY = model.position.y;
    wrapper.userData.animate = (t, move = 0) => {
      const swing = Math.sin(t * 8) * move;
      model.position.y = baseY + (1 - move) * Math.sin(t * 2.1) * .6;
      rotate('torso', Math.sin(t * 1.7) * .025 * (1 - move), zAxis);
      rotate('head', Math.sin(t * 1.9) * .035);
      for (const [side, sign] of [['L', 1], ['R', -1]]) {
        rotate('arm' + side, sign * swing * .65 - .12);
        rotate('fore' + side, -.15 - Math.max(0, sign * swing) * .4);
        rotate('armLower' + side, -sign * swing * .35 + .16);
        rotate('foreLower' + side, -.25 - Math.max(0, -sign * swing) * .2);
        rotate('leg' + side, -sign * swing * .55);
        rotate('shin' + side, Math.max(0, sign * swing) * .65);
      }
      rotate('wheel', t * 1.2, zAxis);
    };
    wrapper.userData.assetId = id;
    const hands = articulateHands(model, id, parts);
    installCombatAnimation(wrapper, parts, hands);
    return wrapper;
  } catch (error) {
    console.warn(`Unable to load fighter model: ${id}`, error);
    return null;
  }
}

export function loadDomainShrine() {
  if (!domainShrinePromise) {
    domainShrinePromise = loadRawGltf(`${import.meta.env.BASE_URL}models/malevolent-shrine.glb`)
      .then((gltf) => {
        gltf.scene.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material.side = THREE.DoubleSide;
          }
        });
        return gltf.scene;
      })
      .catch((error) => {
        console.warn("Unable to load Malevolent Shrine", error);
        return null;
      });
  }
  return domainShrinePromise;
}
export function loadStoryScene(stage) {
  const latest = { hiddenInventory: 'hidden-inventory', hiddenInventoryRematch: 'hidden-inventory-rematch', shibuyaClash: 'shibuya-clash', shibuyaFinal: 'shibuya-final', cullingTrial: 'culling-theater', kashimoDuel: 'shinjuku-lightning-ruins', higurumaRaid: 'shinjuku-trial-ruins' };
  if (latest[stage]) {
    if (!storyScenePromises.has(stage)) {
      const url = `${import.meta.env.BASE_URL}models/${latest[stage]}.glb`;
      storyScenePromises.set(stage, loadRawGltf(url).then(({ scene }) => {
        scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        return scene;
      }).catch(error => {
        storyScenePromises.delete(stage);
        rawGltfPromises.delete(url);
        console.warn(`Unable to load arena ${stage}; using procedural fallback`, error);
        if (stage === 'cullingTrial') return buildCullingTheater();
        if (['kashimoDuel', 'higurumaRaid'].includes(stage)) return buildRaidArena(stage);
        return stage.startsWith('shibuya') ? buildShibuyaArena(stage) : buildHiddenArena(stage);
      }));
    }
    return storyScenePromises.get(stage);
  }
  if (!["opening", "yuta", "borrowed"].includes(stage)) return null;
  if (!storyScenePromises.has(stage)) {
    const filename = stage === "opening" ? "shinjuku-opening" : `story_${stage}`;
    storyScenePromises.set(stage, loadRawGltf(`${import.meta.env.BASE_URL}models/${filename}.glb`)
      .then((gltf) => {
        gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        gltf.scene.add(buildArenaDistrict(stage));
        return gltf.scene;
      })
      .catch((error) => {
        console.warn(`Unable to load story arena: ${stage}`, error);
        return null;
      }));
  }
  return storyScenePromises.get(stage);
}
