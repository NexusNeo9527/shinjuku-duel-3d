import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { loadGltf } from '../src/three/models.js';

// Exercise the production loader using local GLBs, without a WebGL context.
globalThis.ProgressEvent ??= class { constructor(type, values) { Object.assign(this, { type }, values); } };
globalThis.document = { createElement: () => ({ getContext: () => ({
  createRadialGradient: () => ({ addColorStop() {} }), fillRect() {},
}) }) };
const NativeRequest = globalThis.Request;
globalThis.Request = class extends NativeRequest {
  constructor(url, options) { super(new URL(url, 'http://local.test'), options); }
};
globalThis.fetch = async (request) => new Response(await fs.readFile(new URL('../public' + new URL(request.url).pathname, import.meta.url)));
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
