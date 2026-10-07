import * as THREE from "three";

const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const MAX_RIBBONS = 192;

// One fixed-size ribbon buffer and one line buffer per expansion. No meshes or
// materials are allocated per hit/frame; split-screen reuses the same effects.
export class DomainDynamics {
  constructor(scene) { this.scene = scene; this.entries = new Map(); }

  create(domain) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_RIBBONS * 18), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_RIBBONS * 18), 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false });
    const ribbons = new THREE.Mesh(geometry, material);
    ribbons.frustumCulled = false;
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(480 * 6), 3).setUsage(THREE.DynamicDrawUsage));
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xb8deff, transparent: true, opacity: .5, depthWrite: false, fog: false, toneMapped: false });
    const streams = new THREE.LineSegments(lineGeometry, lineMaterial);
    streams.frustumCulled = false;
    streams.visible = domain.type === "void";
    const root = new THREE.Group(); root.add(ribbons, streams); this.scene.add(root);
    return { root, geometry, material, lineGeometry, lineMaterial, ribbons, streams, count: 0 };
  }

  ribbon(entry, x, y, z, angle, length, width, color, vertical = false) {
    if (entry.count >= MAX_RIBBONS) return;
    const c = Math.cos(angle), s = Math.sin(angle);
    const dx = c * length / 2, dy = vertical ? s * length / 2 : 0, dz = vertical ? 0 : s * length / 2;
    const wx = vertical ? -s * width : 0, wy = vertical ? c * width : width;
    const corners = [[x-dx-wx,y-dy-wy,z-dz],[x+dx-wx,y+dy-wy,z+dz],[x+dx+wx,y+dy+wy,z+dz],[x-dx+wx,y-dy+wy,z-dz]];
    const positions = entry.geometry.attributes.position, colors = entry.geometry.attributes.color;
    for (const index of [0,1,2,0,2,3]) {
      const vertex = entry.count * 6 + entry.vertex++;
      positions.setXYZ(vertex, ...corners[index]); colors.setXYZ(vertex, ...color);
    }
    entry.count++; entry.vertex = 0;
  }

  sync(game) {
    const live = new Set(game.domains.filter((d) => d.alive && ["shrine", "void", 'authenticLove'].includes(d.type)));
    for (const [domain, entry] of this.entries) if (!live.has(domain)) { this.dispose(entry); this.entries.delete(domain); }
    for (const domain of live) {
      let entry = this.entries.get(domain);
      if (!entry) { entry = this.create(domain); this.entries.set(domain, entry); }
      entry.count = entry.vertex = 0;
      const age = domain.maxLife - domain.life;
      const fade = Math.min(1, age / .3, Math.max(0, domain.life / .4));
      if (domain.type === "shrine") {
        // Open barrier: slashes fill real space; no spherical red shell.
        for (let i = 0; i < 32; i++) {
          const cycle = age * 7 + hash(i) * 4, phase = cycle % 1, seed = i * 17 + Math.floor(cycle) * 193;
          const r = Math.sqrt(hash(seed + 1)) * domain.radius * .94, a = hash(seed + 2) * Math.PI * 2;
          const x = domain.x + Math.cos(a) * r, z = domain.z + Math.sin(a) * r;
          const y = Math.max(.16, domain.y - 1 + hash(seed + 3) * 4);
          const length = Math.min(2 + hash(seed + 4) * 6, 2 * (domain.radius - r)) * Math.sin(phase * Math.PI);
          const angle = hash(seed + 5) * Math.PI;
          this.ribbon(entry,x,y,z,angle,length,.06,[.55,.035,.06],i%3===0);
          this.ribbon(entry,x,y,z,angle,length,.018,[1,.83,.8],i%3===0);
        }
      } else if (domain.type === 'void') {
        // Abstract perception/information rushing endlessly through the interior.
        const positions = entry.lineGeometry.attributes.position;
        for (let i = 0; i < 480; i++) {
          const azimuth = hash(i + 3) * Math.PI * 2 + age * .08;
          const v = hash(i + 1000) * 1.92 - .96, h = Math.sqrt(1-v*v);
          const radius = 8 + (hash(i + 2000) * 132 + age * (12 + hash(i) * 14)) % 132;
          const tail = radius + 1 + hash(i + 3000) * 3;
          positions.setXYZ(i*2,domain.x+Math.cos(azimuth)*h*radius,domain.y+v*radius,domain.z+Math.sin(azimuth)*h*radius);
          positions.setXYZ(i*2+1,domain.x+Math.cos(azimuth)*h*tail,domain.y+v*tail,domain.z+Math.sin(azimuth)*h*tail);
        }
        positions.needsUpdate = true;
        entry.lineMaterial.opacity = fade * (.34 + .08 * Math.sin(age * 2));
      }
      const hitFade = Math.max(0, 1 - (domain.tick - domain.tickTimer) / .24);
      if (domain.tickSerial > 0 && hitFade > 0) for (const target of (domain.visualTargets || []).slice(0, 8)) {
        if (domain.type === 'authenticLove') {
          if (!target.blocked) for (let j=0;j<5;j++) this.ribbon(entry,target.x+(j-2)*.23,target.y+6,target.z,Math.PI/2,12,.06*hitFade,[1,.88,.46],true);
          continue;
        }
        if (domain.type === "void" && target.blocked) continue;
        for (let i = 0; i < 6; i++) {
          const seed = i * 31 + domain.tickSerial * 97;
          const angle = hash(seed) * Math.PI;
          const offset = target.blocked ? 3.1 : 0;
          const x = target.x + Math.cos(i * Math.PI / 3) * offset;
          const z = target.z + Math.sin(i * Math.PI / 3) * offset;
          const y = target.y + .35 + hash(seed+1) * 1.5;
          const color = domain.type === "void" ? [.55,.8,1] : target.blocked ? [.4,.85,1] : [1,.92,.9];
          this.ribbon(entry,x,y,z,angle,(domain.type === "void" ? 1.5 : 2.7)*hitFade,.028*hitFade,color,true);
        }
      }
      entry.geometry.setDrawRange(0, entry.count * 6);
      entry.geometry.attributes.position.needsUpdate = entry.geometry.attributes.color.needsUpdate = true;
      entry.material.opacity = fade * .85;
    }
  }

  dispose(entry) {
    this.scene.remove(entry.root); entry.geometry.dispose(); entry.material.dispose();
    entry.lineGeometry.dispose(); entry.lineMaterial.dispose();
  }
  clear() { for (const entry of this.entries.values()) this.dispose(entry); this.entries.clear(); }
}
