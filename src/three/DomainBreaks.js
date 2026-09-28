import * as THREE from "three";

// Each break uses two draw calls. Triangle edges become the crack network;
// the same triangles then separate, so the fracture does not jump positions.
export class DomainBreaks {
  constructor(scene) {
    this.scene = scene;
    this.entries = new Map();
  }

  create(event) {
    const open = event.type === "shrine";
    const source = new THREE.IcosahedronGeometry(1, 2);
    const base = source.attributes.position.array.slice();
    source.dispose();
    const centers = [];
    const axes = [];
    for (let i = 0; i < base.length; i += 9) {
      const center = new THREE.Vector3();
      for (let j = 0; j < 3; j++) center.add(new THREE.Vector3().fromArray(base, i + j * 3));
      centers.push(center.multiplyScalar(1 / 3));
      axes.push(new THREE.Vector3(Math.sin(i + 1), Math.cos(i * 2 + 1), .6).normalize());
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(base.length * 2), 3));
    const material = new THREE.MeshBasicMaterial({
      color: open ? 0x591d29 : 0x142c49, transparent: true, opacity: .68,
      side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: open ? 0xff7f91 : 0xd2f5ff, transparent: true, opacity: 1,
      depthWrite: false, fog: false, toneMapped: false
    });
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, material);
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    mesh.frustumCulled = edges.frustumCulled = false;
    root.add(mesh, edges);
    root.position.set(event.x, event.y, event.z);
    this.scene.add(root);
    return { root, geometry, edgeGeometry, material, edgeMaterial, base, centers, axes, open };
  }

  sync(events) {
    const alive = new Set(events);
    for (const [event, entry] of this.entries) {
      if (!alive.has(event)) { this.dispose(entry); this.entries.delete(event); }
    }
    const vertex = new THREE.Vector3();
    for (const event of events) {
      let entry = this.entries.get(event);
      if (!entry) { entry = this.create(event); this.entries.set(event, entry); }
      const { base, centers, axes, open } = entry;
      const flight = Math.max(0, event.age - .28);
      const fade = Math.max(0, 1 - flight / (event.duration - .28));
      const positions = entry.geometry.attributes.position;
      const edges = entry.edgeGeometry.attributes.position;
      for (let i = 0; i < base.length; i += 9) {
        const shard = i / 9, center = centers[shard];
        // Open domains collapse as low red slash fragments, without a closed shell.
        const speed = 3 + (shard % 7) * .65;
        for (let j = 0; j < 3; j++) {
          vertex.fromArray(base, i + j * 3).sub(center)
            .multiplyScalar(open ? .28 : .98)
            .applyAxisAngle(axes[shard], flight * (1.5 + shard % 4))
            .add(center).multiplyScalar(event.radius);
          vertex.addScaledVector(center, flight * speed);
          if (open) vertex.y = Math.abs(vertex.y) * .16 + flight * 3;
          else vertex.y -= flight * flight * 2.8;
          positions.setXYZ(i / 3 + j, vertex.x, vertex.y, vertex.z);
        }
        for (let j = 0; j < 3; j++) {
          const a = i / 3 + j, b = i / 3 + (j + 1) % 3;
          edges.setXYZ(shard * 6 + j * 2, positions.getX(a), positions.getY(a), positions.getZ(a));
          edges.setXYZ(shard * 6 + j * 2 + 1, positions.getX(b), positions.getY(b), positions.getZ(b));
        }
      }
      positions.needsUpdate = edges.needsUpdate = true;
      entry.material.opacity = fade * (open ? .42 : .7);
      entry.edgeMaterial.opacity = fade * Math.min(1, .2 + event.age * 7);
    }
  }

  dispose(entry) {
    this.scene.remove(entry.root);
    entry.geometry.dispose(); entry.edgeGeometry.dispose();
    entry.material.dispose(); entry.edgeMaterial.dispose();
  }

  clear() {
    for (const entry of this.entries.values()) this.dispose(entry);
    this.entries.clear();
  }
}
