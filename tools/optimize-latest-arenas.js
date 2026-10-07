import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { batchArenaRubble } from '../src/three/arenaRubble.js';

const names = ['mahito-domain', 'hidden-inventory', 'hidden-inventory-rematch', 'shibuya-clash', 'shibuya-final'];
const reportPath = new URL('../docs/latest-arena-costs.json', import.meta.url);
const types = { 5122: [2, 'readInt16LE'], 5123: [2, 'readUInt16LE'], 5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE'] };
function parse(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  const jsonLength = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()), bin: bytes.subarray(28 + jsonLength) };
}
function readAccessor({ json, bin }, id) {
  const a = json.accessors[id], view = json.bufferViews[a.bufferView];
  const [size, read] = types[a.componentType];
  const width = a.type === 'VEC3' ? 3 : 1;
  assert(!a.sparse && ['VEC3', 'SCALAR'].includes(a.type));
  const start = (view.byteOffset || 0) + (a.byteOffset || 0), stride = view.byteStride || size * width;
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, k) => {
    const value = bin[read](start + i * stride + k * size);
    return a.normalized && a.componentType === 5122 ? Math.max(-1, value / 32767) : value;
  }));
}
const quantize = n => Math.round(Math.max(-1, Math.min(1, n)) * 32767);
function measure(bytes) {
  const glb = parse(bytes), { json } = glb;
  let vertices = 0, triangles = 0, geometryBytes = 0, primitives = 0;
  const hash = createHash('sha256');
  // Expanded triangle positions and winding must remain exact. Canonical
  // quantized normals and scene/material metadata must also match.
  hash.update(JSON.stringify({ nodes: json.nodes, scenes: json.scenes, materials: json.materials,
    meshes: json.meshes.map(m => ({ ...m, primitives: m.primitives.map(p => ({ material: p.material, mode: p.mode })) })) }));
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    assert.deepEqual(Object.keys(p.attributes).sort(), ['NORMAL', 'POSITION']);
    const positions = readAccessor(glb, p.attributes.POSITION), normals = readAccessor(glb, p.attributes.NORMAL);
    const indices = readAccessor(glb, p.indices).flat();
    vertices += positions.length; triangles += indices.length / 3; primitives++;
    for (const id of [...Object.values(p.attributes), p.indices]) {
      const a = json.accessors[id];
      geometryBytes += json.bufferViews[a.bufferView].byteLength;
    }
    for (const i of indices) hash.update(JSON.stringify([positions[i], normals[i].map(quantize)]));
  }
  return { fileBytes: bytes.length, geometryBytes, vertices, triangles, primitives,
    materials: json.materials.length, textures: json.textures?.length || 0, semanticHash: hash.digest('hex') };
}
function optimize(bytes) {
  const glb = parse(bytes), json = structuredClone(glb.json);
  assert(!json.animations && !json.skins && !json.images);
  json.accessors = []; json.bufferViews = [];
  const chunks = []; let length = 0;
  function append(data, accessor, target) {
    const padding = (4 - length % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); length += padding; }
    const view = json.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: data.length, target }) - 1;
    chunks.push(data); length += data.length;
    return json.accessors.push({ ...accessor, bufferView: view, byteOffset: 0 }) - 1;
  }
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    const positions = readAccessor(glb, p.attributes.POSITION), normals = readAccessor(glb, p.attributes.NORMAL);
    const oldIndex = readAccessor(glb, p.indices).flat();
    const unique = new Map(), kept = [], remap = [];
    positions.forEach((position, i) => {
      // Weld exact duplicates of BOTH attributes; preserve hard edges.
      const key = JSON.stringify([position, normals[i]]);
      if (!unique.has(key)) { unique.set(key, kept.length); kept.push(i); }
      remap[i] = unique.get(key);
    });
    const positionBytes = Buffer.alloc(kept.length * 12), normalBytes = Buffer.alloc(kept.length * 8);
    // glTF requires 4-byte element alignment: SHORT VEC3 uses stride 8.
    kept.forEach((old, i) => positions[old].forEach((n, k) => positionBytes.writeFloatLE(n, i * 12 + k * 4)));
    kept.forEach((old, i) => normals[old].forEach((n, k) => normalBytes.writeInt16LE(quantize(n), i * 8 + k * 2)));
    const positionDef = { ...glb.json.accessors[p.attributes.POSITION], count: kept.length };
    p.attributes.POSITION = append(positionBytes, positionDef, 34962);
    p.attributes.NORMAL = append(normalBytes, { componentType: 5122, normalized: true, count: kept.length, type: 'VEC3' }, 34962);
    json.bufferViews[json.accessors[p.attributes.NORMAL].bufferView].byteStride = 8;
    const size = kept.length > 65535 ? 4 : 2, indexBytes = Buffer.alloc(oldIndex.length * size);
    oldIndex.forEach((n, i) => indexBytes[size === 4 ? 'writeUInt32LE' : 'writeUInt16LE'](remap[n], i * size));
    p.indices = append(indexBytes, { componentType: size === 4 ? 5125 : 5123, count: oldIndex.length, type: 'SCALAR' }, 34963);
  }
  json.extensionsUsed = [...new Set([...(json.extensionsUsed || []), 'KHR_mesh_quantization'])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired || []), 'KHR_mesh_quantization'])];
  json.buffers = [{ byteLength: length }];
  const bin = Buffer.concat([...chunks, Buffer.alloc((4 - length % 4) % 4)]);
  const raw = Buffer.from(JSON.stringify(json)), jsonBytes = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + jsonBytes.length + bin.length, 8);
  header.writeUInt32LE(jsonBytes.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonBytes, binHeader, bin]);
}
const check = process.argv.includes('--check');
const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath)) : {};
async function mobileCost(bytes) {
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  batchArenaRubble(scene);
  const buffers = new Set(); let fullSceneSubmissions = 0, geometryBytes = 0;
  scene.traverse(mesh => {
    if (!mesh.isMesh || !mesh.layers.mask) return;
    fullSceneSubmissions++;
    for (const attribute of [...Object.values(mesh.geometry.attributes), mesh.geometry.index]) {
      const array = attribute.isInterleavedBufferAttribute ? attribute.data.array : attribute.array;
      if (!buffers.has(array)) { buffers.add(array); geometryBytes += array.byteLength; }
    }
  });
  return { fullSceneSubmissions, geometryBytes };
}
for (const name of names) {
  const path = new URL(`../public/models/${name}.glb`, import.meta.url), bytes = readFileSync(path);
  const before = measure(bytes);
  if (check) {
    assert.deepEqual(before, report[name].after, `${name}: optimized asset drift`);
    assert.equal(before.semanticHash, report[name].before.semanticHash, `${name}: scene or triangle drift`);
    assert.deepEqual(await mobileCost(bytes), report[name].mobile, `${name}: mobile batch drift`);
  } else {
    if (report[name] && JSON.stringify(before) === JSON.stringify(report[name].after)) {
      console.log(name, 'already optimized');
      continue;
    }
    const output = optimize(bytes), after = measure(output);
    assert.equal(after.semanticHash, before.semanticHash, `${name}: geometry or metadata changed`);
    assert(output.length <= bytes.length, `${name}: optimization increased size`);
    if (report[name]) assert.equal(before.semanticHash, report[name].before.semanticHash);
    report[name] = { before: report[name]?.before || before, after, mobile: await mobileCost(output) };
    writeFileSync(path, output);
  }
  console.log(name, JSON.stringify(report[name]));
}
if (!check) { mkdirSync(new URL('../docs/', import.meta.url), { recursive: true }); writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n'); }
