import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Box3, Vector3, ShaderLib } from 'three';
import { cloneCharacterMaterial } from '../src/three/celCharacters.js';
import { loadGltf, RECENT_MODEL_IDS } from '../src/three/models.js';

// Exercise the production loader using local GLBs, without a WebGL context.
globalThis.ProgressEvent ??= class { constructor(type, values) { Object.assign(this, { type }, values); } };
globalThis.self ??= globalThis;
globalThis.document = { createElement: () => ({ getContext: () => ({
  createRadialGradient: () => ({ addColorStop() {} }), fillRect() {},
}) }) };
const NativeRequest = globalThis.Request;
globalThis.Request = class extends NativeRequest {
  constructor(url, options) { super(new URL(url, 'http://local.test'), options); }
};
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (request) => {
  const url = typeof request === 'string' ? request : request.url;
  if (/^(blob:|data:)/.test(url)) return nativeFetch(request);
  return new Response(await fs.readFile(new URL('../public' + new URL(url).pathname, import.meta.url)));
};
// The loader needs an image object; pixel rendering is checked separately in WebGL.
globalThis.createImageBitmap = async blob => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(bytes[0], 137, 'embedded face albedo must be a PNG');
  const header = new DataView(bytes.buffer);
  return { width: header.getUint32(16), height: header.getUint32(20), close() {} };
};
for (const id of ['gojo', 'sukuna', 'mahoraga']) {
  const wrapper = await loadGltf(id);
  assert(wrapper, `${id} must load`);
  const model = wrapper.children[0];
  const box = new Box3().setFromObject(model);
  assert(Math.abs(box.min.y) < .001, `${id} feet must align with ground`);
  assert(Math.abs(box.getSize(new Vector3()).y - 86) < .001, `${id} normalized height`);
  const arm = model.getObjectByName(id === 'gojo' ? 'armL' : id === 'sukuna' ? 'armL001' : 'armL002');
  assert(arm, `${id} arm exists`);
  const before = arm.quaternion.clone();
  wrapper.userData.animate(.2, 1);
  assert(before.angleTo(arm.quaternion) > .01, `${id} walking arm must animate`);
  if (id === 'mahoraga') {
    const wheel = model.getObjectByName('wheel');
    const first = wheel.quaternion.clone();
    wrapper.userData.animate(.7, 0);
    assert(first.angleTo(wheel.quaternion) > .1, 'wheel must turn');
  }
  let triangles = 0;
  model.traverse(o => { if (o.isMesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
  console.log(`${id}: loaded, grounded, animated; ${triangles} triangles`);
}

// Verify production GLBs rather than accidentally accepting a procedural fallback.
for (const id of RECENT_MODEL_IDS) {
  const celInstance = await loadGltf(id);
  let toonMaterial;
  celInstance.traverse(o => { if (o.isMesh && o.material.userData.characterCel) toonMaterial ??= o.material; });
  assert(toonMaterial, `${id} cel material exists`);
  const combatMaterial = cloneCharacterMaterial(toonMaterial);
  const shader = { vertexShader: ShaderLib.toon.vertexShader, fragmentShader: ShaderLib.toon.fragmentShader };
  combatMaterial.onBeforeCompile(shader);
  assert(shader.fragmentShader.includes('diffuseColor.rgb * celBand'), `${id} combat clone retains cel shading`);
  combatMaterial.emissiveIntensity = toonMaterial.emissiveIntensity + 1;
  assert.notEqual(combatMaterial.emissiveIntensity, toonMaterial.emissiveIntensity, `${id} hit flash is isolated`);
  const wrapper = await loadGltf(id);
  assert(wrapper, `${id} must load`);
  const model = wrapper.children[0];
  let source;
  model.traverse(o => { if (o.userData.character_id === id) source = o; });
  assert(source, `${id} must use its exported Blender source`);
  const box = new Box3().setFromObject(model);
  assert(Math.abs(box.min.y) < .001, `${id} must be grounded`);
  assert(Math.abs(box.getSize(new Vector3()).y - 86) < .001, `${id} normalized height`);
  const arm = model.getObjectByName('armR');
  assert(arm, `${id} rig must keep canonical joint names`);
  const before = arm.quaternion.clone();
  wrapper.userData.animate(.2, 1);
  assert(before.angleTo(arm.quaternion) > .01, `${id} arm must animate`);
  if (id === 'todoInjured') {
    assert(model.getObjectByName('foreL').userData.missing_hand, 'injured Todo must retain the severed left wrist');
    assert(!model.getObjectByName('combatHand_foreL'), 'hand replacement must not restore the missing hand');
  }
  if (id.startsWith('toji')) {
    const surfaces = {};
    model.traverse(o => { if (o.isMesh && !o.userData.isCharacterOutline && o.userData.topology_role) surfaces[o.userData.topology_role] = o; });
    const skin = surfaces['continuous-body'];
    assert(skin?.isSkinnedMesh, `${id} body uses actual skeletal skinning`);
    assert(skin.geometry.attributes.uv, `${id} anatomical UVs retained`);
    const outline = skin.children.find(o => o.userData.isCharacterOutline);
    assert(outline?.isSkinnedMesh && outline.skeleton === skin.skeleton, `${id} outline follows the skin`);
    const mirror = await loadGltf(id);
    const mirrorArm = mirror.getObjectByName('foreL');
    assert.notEqual(mirrorArm, model.getObjectByName('foreL'), `${id} instances have independent bones`);
    const mirrorPose = mirrorArm.quaternion.clone();
    const elbow = model.getObjectByName('foreL');
    const boneIndex = skin.skeleton.bones.indexOf(elbow);
    const indices = skin.geometry.attributes.skinIndex, weights = skin.geometry.attributes.skinWeight;
    let sample = -1;
    for (let v = 0; v < indices.count && sample < 0; v++) {
      for (let j = 0; j < 4; j++) if (indices.getComponent(v,j) === boneIndex && weights.getComponent(v,j) > .2) sample = v;
    }
    assert(sample >= 0, `${id} elbow has deform weights`);
    wrapper.updateMatrixWorld(true);
    const beforeSkin = skin.getVertexPosition(sample,new Vector3()).clone();
    elbow.rotateX(-1.1);wrapper.updateMatrixWorld(true);
    assert(skin.getVertexPosition(sample,new Vector3()).distanceTo(beforeSkin) > .01, `${id} elbow moves surface vertices`);
    assert(mirrorArm.quaternion.equals(mirrorPose), `${id} posing one fighter does not pose the other`);
    assert(surfaces['continuous-shirt']?.isSkinnedMesh && surfaces['continuous-pants']?.isSkinnedMesh,
      `${id} clothing uses skeletal deformation`);
    const finger = model.getObjectByName('finger2-1R');
    assert(finger?.isBone, `${id} anatomical finger bones survive GLTF names`);
    const fingerRest = mirror.getObjectByName('finger2-1R').quaternion.clone();
    wrapper.userData.animate(.15,0,null,false);
    assert(finger.quaternion.angleTo(fingerRest) > .1, `${id} right hand grips the weapon`);
    const spear = model.getObjectByName('inverted_spear_of_heaven');
    const knife = model.getObjectByName('toji_knife');
    const chain = model.getObjectByName('thousand_mile_chain');
    assert(spear.visible && !knife.visible, `${id} starts with spear`);
    assert.equal(chain.visible, id === 'tojiRematch');
    wrapper.userData.animate(.3, 0, { id: 'katana', startedAt: .3, duration: .6 });
    assert(!spear.visible && knife.visible, `${id} weapon follows action`);
  }
  if (id.startsWith('higuruma')) {
    assert(model.getObjectByName('gavel_weapon'), 'gavel must remain separately addressable');
    assert.equal(model.getObjectByName('executioner_weapon').visible, false, 'executioner sword starts hidden');
  }
  if (id === 'sukunaRaid') {
    for (const joint of ['armLowerL','armLowerR','foreLowerL','foreLowerR']) assert(model.getObjectByName(joint), joint);
    assert(model.getObjectByName('kamutoke_weapon'), 'Kamutoke must remain addressable for confiscation');
  }
  if (id === 'kashimo') assert.equal(model.getObjectByName('amber_transformation').visible, false, 'Amber starts inactive');
  console.log(`${id}: Blender asset loaded, grounded, animated; period/equipment checks passed`);
}
