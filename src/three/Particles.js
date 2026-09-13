import * as THREE from "three";

const VERT = /* glsl */`
  attribute vec3 color;
  attribute vec3 aVel;
  attribute float aBirth;
  attribute float aLife;
  attribute float aSize;
  attribute float aGravity;
  attribute float aDrag;
  attribute float aShape;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSizeScale;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vShape;
  varying float vViewZ;
  varying float vAlive;

  void main() {
    float age = uTime - aBirth;
    float k = age / max(aLife, 0.0001);
    vAlive = (age >= 0.0 && age < aLife) ? 1.0 : 0.0;

    float decay = pow(max(aDrag, 0.0001), age * 60.0);
    float lnDrag = log(max(aDrag, 0.0001));
    float s = (decay - 1.0) / (60.0 * lnDrag);

    vec3 p = position + aVel * s;
    p.y += 0.5 * aGravity * age * age;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vViewZ = -mv.z;
    gl_Position = projectionMatrix * mv;

    float grow = 1.0;
    gl_PointSize = aSize * grow * uPixelRatio * (uSizeScale / max(1.0, -mv.z));

    vColor = color;
    vShape = aShape;
    vAlpha = (1.0 - clamp(k, 0.0, 1.0)) * vAlive;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uGlow;
  uniform sampler2D uSolid;
  uniform sampler2D uSceneDepth;
  uniform vec2 uResolution;
  uniform float uFar;
  uniform float uSoftness;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vShape;
  varying float vViewZ;

  void main() {
    if (vAlpha <= 0.001) discard;
    vec2 uv = gl_PointCoord;
    vec4 tex = mix(texture2D(uGlow, uv), texture2D(uSolid, uv), vShape);
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    float sceneZ = texture2D(uSceneDepth, screenUv).r * uFar;
    float fade = clamp((sceneZ - vViewZ) / uSoftness, 0.0, 1.0);
    float alpha = tex.a * vAlpha * fade;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export class ParticlePool {
  constructor({ capacity, glowTex, solidTex, shared, pixelRatio }) {
    this.capacity = capacity;
    this.writeIndex = 0;
    this.totalSpawned = 0;

    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.birth = new Float32Array(capacity).fill(-1e9);
    this.life = new Float32Array(capacity).fill(1);
    this.size = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity).fill(0.96);
    this.shape = new Float32Array(capacity);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aVel", new THREE.BufferAttribute(this.vel, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aBirth", new THREE.BufferAttribute(this.birth, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aLife", new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aGravity", new THREE.BufferAttribute(this.gravity, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aDrag", new THREE.BufferAttribute(this.drag, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aShape", new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uSizeScale: { value: 900 },
        uGlow: { value: glowTex },
        uSolid: { value: solidTex },
        uSceneDepth: shared.uSceneDepth,
        uResolution: shared.uResolution,
        uFar: shared.uFar,
        uSoftness: shared.uSoftness
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.layers.set(1);

    this.geometry = geo;
  }

  spawn({ px, py, pz, vx, vy, vz, gravity, size, color, life, birth, shape }) {
    const i = this.writeIndex;
    const i3 = i * 3;
    this.pos[i3] = px; this.pos[i3 + 1] = py; this.pos[i3 + 2] = pz;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i3] = color.r; this.col[i3 + 1] = color.g; this.col[i3 + 2] = color.b;
    this.birth[i] = birth;
    this.life[i] = life;
    this.size[i] = size;
    this.gravity[i] = gravity;
    this.drag[i] = 0.94;
    this.shape[i] = shape;
    this.writeIndex = (i + 1) % this.capacity;
    this.totalSpawned += 1;
  }

  flush() {
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.aVel.needsUpdate = true;
    this.geometry.attributes.aBirth.needsUpdate = true;
    this.geometry.attributes.aLife.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aGravity.needsUpdate = true;
    this.geometry.attributes.aDrag.needsUpdate = true;
    this.geometry.attributes.aShape.needsUpdate = true;
  }

  setTime(t) {
    this.points.material.uniforms.uTime.value = t;
  }

  setPixelRatio(pr, height) {
    this.points.material.uniforms.uPixelRatio.value = pr;
    this.points.material.uniforms.uSizeScale.value = Math.max(300, height * 0.55);
  }

  clear() {
    this.birth.fill(-1e9);
    this.geometry.attributes.aBirth.needsUpdate = true;
  }
}
