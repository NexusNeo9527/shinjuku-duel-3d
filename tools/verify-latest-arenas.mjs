import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Renderer3D } from '../src/three/Renderer3D.js';

for (const name of ['mahito-domain', 'hidden-inventory', 'hidden-inventory-rematch', 'shibuya-clash', 'shibuya-final']) {
  const bytes = await readFile(new URL(`../public/models/${name}.glb`, import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const meshes = []; scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert(meshes.length > 0);
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene);
  assert([...bounds.min, ...bounds.max].every(Number.isFinite));
  for (const mesh of meshes.filter(o => o.name.startsWith('breakable_'))) {
    const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
    assert(center.distanceTo(mesh.getWorldPosition(new THREE.Vector3())) < .01, `${name}: destruction must use actual rubble position`);
  }
  if (name !== 'mahito-domain') {
    const boxes = Renderer3D.prototype.collectStoryCollisionBoxes(scene);
    assert(boxes.length >= 6, `${name}: independent colliders`);
    for (const x of [-8, 0, 8]) for (const z of [-16, 0, 16]) {
      assert(!boxes.some(b => x > b.minX - 1 && x < b.maxX + 1 && z > b.minZ - 1 && z < b.maxZ + 1), `${name}: central combat corridor blocked at ${x},${z}`);
    }
    assert(bounds.min.x < -70 && bounds.max.x > 70 && bounds.min.z < -70 && bounds.max.z > 70);
    console.log(name, meshes.length, 'meshes;', boxes.length, 'colliders; spawn corridor clear');
  } else {
    assert(meshes.some(o => o.name.startsWith('domain_shell')));
    assert(meshes.length <= 8, 'domain batched for brief effect');
    console.log(name, meshes.length, 'mesh batches; enclosed hand environment');
  }
}
