import * as THREE from 'three';
import { GUARD_POSE, sampleCombatMotion } from '../combatMotion.js';

// The exported models have articulated arms but baked fingers. Replace only the
// geometry below each wrist with a small jointed hand, keeping weapons attached.
export function articulateHands(model, charId, parts) {
  if (charId === 'rika' || charId === 'mahoraga') return {};
  model.updateMatrixWorld(true);
  const hands = {};
  const story = charId === 'yuta' || charId === 'yutaGojo' || charId.startsWith('sukunaStory');
  const wrist = story ? -.25 : -.24;
  let skin;
  model.traverse(o => {
    if (o.isMesh && !Array.isArray(o.material) && /warm porcelain|Story \/ (skin|pale)$/.test(o.material.name)) skin = o.material;
  });
  if (!skin) return hands;
  for (const name of ['foreL', 'foreR', 'foreLowerL', 'foreLowerR']) {
    const fore = parts[name]?.node;
    if (!fore) continue;
    const inverse = fore.matrixWorld.clone().invert();
    const meshes = [];
    fore.traverse(o => { if (o.isMesh) meshes.push(o); });
    for (const mesh of meshes) {
      let ancestor = mesh, weapon = false;
      while (ancestor && ancestor !== fore) {
        if (/katana/i.test(ancestor.name)) weapon = true;
        ancestor = ancestor.parent;
      }
      if (weapon || Array.isArray(mesh.material)) continue;
      const geometry = mesh.geometry;
      const p = geometry.attributes.position;
      const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
      const point = new THREE.Vector3();
      const below = new Uint8Array(p.count);
      for (let i = 0; i < p.count; i++) {
        point.fromBufferAttribute(p, i).applyMatrix4(matrix);
        below[i] = point.y < wrist - .003 && Math.abs(point.x) < .105;
      }
      const indices = geometry.index;
      const count = indices?.count ?? p.count;
      const keep = [];
      for (let i = 0; i < count; i += 3) {
        const a = indices ? indices.getX(i) : i;
        const b = indices ? indices.getX(i + 1) : i + 1;
        const c = indices ? indices.getX(i + 2) : i + 2;
        if (!(below[a] && below[b] && below[c])) keep.push(a, b, c);
      }
      if (keep.length !== count) {
        const trimmed = geometry.clone();
        trimmed.setIndex(keep);
        trimmed.clearGroups();
        mesh.geometry = trimmed;
      }
    }
    const hand = new THREE.Group();
    hand.name = `combatHand_${name}`;
    hand.position.set(0, wrist, 0);
    if (!story) hand.scale.setScalar(.86);
    fore.add(hand);
    fore.userData.combatWristLength = -wrist;
    const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skin);
    palm.scale.set(.042, .044, .027);
    palm.position.set(0, -.032, 0);
    hand.add(palm);
    const fingers = [];
    const segment = new THREE.CapsuleGeometry(.0085, .021, 3, 6);
    for (let i = 0; i < 4; i++) {
      const joint = new THREE.Group();
      joint.position.set((i - 1.5) * .021, -.062, 0);
      hand.add(joint);
      const upper = new THREE.Mesh(segment, skin);
      upper.position.y = -.018;
      joint.add(upper);
      const tip = new THREE.Group();
      tip.position.y = -.033;
      joint.add(tip);
      const lower = new THREE.Mesh(segment, skin);
      lower.position.y = -.016;
      lower.scale.y = i === 3 ? .7 : .9;
      tip.add(lower);
      fingers.push({ joint, tip });
    }
    const sign = name.endsWith('R') ? -1 : 1;
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(.011, .039, 3, 6), skin);
    thumb.position.set(sign * .043, -.024, .009);
    thumb.rotation.z = -sign * .65;
    hand.add(thumb);
    hand.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const restType = meshes.some(mesh => {
      for (let node = mesh; node && node !== fore; node = node.parent) {
        if (/katana/i.test(node.name)) return true;
      }
      return false;
    }) ? 'grip' : 'open';
    const setHand = (type = restType, weight = 1) => {
      hand.quaternion.identity();
      fingers.forEach(({ joint, tip }, i) => {
        const extended = type === 'open' || ((type === 'point') && i === 0)
          || ((type === 'cross' || type === 'seal') && i < 2);
        const curl = (restType === 'grip' ? 1 : 0) * (1 - weight) + (extended ? 0 : 1) * weight;
        joint.rotation.set(-.08 - 1.27 * curl, 0,
          type === 'cross' && i < 2 ? (i === 0 ? .3 : -.3) * weight : 0);
        tip.rotation.x = -.06 - 1.34 * curl;
      });
      thumb.position.z = type === 'open' ? .009 : .009 + .021 * weight;
    };
    hands[name.replace('fore', '')] = setHand;
  }
  return hands;
}

export function skinnedHandControls(root, parts) {
  const hands = {}, axis = new THREE.Vector3(1, 0, 0), curlRotation = new THREE.Quaternion();
  for (const side of ['L', 'R']) {
    const fingers = Object.entries(parts).filter(([name]) =>
      new RegExp(`^finger[1-5]-[1-3][._]?${side}$`).test(name));
    hands[side] = (type = side === 'R' ? 'fist' : 'relaxed', weight = 1) => {
      const curl = type === 'open' ? 0 : type === 'relaxed' ? .12 : type === 'seal' ? .25 : .86;
      for (const [name, part] of fingers) {
        const thumb = name.startsWith('finger1-');
        curlRotation.setFromAxisAngle(axis, -(thumb ? .55 : 1.2) * curl * weight);
        part.node.quaternion.copy(part.rest).multiply(curlRotation);
      }
    };
  }
  return hands;
}

export function installCombatAnimation(root, parts, hands = {}) {
  const locomotion = root.userData.animate;
  const rotation = new THREE.Euler();
  const delta = new THREE.Quaternion();
  const target = new THREE.Quaternion();
  const down = new THREE.Vector3(0, -1, 0);
  const direction = new THREE.Vector3(), pole = new THREE.Vector3(), elbow = new THREE.Vector3();
  const wrist = new THREE.Vector3(), upper = new THREE.Quaternion(), lower = new THREE.Quaternion();
  const palm = new THREE.Quaternion(), combined = new THREE.Quaternion();
  function seal(weight) {
    for (const side of ['L', 'R']) {
      const arm = parts['arm' + side]?.node, fore = parts['fore' + side]?.node;
      if (!arm || !fore?.userData.combatWristLength) continue;
      const sign = Math.sign(arm.position.x);
      const a = fore.position.length(), b = fore.userData.combatWristLength ?? .25;
      wrist.set(sign * .033, arm.position.y - .025, .29);
      direction.subVectors(wrist, arm.position);
      const distance = Math.max(.01, Math.min(direction.length(), a + b - .001));
      direction.normalize();
      const along = (a * a - b * b + distance * distance) / (2 * distance);
      const height = Math.sqrt(Math.max(0, a * a - along * along));
      pole.set(sign, -.9, 0).addScaledVector(direction, -pole.dot(direction)).normalize();
      elbow.copy(arm.position).addScaledVector(direction, along).addScaledVector(pole, height);
      upper.setFromUnitVectors(down, direction.subVectors(elbow, arm.position).normalize());
      lower.copy(upper).invert();
      direction.subVectors(wrist, elbow).normalize().applyQuaternion(lower);
      lower.setFromUnitVectors(down, direction);
      arm.quaternion.slerp(upper, weight);
      fore.quaternion.slerp(lower, weight);
      const hand = fore.children.find(o => o.name.startsWith('combatHand_'));
      if (hand) {
        combined.multiplyQuaternions(arm.quaternion, fore.quaternion).invert();
        palm.setFromEuler(rotation.set(0, -sign * Math.PI / 2, Math.PI));
        combined.multiply(palm);
        hand.quaternion.slerp(combined, weight);
      }
    }
  }
  function apply(pose, weight) {
    for (const [name, angles] of Object.entries(pose)) {
      const part = parts[name];
      if (!part) continue;
      rotation.set(...angles, 'XYZ');
      delta.setFromEuler(rotation);
      target.copy(part.rest).multiply(delta);
      part.node.quaternion.slerp(target, weight);
    }
  }
  function compose(time, move, action, guard) {
    for (const part of Object.values(parts)) part.node.quaternion.copy(part.rest);
    locomotion(time, move);
    const sample = sampleCombatMotion(action, time);
    for (const setHand of Object.values(hands)) setHand();
    const fourArms = !!parts.armLowerL;
    if (guard) {
      apply(GUARD_POSE, 1);
      hands.L?.('seal'); hands.R?.('seal');
    }
    if (!sample) { if (guard) seal(1); return; }
    let joints = sample.joints;
    if (guard && fourArms && action.id !== 'wickerBasket') {
      joints = Object.fromEntries(Object.entries(joints).map(([name, angles]) =>
        [/^(arm|fore)[LR]$/.test(name) ? name.replace(/([LR])$/, 'Lower$1') : name, angles]));
    } else if (fourArms && !guard && ['cleaveRush', 'cleave', 'slash', 'punch'].includes(action.id)) {
      joints = { ...joints, armLowerL: [-1.15, 0, .4], foreLowerL: [-.55, 0, 0],
        armLowerR: [-.65, 0, -.45], foreLowerR: [-1.1, 0, 0] };
    }
    apply(joints, sample.weight);
    for (const [side, type] of Object.entries(sample.hands)) {
      hands[guard && fourArms && action.id !== 'wickerBasket' ? 'Lower' + side : side]?.(type, sample.weight);
    }
    if (guard) { hands.L?.('seal'); hands.R?.('seal'); seal(1); }
    else if (['shrine', 'authenticLove', 'mahoraga', 'wickerBasket'].includes(action.id)) seal(sample.weight);
  }

  // Live playback blends from the last displayed pose on state changes. Direct
  // sampling (no dt) stays deterministic for scrubbing and model inspection.
  const animatedNodes = new Set(Object.values(parts).map(part => part.node));
  root.traverse(node => {
    if (node.name.startsWith('combatHand_')) node.traverse(child => animatedNodes.add(child));
  });
  const channels = [...animatedNodes].map(node => ({ node,
    displayed: node.quaternion.clone(), outgoing: node.quaternion.clone(),
    position: node.position.clone(), outgoingPosition: node.position.clone() }));
  let previous = null, transitionAt = -Infinity;
  root.userData.animate = (time, move = 0, action = null, guard = false, dt, owner) => {
    const active = sampleCombatMotion(action, time) ? action : null;
    const live = Number.isFinite(dt);
    const reset = !live || !previous || time < previous.time || owner !== previous.owner;
    if (reset) transitionAt = -Infinity;
    else if (active !== previous.active || guard !== previous.guard || move !== previous.move) {
      transitionAt = time;
      for (const channel of channels) {
        channel.outgoing.copy(channel.displayed);
        channel.outgoingPosition.copy(channel.position);
      }
    }
    compose(time, move, action, guard);
    const progress = Math.min(1, Math.max(0, (time - transitionAt) / .12));
    const blend = progress * progress * (3 - 2 * progress);
    for (const channel of channels) {
      if (live && blend < 1) {
        target.copy(channel.node.quaternion);
        channel.node.quaternion.slerpQuaternions(channel.outgoing, target, blend);
        channel.node.position.lerpVectors(channel.outgoingPosition, channel.node.position, blend);
      }
      channel.displayed.copy(channel.node.quaternion);
      channel.position.copy(channel.node.position);
    }
    previous = live ? { time, active, guard, move, owner } : null;
  };
}
