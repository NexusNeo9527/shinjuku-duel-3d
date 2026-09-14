import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { clamp } from "../config.js";

const GradeShader = {
  name: "GradeShader",
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.35 },
    uVignette: { value: 0.42 },
    uContrast: { value: 1.06 },
    uSaturation: { value: 1.12 },
    uTemperature: { value: 0.04 },
    uGrain: { value: 0.028 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uFlashStrength: { value: 0 },
    uSpeed: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uTemperature;
    uniform float uGrain;
    uniform vec3 uFlashColor;
    uniform float uFlashStrength;
    uniform float uSpeed;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float r2 = dot(centered, centered);

      vec3 color;
      if (uAberration > 0.001) {
        vec2 offset = centered * r2 * uAberration * 0.02;
        color.r = texture2D(tDiffuse, uv + offset).r;
        color.g = texture2D(tDiffuse, uv).g;
        color.b = texture2D(tDiffuse, uv - offset).b;
      } else {
        color = texture2D(tDiffuse, uv).rgb;
      }

      color = (color - 0.5) * uContrast + 0.5;
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);
      color.r += uTemperature * 0.12;
      color.b -= uTemperature * 0.12;
      color *= 1.0 - uVignette * smoothstep(0.15, 0.72, r2 * 1.9);

      if (uFlashStrength > 0.001) {
        color = mix(color, uFlashColor, clamp(uFlashStrength, 0.0, 1.0) * 0.42);
      }
      if (uGrain > 0.0005) {
        float grain = hash12(uv * vec2(1920.0, 1080.0) + fract(uTime) * 137.0) - 0.5;
        color += grain * uGrain;
      }

      if (uSpeed > 0.001) {
        float s = clamp(uSpeed, 0.0, 1.0);
        color *= 1.0 - s * 0.14 * smoothstep(0.08, 0.75, r2 * 1.9);
        float ang = atan(centered.y, centered.x);
        float streak = 0.5 + 0.5 * sin(ang * 44.0 + uTime * 4.0);
        color += vec3(0.55, 0.72, 1.0) * streak * s * 0.035 * smoothstep(0.16, 0.6, r2);
      }
      gl_FragColor = vec4(max(color, 0.0), 1.0);
    }
  `
};

export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    // keep bloom restrained: a high threshold means only the genuinely bright
    // cores glow, instead of the whole scene washing out the fighters
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.42, 0.52);
    this.composer.addPass(this.bloomPass);

    this.composer.addPass(new OutputPass());

    this.gradePass = new ShaderPass(GradeShader);
    this.gradePass.renderToScreen = true;
    this.composer.addPass(this.gradePass);

    this.time = 0;
  }

  sync(dt, flash, speed = 0) {
    this.time += dt;
    const u = this.gradePass.uniforms;
    u.uTime.value = this.time;
    const f = clamp(flash, 0, 1);
    const s = clamp(speed, 0, 1);
    u.uFlashStrength.value = f;
    u.uAberration.value = 0.2 + f * 0.8 + s * 0.4;
    u.uVignette.value = 0.42 + f * 0.12 + s * 0.08;
    u.uSpeed.value = s;
  }

  setSize(width, height, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  render() {
    this.composer.render();
  }
}
