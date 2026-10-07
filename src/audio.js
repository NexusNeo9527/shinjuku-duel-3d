const ASSET = import.meta.env?.BASE_URL ?? '/';

export const BGM_TRACKS = [
  { id: "normal", label: "正常", src: `${ASSET}assets/bgm-rain-normal.mp3` },
  { id: "sifeng", label: "司凤", src: `${ASSET}assets/bgm-rain-sifeng.mp3` },
  { id: "yuta", label: "乙骨 · 心似烟火", src: `${ASSET}assets/bgm-yuta-shinjuku.mp3` }
];
export const SCENE_BGM = { menu: null, gojo: "normal", practice: "sifeng", story: "yuta" };
const BGM_KEY = "sd3d.bgm.scene.";
const MASTER_VOLUME_KEY = "sd3d.master-volume.v1";
const BGM_VOLUME_KEY = "sd3d.bgm-volume.v1";

function loadBgmVolume() {
  try {
    const saved = localStorage.getItem(BGM_VOLUME_KEY);
    const value = saved === null ? .5 : Number(saved);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .5;
  } catch (_) { return .5; }
}

function loadMasterVolume() {
  try {
    const saved = localStorage.getItem(MASTER_VOLUME_KEY);
    if (saved === null) return 1;
    const value = Number(saved);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
  } catch (_) { return 1; }
}

// Manual choices belong to a scene; a new scene gets its own default track.
function loadBgmId(scene) {
  try {
    const saved = localStorage.getItem(BGM_KEY + scene);
    if (saved && BGM_TRACKS.some((t) => t.id === saved)) return saved;
  } catch (_) { /* storage unavailable */ }
  return SCENE_BGM[scene];
}

function saveBgmId(scene, id) {
  try { localStorage.setItem(BGM_KEY + scene, id); } catch (_) { /* ignore */ }
}

export class AudioEngine {
  constructor() {
    this.muted = false;
    this.masterVolume = loadMasterVolume();
    this.ctx = null;
    this.master = null;
    this.bgm = null;
    this.bgmScene = "menu";
    this.bgmId = loadBgmId(this.bgmScene);
    this.bgmVolume = loadBgmVolume();
    this._bgmFade = 0;
    this.bgmSources = new Map();
  }

  async preloadTrack(track) {
    if (this.bgmSources.has(track.id)) return this.bgmSources.get(track.id);
    // Fetch the complete file: media preload hints may be ignored on phones.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(track.src, { signal: controller.signal });
      if (!response.ok) throw new Error(`Music failed: ${track.id} (${response.status})`);
      const blob = await response.blob();
      if (!blob.size) throw new Error(`Music is empty: ${track.id}`);
      const source = URL.createObjectURL(blob);
      this.bgmSources.set(track.id, source);
      return source;
    } finally {
      window.clearTimeout(timer);
    }
  }

  ensure() {
    this.ensureBgm();
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      if (this.bgmId && this.bgm?.paused) this.startBgm();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.outputGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    if (this.bgmId) this.startBgm();
  }

  // ---- background music ----
  ensureBgm() {
    if (this.bgm) return this.bgm;
    const el = new Audio();
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    el.muted = this.muted;
    this.bgm = el;
    return el;
  }

  startBgm() {
    const track = BGM_TRACKS.find((t) => t.id === this.bgmId);
    if (!track) {
      const el = this.bgm;
      if (!el || el.paused) return;
      this.fadeBgm(0, 350, () => {
        if (!this.bgmId) {
          el.pause();
          el.currentTime = 0;
        }
      });
      return;
    }
    const el = this.ensureBgm();
    if (el.dataset.track !== track.id) {
      el.dataset.track = track.id;
      el.src = this.bgmSources.get(track.id) || track.src;
      el.currentTime = 0;
    }
    el.muted = this.muted;
    const p = el.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked until a gesture */ });
    this.fadeBgm(this.bgmVolume * this.masterVolume);
  }

  setBgm(id) {
    if (!BGM_TRACKS.some((t) => t.id === id)) return;
    this.bgmId = id;
    saveBgmId(this.bgmScene, id);
    const el = this.ensureBgm();
    clearInterval(this._bgmFade);
    this.startBgm();
  }

  setScene(scene) {
    if (!Object.hasOwn(SCENE_BGM, scene) || scene === this.bgmScene) return;
    this.bgmScene = scene;
    const id = loadBgmId(scene);
    if (this.bgmId === id) return;
    this.bgmId = id;
    this.startBgm();
  }

  // Version selection is independent of the sound on/off button.
  cycleBgm() {
    const ids = BGM_TRACKS.map((t) => t.id);
    const i = ids.indexOf(this.bgmId);
    const next = ids[(i + 1) % ids.length];
    this.setBgm(next);
    this.ensure();
    return this.bgmLabel();
  }

  // Restore the default for the current scene.
  resetBgm() {
    const defaultId = SCENE_BGM[this.bgmScene];
    try { localStorage.removeItem(BGM_KEY + this.bgmScene); } catch (_) { /* ignore */ }
    if (this.bgmId === defaultId) {
      if (this.bgm?.paused) this.startBgm();
      return;
    }
    this.bgmId = defaultId;
    this.startBgm();
  }

  bgmLabel() {
    if (!this.bgmId) return "关";
    return (BGM_TRACKS.find((t) => t.id === this.bgmId) || {}).label || "关";
  }

  fadeBgm(target, ms = 900, onComplete = null) {
    const el = this.bgm;
    if (!el) return;
    clearInterval(this._bgmFade);
    const from = el.volume;
    const t0 = performance.now();
    this._bgmFade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (target - from) * k));
      if (k >= 1) {
        clearInterval(this._bgmFade);
        this._bgmFade = 0;
        onComplete?.();
      }
    }, 40);
  }

  resume() {
    this.ensure();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.outputGain(), this.ctx.currentTime, 0.025);
    }
    if (this.bgm) this.bgm.muted = muted;
  }

  outputGain() {
    return this.muted ? 0 : this.masterVolume * 0.9;
  }

  setVolume(value) {
    this.masterVolume = Math.max(0, Math.min(1, Number(value) || 0));
    try { localStorage.setItem(MASTER_VOLUME_KEY, String(this.masterVolume)); } catch (_) { /* ignore */ }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.outputGain(), this.ctx.currentTime, 0.025);
    }
    if (this.bgmId && this.bgm && !this.bgm.paused) this.fadeBgm(this.bgmVolume * this.masterVolume, 180);
  }

  setBgmVolume(value) {
    this.bgmVolume = Math.max(0, Math.min(1, Number(value) || 0));
    try { localStorage.setItem(BGM_VOLUME_KEY, String(this.bgmVolume)); } catch (_) { /* ignore */ }
    if (this.bgmId && this.bgm && !this.bgm.paused) this.fadeBgm(this.bgmVolume * this.masterVolume, 180);
  }

  tone(frequency, duration = 0.08, type = "sine", volume = 0.035, endFrequency = null) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration);
  }

  sweep(start, end, duration, type = "sine", volume = 0.04, delay = 0) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, start), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  noise(duration = 0.2, volume = 0.2, filterFreq = 1200, delay = 0) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterFreq * 0.25), now + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  handle(event) {
    if (!this.ctx) return;
    switch (event.kind) {
      case "ability":
        this.playAbility(event.ability);
        break;
      case "impact":
        this.playImpact(event.ultimate, event.attackType);
        break;
      case "guardImpact":
        this.noise(0.055, 0.09, 2800);
        this.sweep(460, 210, 0.09, "triangle", 0.025);
        break;
      case "cinematic":
        this.playCinematic(event.type);
        break;
      case "blackFlash":
        this.noise(0.34, 0.34, 900);
        this.sweep(70, 34, 0.4, "sine", 0.05);
        break;
      case "domain":
        this.playDomain(event.owner);
        break;
      case "domainTick":
        this.sweep(700, 300, 0.08, "square", 0.03);
        break;
      case "mahoragaSlash":
        this.sweep(900, 320, 0.16, "square", 0.05);
        this.noise(0.12, 0.12, 2400);
        break;
      case "thunderHit":
        this.noise(0.4, 0.3, 700);
        this.sweep(80, 30, 0.45, "sine", 0.05);
        break;
      case "countdown":
        this.tone(410, 0.18, "triangle", 0.06, 820);
        break;
      case "empty":
        this.tone(170, 0.06, "square", 0.018);
        break;
      case "dash":
        this.noise(0.18, 0.15, 2400);
        this.sweep(760, 220, 0.18, "sine", 0.03);
        break;
      case "combo":
        this.sweep(620, 1320, 0.28, "triangle", 0.05);
        this.tone(900, 0.1, "sine", 0.03, 1500);
        break;
      case "defeat":
        this.noise(0.6, 0.28, 600);
        this.sweep(64, 28, 0.7, "sine", 0.06);
        break;
      case "win":
        this.sweep(420, 900, 0.5, "triangle", 0.05);
        break;
    }
  }

  playAbility(ability) {
    switch (ability) {
      case "blue":
        this.sweep(96, 52, 0.28, "sine", 0.03);
        this.noise(0.16, 0.14, 1500);
        break;
      case "red":
        this.sweep(74, 38, 0.32, "sine", 0.04);
        this.noise(0.24, 0.2, 900);
        break;
      case "purple":
        this.sweep(61, 34, 0.62, "sine", 0.05);
        this.noise(0.4, 0.18, 600);
        this.sweep(500, 120, 0.4, "sawtooth", 0.03, 0.05);
        break;
      case "slash":
        this.noise(0.1, 0.16, 3200);
        this.sweep(1100, 500, 0.1, "square", 0.03);
        break;
      case "cleave":
        this.noise(0.13, 0.2, 2800);
        this.sweep(1300, 420, 0.14, "square", 0.035);
        break;
      case "flame":
        this.sweep(72, 36, 0.46, "sine", 0.045);
        this.noise(0.4, 0.26, 800);
        this.noise(0.2, 0.18, 400, 0.05);
        break;
    }
  }

  playImpact(ultimate, attackType) {
    const blade = attackType === "slash" || attackType === "cleave" || attackType === "mahoragaSlash";
    const fire = attackType === "flame";
    if (blade) {
      this.noise(0.08, ultimate ? 0.3 : 0.2, 4000);
    } else if (fire) {
      this.noise(0.2, 0.22, 700);
    } else {
      this.noise(0.12, ultimate ? 0.28 : 0.16, 1400);
    }
    this.sweep(ultimate ? 70 : 94, 38, ultimate ? 0.38 : 0.19, "sine", ultimate ? 0.052 : 0.024);
  }

  playCinematic(type) {
    if (type === "clash" || type === "breakthrough") {
      this.noise(0.4, 0.3, 800);
      this.sweep(68, 34, 0.46, "sine", 0.045);
    } else {
      this.noise(0.2, 0.22, 2000);
      this.sweep(80, 30, 0.4, "sine", 0.045);
    }
  }

  playDomain(owner) {
    if (owner === "gojo") {
      this.sweep(400, 60, 1.0, "sine", 0.06);
      this.noise(0.6, 0.14, 900);
    } else if (owner === "sukuna") {
      this.noise(0.7, 0.28, 600);
      this.sweep(60, 28, 1.0, "sine", 0.06);
    } else {
      this.noise(0.8, 0.3, 700);
      this.sweep(52, 31, 1.1, "sine", 0.065);
    }
  }
}
