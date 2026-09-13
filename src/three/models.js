import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

export const FIGHTER_STYLE = {
  gojo: { aura: 0x44d9ff, aura2: 0x266fff },
  sukuna: { aura: 0xff4e64, aura2: 0x9a1732 },
  mahoraga: { aura: 0xe4c866, aura2: 0x8e7938 }
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
      color: style.aura, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  aura.scale.setScalar(52 * scale);
  aura.userData.isAura = true;
  return aura;
}

// Build a character in "game unit" space (radius 35 -> ~86 units tall), centered on origin.
function buildCharacter(id) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinMat = std(0xf0d5c6, { roughness: 0.7, metalness: 0.02 });
  const darkMat = std(0x35496e, { roughness: 0.7, metalness: 0.05 });
  const accentMat = std(0x266fff, { roughness: 0.45, metalness: 0.2, emissive: 0x266fff, emissiveIntensity: 0.55 });
  const hairMat = std(0xf5f8ff, { roughness: 0.55 });
  let hasWheel = false;

  if (id === "gojo") {
    skinMat.color.set(0xf0d5c6);
  } else if (id === "sukuna") {
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
  if (id !== "mahoraga") {
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
  if (id === "gojo") {
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
    const eyeMat = new THREE.MeshBasicMaterial({ color: id === "sukuna" ? 0xff2f4d : 0xf6df73 });
    for (const sx of [-5, 5]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 1), eyeMat);
      eye.position.set(sx, 1, 12);
      headJoint.add(eye);
    }
    if (id === "sukuna") {
      const markMat = std(0x120208, { roughness: 0.5 });
      for (const sx of [-1, 1]) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6, 1), markMat);
        mark.position.set(sx * 7, -3, 11.5);
        headJoint.add(mark);
      }
    }
  }

  // arms
  const armMaterial = id === "sukuna" ? skinMat : darkMat;
  function buildArm(side) {
    const shoulder = joint(torso, side * 15, 21, 0);
    const upper = limb(4.4, 13, armMaterial);
    shoulder.add(upper);
    const elbow = joint(shoulder, 0, -22, 0);
    const fore = limb(3.6, 12, id === "sukuna" ? skinMat : darkMat);
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
    const thigh = limb(5.2, 14, id === "sukuna" ? skinMat : darkMat);
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
  if (id === "mahoraga") {
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
  return root;
}

export function buildPlaceholder(id) {
  return buildCharacter(id);
}

export async function loadGltf(id) {
  const paths = {
    gojo: "/models/gojo.glb",
    sukuna: "/models/sukuna.glb",
    mahoraga: "/models/mahoraga.glb"
  };
  try {
    const gltf = await loader.loadAsync(paths[id]);
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 86 / maxDim;
    model.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(scale));
    model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const wrapper = new THREE.Group();
    wrapper.add(model);
    const aura = auraFor(FIGHTER_STYLE[id], 1);
    wrapper.add(aura);
    wrapper.userData.animate = () => {};
    return wrapper;
  } catch {
    return null;
  }
}
