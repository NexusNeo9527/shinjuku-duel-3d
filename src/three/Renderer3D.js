import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildPlaceholder, getGlowTexture, loadGltf } from "./models.js";
import { Post } from "./Post.js";
import { ParticlePool } from "./Particles.js";
import { clamp, lerp } from "../config3d.js";

function angLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function makeSolidTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 4;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 4, 4);
  return new THREE.CanvasTexture(c);
}

function makeGroundTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = "#0a0f1a";
  g.fillRect(0, 0, size, size);
  g.strokeStyle = "rgba(70,110,160,0.28)";
  g.lineWidth = 2;
  for (let i = 0; i <= 8; i += 1) {
    const p = (i / 8) * size;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(size, p); g.stroke();
  }
  g.strokeStyle = "rgba(120,170,220,0.5)";
  g.lineWidth = 3;
  g.strokeRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.isTouch = typeof window !== "undefined" && (("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0);
    this.maxDpr = this.isTouch ? 1.3 : 2;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.isTouch });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
    this.renderer.shadowMap.enabled = !this.isTouch;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#070a12");
    this.scene.fog = new THREE.FogExp2(0x070a12, 0.011);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.5;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
    this.camera.layers.enable(1);
    this.camera2 = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
    this.camera2.layers.enable(1);
    this.cam2Yaw = 0;

    this.width = 800;
    this.height = 600;
    this.camYaw = Math.PI;
    this.camPitch = 0.16;
    this.camDist = 11;
    this.camHeight = 1.7;
    this.shoulder = 2.0;
    this.camAim = { x: 0, y: 0, z: 1 };
    this.camTarget = new THREE.Vector3();
    this.speedFactor = 0;
    this._prevPlayer = null;
    this.lockCamera = false;

    this.glowTex = getGlowTexture();
    this.solidTex = makeSolidTexture();

    this.vfxUniforms = {
      uSceneDepth: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uFar: { value: this.camera.far },
      uSoftness: { value: 1.2 }
    };
    this.depthTarget = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: true });
    this.depthTarget.texture.minFilter = THREE.NearestFilter;
    this.depthTarget.texture.magFilter = THREE.NearestFilter;
    this.vfxUniforms.uSceneDepth.value = this.depthTarget.texture;
    this.depthMaterial = new THREE.ShaderMaterial({
      uniforms: { uFar: { value: this.camera.far } },
      vertexShader: "varying float vViewZ; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vViewZ = -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying float vViewZ; uniform float uFar; void main(){ gl_FragColor = vec4(vViewZ / uFar, 0.0, 0.0, 1.0); }"
    });

    this.fighters = {};
    this.projectiles = new Map();
    this.beams = [];
    this.beamPool = [];
    this.damageTextMap = new Map();
    this.domains = [];
    this.aimArrows = {};
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();

    this.particlePool = new ParticlePool({
      capacity: 4000,
      glowTex: this.glowTex,
      solidTex: this.solidTex,
      shared: this.vfxUniforms,
      pixelRatio: this.renderer.getPixelRatio()
    });
    this.scene.add(this.particlePool.points);

    this.buildLights();
    this.buildArena();

    this.post = new Post(this.renderer, this.scene, this.camera);
    this._flash = 0;
    this.loading = { gojo: false, sukuna: false };
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x5a6f96, 0x0c1120, 1.1));
    const key = new THREE.DirectionalLight(0xe6f0ff, 2.4);
    key.position.set(30, 60, 40);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const s = 70;
    key.shadow.camera.left = -s; key.shadow.camera.right = s;
    key.shadow.camera.top = s; key.shadow.camera.bottom = -s;
    key.shadow.camera.far = 260;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x5566cc, 1.3);
    rim.position.set(-40, 30, -50);
    this.scene.add(rim);
    this.gojoLight = new THREE.PointLight(0x44d9ff, 0, 40, 0);
    this.sukunaLight = new THREE.PointLight(0xff4e64, 0, 40, 0);
    this.scene.add(this.gojoLight, this.sukunaLight);
  }

  buildArena() {
    const tex = makeGroundTexture();
    tex.repeat.set(12, 12);
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshStandardMaterial({ map: tex, color: 0x8fa4c4, roughness: 0.85, metalness: 0.25 })
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // boundary glow ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(45.2, 46, 96),
      new THREE.MeshBasicMaterial({ color: 0x3a6a9c, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.layers.set(1);
    this.scene.add(ring);

    // ruined skyline around the arena
    const colors = [0x121b29, 0x16202f, 0x101823, 0x1a2536];
    for (let i = 0; i < 46; i += 1) {
      const a = (i / 46) * Math.PI * 2 + Math.random() * 0.1;
      const dist = 62 + Math.random() * 46;
      const w = 6 + Math.random() * 12;
      const h = 8 + Math.random() * 40;
      const d = 6 + Math.random() * 12;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.9, metalness: 0.1 })
      );
      b.position.set(Math.sin(a) * dist, h / 2, Math.cos(a) * dist);
      b.rotation.y = Math.random() * Math.PI;
      b.castShadow = true;
      this.scene.add(b);
      const winN = Math.floor(Math.random() * 10);
      for (let j = 0; j < winN; j += 1) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 1.2),
          new THREE.MeshBasicMaterial({ color: Math.random() > 0.6 ? 0x6fb4e6 : 0x3a6a9c, transparent: true, opacity: 0.85 })
        );
        win.position.set(
          b.position.x + (Math.random() - 0.5) * (w - 1),
          b.position.y + (Math.random() - 0.5) * (h - 2),
          b.position.z
        );
        win.lookAt(0, win.position.y, 0);
        this.scene.add(win);
      }
    }
    this.boundary = 46;
    void this.boundary;
  }

  // ---- camera ----
  setOrbit(yaw, pitch, dist) {
    this.camYaw = yaw;
    this.camPitch = clamp(pitch, -0.5, 1.05);
    this.camDist = clamp(dist, 5, 34);
  }

  groundPoint(ndcX, ndcY) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const out = new THREE.Vector3();
    if (rc.ray.intersectPlane(plane, out)) return { x: out.x, z: out.z };
    return null;
  }

  // stable aim: a world point far along the mouse ray (works at any altitude, never null)
  screenRay(ndcX, ndcY) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const o = rc.ray.origin;
    const d = rc.ray.direction;
    return { ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z };
  }

  // stable aim: the mouse ray's horizontal azimuth (independent of altitude/pitch)
  aimDirection(ndcX, ndcY) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const d = rc.ray.direction;
    const hl = Math.hypot(d.x, d.z);
    if (hl < 1e-4) return null;
    return { x: d.x / hl, z: d.z / hl };
  }

  // the aim's horizontal direction (used by touch controls)
  cameraForward() {
    const a = this.camAim;
    const hl = Math.hypot(a.x, a.z);
    if (hl < 1e-4) return { x: 0, z: 1 };
    return { x: a.x / hl, z: a.z / hl };
  }

  projectToScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height };
  }

  resize(width, height) {
    this.width = Math.max(320, width);
    this.height = Math.max(240, height);
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.post.setSize(this.width, this.height, dpr);
    const bufW = Math.max(2, Math.floor(this.width * dpr));
    const bufH = Math.max(2, Math.floor(this.height * dpr));
    this.depthTarget.setSize(Math.floor(bufW / 2), Math.floor(bufH / 2));
    this.vfxUniforms.uResolution.value.set(bufW, bufH);
    this.vfxUniforms.uFar.value = this.camera.far;
    this.depthMaterial.uniforms.uFar.value = this.camera.far;
    this.particlePool.setPixelRatio(dpr, this.height);
  }

  // ---- soft vfx material ----
  makeSoftMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSceneDepth: this.vfxUniforms.uSceneDepth,
        uResolution: this.vfxUniforms.uResolution,
        uFar: this.vfxUniforms.uFar,
        uSoftness: this.vfxUniforms.uSoftness
      },
      vertexShader: `
        attribute vec3 color;
        attribute float aAlpha;
        varying vec3 vColor; varying float vAlpha; varying float vViewZ;
        void main(){ vColor=color; vAlpha=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0); vViewZ=-mv.z; gl_Position=projectionMatrix*mv; }
      `,
      fragmentShader: `
        uniform sampler2D uSceneDepth; uniform vec2 uResolution; uniform float uFar; uniform float uSoftness;
        varying vec3 vColor; varying float vAlpha; varying float vViewZ;
        void main(){ vec2 uv=gl_FragCoord.xy/uResolution; float sz=texture2D(uSceneDepth,uv).r*uFar; float fade=clamp((sz-vViewZ)/uSoftness,0.0,1.0); gl_FragColor=vec4(vColor, vAlpha*fade); }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
  }

  makeRibbon(maxPoints) {
    const positions = new Float32Array(maxPoints * 2 * 3);
    const colors = new Float32Array(maxPoints * 2 * 3);
    const alphas = new Float32Array(maxPoints * 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < maxPoints - 1; i += 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(geo, this.makeSoftMaterial());
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    return { mesh, positions, colors, alphas, maxPoints };
  }

  makeTube(sides = 10, maxRings = 24) {
    const ringVerts = sides + 1;
    const count = maxRings * ringVerts;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const indices = [];
    for (let r = 0; r < maxRings - 1; r += 1) {
      for (let s = 0; s < sides; s += 1) {
        const a = r * ringVerts + s;
        const b = a + ringVerts;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(indices);
    geo.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(geo, this.makeSoftMaterial());
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    return { mesh, positions, colors, alphas, sides, maxRings, ringVerts };
  }

  updateTube(tube, points, color, radiusScale, alphaScale) {
    const { sides, maxRings, ringVerts, positions, colors, alphas } = tube;
    const rings = Math.min(maxRings, points.length);
    if (rings < 2) { tube.mesh.geometry.setDrawRange(0, 0); return; }
    const cam = this.camera.position;
    const t = this._v1, b1 = this._v2, b2 = this._v3;
    for (let r = 0; r < rings; r += 1) {
      const pt = points[r];
      const prev = points[r > 0 ? r - 1 : 0];
      const next = points[r < rings - 1 ? r + 1 : rings - 1];
      t.set(next.x - prev.x, next.y - prev.y, next.z - prev.z);
      if (t.lengthSq() < 1e-8) t.set(0, 1, 0);
      t.normalize();
      b1.set(cam.x - pt.x, cam.y - pt.y, cam.z - pt.z).normalize();
      b1.crossVectors(t, b1);
      if (b1.lengthSq() < 1e-8) b1.set(1, 0, 0);
      b1.normalize();
      b2.crossVectors(t, b1).normalize();
      const k = 1 - r / rings;
      const rad = radiusScale * (0.35 + 0.65 * k);
      const a = alphaScale * (0.2 + 0.8 * k);
      for (let s = 0; s <= sides; s += 1) {
        const ang = (s / sides) * Math.PI * 2;
        const cx = Math.cos(ang) * rad;
        const sy = Math.sin(ang) * rad;
        const o = (r * ringVerts + s) * 3;
        positions[o] = pt.x + b1.x * cx + b2.x * sy;
        positions[o + 1] = pt.y + b1.y * cx + b2.y * sy;
        positions[o + 2] = pt.z + b1.z * cx + b2.z * sy;
        colors[o] = color.r; colors[o + 1] = color.g; colors[o + 2] = color.b;
        alphas[r * ringVerts + s] = a;
      }
    }
    tube.mesh.geometry.setDrawRange(0, (rings - 1) * sides * 6);
    tube.mesh.geometry.attributes.position.needsUpdate = true;
    tube.mesh.geometry.attributes.color.needsUpdate = true;
    tube.mesh.geometry.attributes.aAlpha.needsUpdate = true;
  }

  updateRibbonWorld(ribbon, points, color, width, alphaScale) {
    const { positions, colors, alphas, maxPoints } = ribbon;
    const n = Math.min(maxPoints, points.length);
    if (n < 2) { ribbon.mesh.geometry.setDrawRange(0, 0); return; }
    const cam = this.camera.position;
    const t = this._v1, side = this._v2, toCam = this._v3;
    for (let i = 0; i < n; i += 1) {
      const pt = points[i];
      const prev = points[i > 0 ? i - 1 : 0];
      const next = points[i < n - 1 ? i + 1 : n - 1];
      t.set(next.x - prev.x, next.y - prev.y, next.z - prev.z);
      if (t.lengthSq() < 1e-8) t.set(0, 1, 0);
      t.normalize();
      toCam.set(cam.x - pt.x, cam.y - pt.y, cam.z - pt.z).normalize();
      side.crossVectors(t, toCam);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
      side.normalize().multiplyScalar(width * 0.5 * (1 - (i / n) * 0.7));
      const o = i * 6;
      positions[o] = pt.x - side.x; positions[o + 1] = pt.y - side.y; positions[o + 2] = pt.z - side.z;
      positions[o + 3] = pt.x + side.x; positions[o + 4] = pt.y + side.y; positions[o + 5] = pt.z + side.z;
      colors[o] = color.r; colors[o + 1] = color.g; colors[o + 2] = color.b;
      colors[o + 3] = color.r; colors[o + 4] = color.g; colors[o + 5] = color.b;
      const a = alphaScale * (1 - i / n);
      alphas[i * 2] = a; alphas[i * 2 + 1] = a;
    }
    ribbon.mesh.geometry.setDrawRange(0, (n - 1) * 6);
    ribbon.mesh.geometry.attributes.position.needsUpdate = true;
    ribbon.mesh.geometry.attributes.color.needsUpdate = true;
    ribbon.mesh.geometry.attributes.aAlpha.needsUpdate = true;
  }

  // ---- fighters ----
  ensureFighter(entity) {
    const key = entity.charId;
    if (this.fighters[key]) return this.fighters[key];
    const group = new THREE.Group();
    const model = buildPlaceholder(key);
    const scale = 1.85 / 86;
    model.scale.setScalar(scale);
    model.position.y = 43 * scale;
    const inner = new THREE.Group();
    inner.add(model);
    group.add(inner);
    this.scene.add(group);
    const entry = { group, model, inner };
    model.traverse((o) => { if (o.userData?.isAura) o.layers.set(1); });
    this.fighters[key] = entry;
    this.loadModel(key, entry, scale);
    return entry;
  }

  async loadModel(key, entry, scale) {
    if (this.loading[key]) return;
    this.loading[key] = true;
    const model = await loadGltf(key);
    if (model && entry) {
      entry.inner.clear();
      model.scale.setScalar(scale * 1.6);
      entry.inner.add(model);
      entry.model = model;
      model.traverse((o) => { if (o.userData?.isAura) o.layers.set(1); });
    }
  }

  syncFighter(game, dt) {
    for (const e of game.entities) {
      const entry = this.ensureFighter(e);
      if (!e.alive) { entry.group.visible = false; continue; }
      entry.group.visible = true;
      entry.group.position.set(e.x, e.y + (e.moving ? Math.abs(Math.sin(game.elapsed * 8)) * 0.06 : 0), e.z);
      entry.group.rotation.y = e.yaw;
      if (entry.model?.userData?.animate) entry.model.userData.animate(game.elapsed, e.moving ? 1 : 0);
      const hurt = game.elapsed - e.hurtAt < 0.12;
      if (entry.hurt !== hurt) {
        entry.hurt = hurt;
        entry.model.traverse((o) => {
          if (o.isMesh && o.material && o.material.emissive !== undefined) {
            const base = o.material.userData?.baseEmissive ?? 0;
            o.material.emissiveIntensity = hurt ? Math.max(1.0, base) : base;
          }
        });
      }
      const light = e.charId === "gojo" ? this.gojoLight : this.sukunaLight;
      light.intensity = 14;
      light.position.set(e.x, e.y + 1.6, e.z);
    }
  }

  // ---- aim arrow ----
  ensureAimArrow(id, color) {
    if (this.aimArrows[id]) return this.aimArrows[id];
    const group = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0.5, 0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
        uReady: { value: 1 },
        uSceneDepth: this.vfxUniforms.uSceneDepth,
        uResolution: this.vfxUniforms.uResolution,
        uFar: this.vfxUniforms.uFar,
        uSoftness: this.vfxUniforms.uSoftness
      },
      vertexShader: "varying vec2 vPos; varying float vViewZ; void main(){ vPos=position.xy; vec4 mv=modelViewMatrix*vec4(position,1.0); vViewZ=-mv.z; gl_Position=projectionMatrix*mv; }",
      fragmentShader: `
        uniform vec3 uColor; uniform float uTime; uniform float uReady;
        uniform sampler2D uSceneDepth; uniform vec2 uResolution; uniform float uFar; uniform float uSoftness;
        varying vec2 vPos; varying float vViewZ;
        void main(){
          vec2 p=vPos;
          float hw=0.11+p.x*0.05;
          float body=1.0-smoothstep(hw,hw+0.05,abs(p.y));
          body*=smoothstep(0.0,0.06,p.x)*(1.0-smoothstep(0.93,1.0,p.x));
          float period=0.18; float x=mod(p.x,period); float xv=period*0.8;
          float dist=abs(abs(p.y)-0.32*max(0.0,xv-x));
          float chev=1.0-smoothstep(0.0,0.03,dist);
          chev*=smoothstep(0.0,0.05,p.x)*(1.0-smoothstep(0.88,1.0,p.x));
          float sw=1.0-smoothstep(0.0,0.07,abs(p.x-(fract(uTime*0.8)*1.2-0.1)));
          float tip=1.0-smoothstep(0.0,0.08,length(p-vec2(0.95,0.0)));
          float a=body*0.35+chev*0.6+sw*0.5+tip*(0.7+uReady*0.6);
          a=min(a,1.0);
          vec2 uv=gl_FragCoord.xy/uResolution; float sz=texture2D(uSceneDepth,uv).r*uFar;
          float fade=clamp((sz-vViewZ)/uSoftness,0.0,1.0);
          vec3 col=mix(uColor,vec3(1.0),clamp(tip*0.6+sw*0.5,0.0,1.0));
          gl_FragColor=vec4(col,a*fade);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    this.scene.add(group);
    this.aimArrows[id] = { group, mat };
    return this.aimArrows[id];
  }

  syncAimArrows(game) {
    for (const e of game.entities) {
      if (!e.isPlayer) continue;
      const arrow = this.ensureAimArrow(e.id, e.color);
      if (!e.alive || game.state !== "playing") { arrow.group.visible = false; continue; }
      const dir = game.fireDir(e);
      const origin = this._arrowOrigin || (this._arrowOrigin = new THREE.Vector3());
      origin.set(e.x, e.y + 1.0, e.z);
      const cam = this.camera.position;
      const xA = this._ax || (this._ax = new THREE.Vector3());
      const zA = this._az || (this._az = new THREE.Vector3());
      const yA = this._ay || (this._ay = new THREE.Vector3());
      xA.set(dir.x, dir.y, dir.z).normalize();
      zA.set(cam.x - origin.x, cam.y - origin.y, cam.z - origin.z).normalize();
      zA.crossVectors(xA, zA);
      if (zA.lengthSq() < 1e-6) zA.set(0, 1, 0);
      zA.normalize();
      yA.crossVectors(zA, xA).normalize();
      const m = this._arrowMat || (this._arrowMat = new THREE.Matrix4());
      m.makeBasis(xA, yA, zA);
      arrow.group.position.copy(origin);
      arrow.group.quaternion.setFromRotationMatrix(m);
      const range = 12;
      arrow.group.scale.set(range, range * 0.42, 1);
      arrow.mat.uniforms.uTime.value = game.elapsed;
      arrow.group.visible = true;
    }
  }

  // ---- projectiles ----
  ensureProjectile(p) {
    let entry = this.projectiles.get(p);
    if (entry) return entry;
    const group = new THREE.Group();
    const color = new THREE.Color(p.color);
    const coreColor = new THREE.Color(p.core);
    if (p.shape === "blade") {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      sprite.scale.set(3.4, 1.1, 1);
      group.add(sprite);
      entry = { group, sprite, type: "blade" };
    } else {
      const core = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 14, 14), new THREE.MeshBasicMaterial({ color: coreColor, blending: THREE.AdditiveBlending, depthWrite: false }));
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      sprite.scale.setScalar(p.radius * 4.5);
      group.add(core, sprite);
      entry = { group, sprite, core, type: "orb" };
    }
    group.traverse((o) => o.layers.set(1));
    this.scene.add(group);
    entry.color = color;
    entry.ribbon = this.makeRibbon(16);
    this.scene.add(entry.ribbon.mesh);
    entry.trail = [];
    this.projectiles.set(p, entry);
    return entry;
  }

  syncProjectiles(game) {
    for (const p of game.projectiles) {
      if (!p.alive) continue;
      const entry = this.ensureProjectile(p);
      entry.group.position.set(p.x, p.y, p.z);
      if (entry.type === "blade") entry.sprite.material.rotation = Math.atan2(p.vx, p.vz) + Math.PI / 2;
      entry.trail.unshift({ x: p.x, y: p.y, z: p.z });
      if (entry.trail.length > 14) entry.trail.pop();
      this.updateRibbonWorld(entry.ribbon, entry.trail, entry.color, p.radius * 2.2, 0.9);
    }
    for (const [p, entry] of this.projectiles) {
      if (!p.alive) {
        this.scene.remove(entry.group);
        entry.group.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
        this.scene.remove(entry.ribbon.mesh);
        entry.ribbon.mesh.geometry.dispose();
        entry.ribbon.mesh.material.dispose();
        this.projectiles.delete(p);
      }
    }
  }

  // ---- beams ----
  ensureBeam() {
    const tube = this.makeTube(10, 22);
    this.scene.add(tube.mesh);
    return tube;
  }

  syncBeams(game) {
    while (this.beams.length < game.beams.length) this.beams.push(this.ensureBeam());
    for (let i = 0; i < this.beams.length; i += 1) {
      const tube = this.beams[i];
      const b = game.beams[i];
      if (!b) { tube.mesh.visible = false; continue; }
      tube.mesh.visible = true;
      const pts = [];
      const N = 18;
      for (let k = 0; k <= N; k += 1) {
        const t = (k / N) * b.length;
        pts.push({ x: b.x + b.dx * t, y: b.y + b.dy * t, z: b.z + b.dz * t });
      }
      const k = clamp(b.life / b.maxLife, 0, 1);
      const color = new THREE.Color(b.color);
      this.updateTube(tube, pts, color, b.width * (0.5 + 0.5 * k), 1.0 * k);
      const coreCol = new THREE.Color(b.core);
      void coreCol;
    }
  }

  // ---- domains ----
  ensureDomain() {
    const group = new THREE.Group();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 28, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide })
    );
    group.add(sphere);
    const ringGeo = new THREE.RingGeometry(0.94, 1, 80);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
    const field = new THREE.Points(
      (() => {
        const n = 260;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const b2 = Math.acos(2 * Math.random() - 1);
          const r = Math.cbrt(Math.random());
          pos[i * 3] = Math.sin(b2) * Math.cos(a) * r;
          pos[i * 3 + 1] = Math.cos(b2) * r;
          pos[i * 3 + 2] = Math.sin(b2) * Math.sin(a) * r;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        return g;
      })(),
      new THREE.PointsMaterial({ size: 0.3, map: this.glowTex, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(field);
    group.traverse((o) => o.layers.set(1));
    this.scene.add(group);
    return { group, sphere, ring, field };
  }

  syncDomains(game) {
    while (this.domains.length < game.domains.length) this.domains.push(this.ensureDomain());
    for (let i = 0; i < this.domains.length; i += 1) {
      const dom = this.domains[i];
      const d = game.domains[i];
      if (!d) { dom.group.visible = false; continue; }
      dom.group.visible = true;
      const intro = clamp((d.maxLife - d.life) / 0.5, 0, 1);
      const outro = clamp(d.life / 0.6, 0, 1);
      const a = Math.min(intro, outro);
      dom.group.position.set(d.x, d.y, d.z);
      dom.group.scale.set(d.radius, d.radius, d.radius);
      dom.sphere.material.color.set(d.color);
      dom.ring.material.color.set(d.color);
      dom.field.material.color.set(d.core);
      dom.sphere.material.opacity = a * 0.2;
      dom.ring.material.opacity = a * 0.7;
      dom.field.material.opacity = a * 0.75;
      dom.field.rotation.y = game.elapsed * 0.6;
    }
  }

  // ---- particles / texts ----
  syncParticles(game) {
    const pool = this.particlePool;
    pool.setTime(game.elapsed);
    if (!game.particles.length) return;
    const color = this._pcolor || (this._pcolor = new THREE.Color());
    for (const p of game.particles) {
      color.set(p.color);
      pool.spawn({
        px: p.x, py: p.y, pz: p.z,
        vx: p.vx, vy: p.vy, vz: p.vz,
        gravity: -(p.gravity || 0),
        size: (p.size || 1.5) * (p.shard ? 2.6 : 2.2),
        color,
        life: p.life || 0.6,
        birth: game.elapsed,
        shape: p.shard ? 1 : 0
      });
    }
    pool.flush();
    game.particles.length = 0;
  }

  makeTextSprite(text, color) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 96;
    const g = c.getContext("2d");
    g.font = "800 56px ui-monospace, monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = color; g.shadowBlur = 12;
    g.fillStyle = color;
    g.fillText(text, 128, 48);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
    sprite.scale.set(1.6, 0.6, 1);
    sprite.layers.set(1);
    return { sprite, texture: tex };
  }

  syncDamageTexts(game) {
    const live = new Set();
    for (const d of game.damageTexts) {
      live.add(d);
      let entry = this.damageTextMap.get(d);
      if (!entry) {
        entry = this.makeTextSprite(d.text, d.color);
        this.scene.add(entry.sprite);
        this.damageTextMap.set(d, entry);
      }
      entry.sprite.position.set(d.x, d.y, d.z);
      entry.sprite.material.opacity = clamp(d.life / d.maxLife, 0, 1);
    }
    for (const [d, entry] of this.damageTextMap) {
      if (!live.has(d)) {
        this.scene.remove(entry.sprite);
        entry.sprite.material.dispose();
        entry.texture.dispose();
        this.damageTextMap.delete(d);
      }
    }
  }

  // ---- camera + render ----
  aimFrom(yaw, pitch) {
    const cp = Math.cos(pitch);
    return { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp };
  }

  placeTps(cam, player, yaw, pitch, distBase) {
    const chestY = player.y + 1.1;
    const aim = this.aimFrom(yaw, pitch);
    const d = distBase * (1 + this.speedFactor * 0.07);
    const rx = -Math.cos(yaw) * this.shoulder;
    const rz = Math.sin(yaw) * this.shoulder;
    const px = player.x - Math.sin(yaw) * d + rx;
    const py = Math.max(0.9, chestY + this.camHeight - aim.y * d * 0.32);
    const pz = player.z - Math.cos(yaw) * d + rz;
    cam.position.set(px, py, pz);
    cam.lookAt(px + aim.x * 50, py + aim.y * 50, pz + aim.z * 50);
  }

  applyDualCameras(game, dt) {
    const ps = game.entities.filter((e) => e.isPlayer && e.alive);
    if (ps.length < 2) return;
    const p1 = ps[0];
    const p2 = ps[1];
    this.placeTps(this.camera, p1, this.camYaw, this.camPitch, this.camDist);
    this.camAim = this.aimFrom(this.camYaw, this.camPitch);
    const manual = performance.now() - (this.lastManualOrbit || 0) < 2000;
    if (dt > 0) {
      const dx2 = p1.x - p2.x;
      const dz2 = p1.z - p2.z;
      const len2 = Math.hypot(dx2, dz2);
      if (len2 > 0.5) this.cam2Yaw = angLerp(this.cam2Yaw, Math.atan2(dx2 / len2, dz2 / len2), Math.min(1, dt * 6));
      if (!manual) {
        const dx1 = p2.x - p1.x;
        const dz1 = p2.z - p1.z;
        const len1 = Math.hypot(dx1, dz1);
        if (len1 > 0.5) this.camYaw = angLerp(this.camYaw, Math.atan2(dx1 / len1, dz1 / len1), Math.min(1, dt * 6));
      }
    }
    this.placeTps(this.camera, p1, this.camYaw, this.camPitch, this.camDist);
    this.placeTps(this.camera2, p2, this.cam2Yaw, 0.16, this.camDist);
  }

  applyCamera(game, dt) {
    if (game.mode === "dual") { this.applyDualCameras(game, dt); return; }
    const ls = dt > 0 ? Math.pow(0.0005, dt) : 0;
    const goal = this._camGoal || (this._camGoal = new THREE.Vector3());
    const look = this._camLook || (this._camLook = new THREE.Vector3());

    const player = game.player();
    if (player) {
      const chestY = player.y + 1.1;
      this.camTarget.set(player.x, chestY, player.z);
      // auto-face the locked target (manual look overrides for a moment)
      if (this.lockCamera && dt > 0 && performance.now() - (this.lastManualOrbit || 0) > 2000) {
        const target = game.lockEntity(player);
        if (target) {
          const dx = target.x - player.x;
          const dz = target.z - player.z;
          const len = Math.hypot(dx, dz);
          if (len > 0.6) this.camYaw = angLerp(this.camYaw, Math.atan2(dx / len, dz / len), Math.min(1, dt * 6));
        }
      }
      const cp = Math.cos(this.camPitch);
      this.camAim = { x: Math.sin(this.camYaw) * cp, y: Math.sin(this.camPitch), z: Math.cos(this.camYaw) * cp };
      const dist = this.camDist * (1 + this.speedFactor * 0.07);
      const rx = -Math.cos(this.camYaw) * this.shoulder;
      const rz = Math.sin(this.camYaw) * this.shoulder;
      goal.set(
        player.x - Math.sin(this.camYaw) * dist + rx,
        Math.max(0.9, chestY + this.camHeight - this.camAim.y * dist * 0.32),
        player.z - Math.cos(this.camYaw) * dist + rz
      );
      look.set(goal.x + this.camAim.x * 50, goal.y + this.camAim.y * 50, goal.z + this.camAim.z * 50);
    }

    this.camera.position.lerp(goal, 1);
    this.camera.position.y = Math.max(0.9, this.camera.position.y);
    this._lookAt = this._lookAt || look.clone();
    this._lookAt.lerp(look, 1);
    this.camera.lookAt(this._lookAt);

    const wantFov = 55 + this.speedFactor * 9;
    this.camera.fov = lerp(this.camera.fov, wantFov, Math.min(1, dt * 6));
    this.camera.updateProjectionMatrix();
    void ls;

    const shake = game.screenShake;
    if (shake > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
      this.camera.position.z += (Math.random() - 0.5) * shake;
    }
  }

  sync(game, dt) {
    this._flash = game.flash || 0;
    this._mode = game.mode;
    const p = game.player();
    if (p) {
      if (this._prevPlayer) {
        const dx = p.x - this._prevPlayer.x;
        const dy = p.y - this._prevPlayer.y;
        const dz = p.z - this._prevPlayer.z;
        const sp = dt > 0 ? Math.hypot(dx, dy, dz) / dt : 0;
        const target = clamp(sp / 15, 0, 1);
        this.speedFactor = lerp(this.speedFactor, target, Math.min(1, dt * 8));
      }
      this._prevPlayer = { x: p.x, y: p.y, z: p.z };
    }
    this.syncFighter(game, dt);
    this.syncAimArrows(game);
    this.syncProjectiles(game);
    this.syncBeams(game);
    this.syncDomains(game);
    this.syncParticles(game);
    this.syncDamageTexts(game);
    this.applyCamera(game, dt);
  }

  render(dt = 0) {
    if (this._mode === "dual") { this._renderDual(); return; }
    this._renderDepthPrepass();
    this.post.sync(dt, this._flash, this.speedFactor);
    this.post.render();
  }

  // split-screen: left half = player 1, right half = player 2
  _renderDual() {
    const gl = this.renderer;
    const w = this.width;
    const h = this.height;
    const half = Math.floor(w / 2);

    // split view has no shared depth buffer — clear it to "far" so VFX stay visible
    gl.setRenderTarget(this.depthTarget);
    gl.setClearColor(0xffffff, 1);
    gl.clear();
    gl.setRenderTarget(null);
    gl.setClearColor(0x000000, 1);

    this.camera.aspect = half / h;
    this.camera.updateProjectionMatrix();
    this.camera2.aspect = (w - half) / h;
    this.camera2.updateProjectionMatrix();

    gl.setScissorTest(true);
    gl.setViewport(0, 0, half, h);
    gl.setScissor(0, 0, half, h);
    gl.render(this.scene, this.camera);

    gl.setViewport(half, 0, w - half, h);
    gl.setScissor(half, 0, w - half, h);
    gl.render(this.scene, this.camera2);

    gl.setScissorTest(false);
    gl.setViewport(0, 0, w, h);
    gl.setScissor(0, 0, w, h);
  }

  _renderDepthPrepass() {
    const prevBg = this.scene.background;
    const prevOverride = this.scene.overrideMaterial;
    const prevMask = this.camera.layers.mask;
    const prevTarget = this.renderer.getRenderTarget();
    const prevClear = new THREE.Color();
    this.renderer.getClearColor(prevClear);
    const prevAlpha = this.renderer.getClearAlpha();

    this.scene.background = null;
    this.scene.overrideMaterial = this.depthMaterial;
    this.camera.layers.set(0);
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.setRenderTarget(this.depthTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(prevTarget);
    this.renderer.setClearColor(prevClear, prevAlpha);
    this.scene.background = prevBg;
    this.scene.overrideMaterial = prevOverride;
    this.camera.layers.mask = prevMask;
  }

  reset() {
    for (const [p, entry] of this.projectiles) {
      this.scene.remove(entry.group);
      this.scene.remove(entry.ribbon.mesh);
      void p;
    }
    this.projectiles.clear();
    for (const [d, entry] of this.damageTextMap) {
      this.scene.remove(entry.sprite);
      void d;
    }
    this.damageTextMap.clear();
    this.particlePool.clear();
    for (const dom of this.domains) dom.group.visible = false;
    for (const tube of this.beams) tube.mesh.visible = false;
  }
}
