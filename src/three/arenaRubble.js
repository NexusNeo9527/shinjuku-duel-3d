import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const batches = new WeakMap();

// Keep the original meshes as hit/collision proxies. Only their render layers
// change; visibility, names, transforms and the destruction limit stay intact.
export function batchArenaRubble(scene) {
  if (batches.has(scene)) return;
  scene.updateMatrixWorld(true);
  const inverse = scene.matrixWorld.clone().invert();
  const groups = new Map();
  scene.traverse(mesh => {
    if (!mesh.isMesh || !mesh.name.startsWith('breakable_') || mesh.userData.arenaCollider ||
        !mesh.geometry.index || Array.isArray(mesh.material) || mesh.material.transparent || mesh.geometry.groups.length > 1) return;
    const center = mesh.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
    // Retain regional culling instead of one arena-wide rubble bound.
    const key = `${mesh.material.uuid}:${Math.floor(center.x / 32)}:${Math.floor(center.z / 32)}:${mesh.layers.mask}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
  });
  const records = [];
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(
      new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)));
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    if (!geometry) continue;
    const batch = new THREE.Mesh(geometry, meshes[0].material);
    batch.name = 'mobile_rubble_batch';
    batch.layers.mask = meshes[0].layers.mask;
    batch.castShadow = meshes[0].castShadow;
    batch.receiveShadow = meshes[0].receiveShadow;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const indices = geometry.index.array.slice();
    let offset = 0;
    const entries = meshes.map(mesh => {
      const count = mesh.geometry.index.count;
      const entry = { mesh, offset, count, visible: mesh.visible };
      offset += count;
      mesh.layers.mask = 0;
      return entry;
    });
    scene.add(batch);
    records.push({ batch, indices, entries });
  }
  batches.set(scene, records);
}

// Called after destruction and stage reset, never on every frame. Keep the
// allocated vertex buffer; compact only the visible triangles in its index.
export function syncArenaRubble(scene) {
  for (const { batch, indices, entries } of batches.get(scene) || []) {
    if (entries.every(entry => entry.visible === entry.mesh.visible)) continue;
    const target = batch.geometry.index;
    let count = 0;
    for (const entry of entries) {
      entry.visible = entry.mesh.visible;
      if (!entry.visible) continue;
      target.array.set(indices.subarray(entry.offset, entry.offset + entry.count), count);
      count += entry.count;
    }
    target.needsUpdate = true;
    batch.geometry.setDrawRange(0, count);
    batch.visible = count > 0;
  }
}
