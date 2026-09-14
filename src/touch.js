import { CHARACTERS } from "./config3d.js";
import { ICONS } from "./ui3d.js";

const STICK_RADIUS = 56;
const LOOK_SENS = 0.005;

// One player's on-screen controls: a floating move stick plus a button cluster.
// Single player uses one pad (left stick + right camera/buttons); local versus on
// a touch device builds a second, mirrored pad so both players can play.
class TouchPad {
  constructor({ root, stickBase, stickKnob, abilityBar, rise, fall, sprintBtn, dashBtn, onCast, onDash }) {
    this.root = root;
    this.stickBase = stickBase;
    this.stickKnob = stickKnob;
    this.abilityBar = abilityBar;
    this.rise = rise;
    this.fall = fall;
    this.sprintBtn = sprintBtn;
    this.dashBtn = dashBtn;
    this.onCast = onCast;
    this.onDash = onDash;
    this.move = { x: 0, y: 0 };
    this.vertical = 0;
    this.sprint = false;
    this.stick = { id: null, ox: 0, oy: 0 };
    this.look = { id: null, lx: 0, ly: 0 };
    this.charId = null;
    this.slots = [];
    this.repeatTimer = 0;
    this.el = null;
    this.bind();
  }

  get stickActive() {
    return this.stick.id !== null;
  }

  reset() {
    this.move.x = 0;
    this.move.y = 0;
    this.vertical = 0;
    this.stick.id = null;
    this.look.id = null;
    this.stopRepeat();
    if (this.stickKnob) this.stickKnob.style.transform = "";
    this.stickBase?.classList.add("hidden");
    this.sprintBtn?.classList.remove("on");
    this.rise?.classList.remove("on");
    this.fall?.classList.remove("on");
  }

  bind() {
    const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(e); };
    const hold = (btn, value) => {
      if (!btn) return;
      const on = stop(() => { this.vertical = value; btn.classList.add("on"); });
      const off = stop(() => { if (this.vertical === value) this.vertical = 0; btn.classList.remove("on"); });
      btn.addEventListener("pointerdown", on);
      btn.addEventListener("pointerup", off);
      btn.addEventListener("pointercancel", off);
      btn.addEventListener("pointerleave", off);
    };
    hold(this.rise, 1);
    hold(this.fall, -1);
    this.sprintBtn?.addEventListener("pointerdown", stop(() => {
      this.sprint = !this.sprint;
      this.sprintBtn.classList.toggle("on", this.sprint);
    }));
    this.dashBtn?.addEventListener("pointerdown", stop(() => this.onDash()));
  }

  beginStick(e) {
    this.stick.id = e.pointerId;
    this.stick.ox = e.clientX;
    this.stick.oy = e.clientY;
    this.stickBase.style.left = `${e.clientX}px`;
    this.stickBase.style.top = `${e.clientY}px`;
    this.stickBase.classList.remove("hidden");
    this.stickKnob.style.transform = "";
  }

  beginLook(e) {
    this.look.id = e.pointerId;
    this.look.lx = e.clientX;
    this.look.ly = e.clientY;
  }

  onPointerMove(e, renderer) {
    if (e.pointerId === this.stick.id) {
      let dx = e.clientX - this.stick.ox;
      let dy = e.clientY - this.stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) { dx = (dx / len) * STICK_RADIUS; dy = (dy / len) * STICK_RADIUS; }
      this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.move.x = dx / STICK_RADIUS;
      this.move.y = -dy / STICK_RADIUS;
    } else if (e.pointerId === this.look.id) {
      const dx = e.clientX - this.look.lx;
      const dy = e.clientY - this.look.ly;
      this.look.lx = e.clientX;
      this.look.ly = e.clientY;
      renderer.lastManualOrbit = performance.now();
      renderer.setOrbit(renderer.camYaw - dx * LOOK_SENS, renderer.camPitch + dy * LOOK_SENS, renderer.camDist);
    }
  }

  onPointerUp(e) {
    if (e.pointerId === this.stick.id) {
      this.stick.id = null;
      this.move.x = 0;
      this.move.y = 0;
      this.stickKnob.style.transform = "";
      this.stickBase.classList.add("hidden");
    } else if (e.pointerId === this.look.id) {
      this.look.id = null;
    }
  }

  rebuildAbilities(charId) {
    if (!this.abilityBar) return;
    this.charId = charId;
    const char = CHARACTERS[charId] || CHARACTERS.gojo;
    this.abilityBar.innerHTML = "";
    this.slots = char.abilities.map((ab, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "touch-ability";
      b.dataset.slot = `ab${i}`;
      b.style.color = ab.color;
      b.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[ab.id] || ICONS.blue}</svg><b>${ab.label}</b><span class="ta-cd"></span>`;
      // basics can be held down to keep firing; gated skills stay a single tap
      const repeatable = !ab.needsCharge && !ab.needsDomain;
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onCast(i);
        if (!repeatable) return;
        b.classList.add("holding");
        this.stopRepeat();
        this.repeatTimer = setInterval(() => this.onCast(i), 90);
      });
      const release = (e) => {
        if (!repeatable) return;
        e?.preventDefault?.();
        b.classList.remove("holding");
        this.stopRepeat();
      };
      b.addEventListener("pointerup", release);
      b.addEventListener("pointercancel", release);
      b.addEventListener("pointerleave", release);
      this.abilityBar.appendChild(b);
      return { el: b, cd: b.querySelector(".ta-cd"), ability: ab };
    });
  }

  stopRepeat() {
    if (this.repeatTimer) {
      clearInterval(this.repeatTimer);
      this.repeatTimer = 0;
    }
  }

  // full stick deflection means "run"
  get wantSprint() {
    return this.sprint || Math.hypot(this.move.x, this.move.y) > 0.92;
  }

  updateSlots(player, game) {
    for (let i = 0; i < this.slots.length; i += 1) {
      const s = this.slots[i];
      const cd = player.cooldowns[i] || 0;
      s.cd.style.setProperty("--cd", String(Math.min(1, cd / (s.ability.cooldown || 1))));
      const locked = (s.ability.needsCharge && player.charge < 100 && !game.practice)
        || (s.ability.needsDomain && player.domainCharge < 100 && !game.practice);
      s.el.classList.toggle("ready", cd <= 0.001 && !locked);
    }
  }
}

export class TouchControls {
  constructor({ game, renderer, onCast, onDash }) {
    this.game = game;
    this.renderer = renderer;
    this.onCast = onCast;
    this.onDash = onDash;
    this.enabled = false;
    this.dual = false;
    this.root = document.querySelector("#touchUI");
    this.pad1 = new TouchPad({
      root: this.root,
      stickBase: document.querySelector("#stickBase"),
      stickKnob: document.querySelector("#stickKnob"),
      abilityBar: document.querySelector("#touchAbilities"),
      rise: document.querySelector("#btnRise"),
      fall: document.querySelector("#btnFall"),
      sprintBtn: document.querySelector("#btnSprint"),
      dashBtn: document.querySelector("#btnDash"),
      onCast: (i) => this.onCast(0, i),
      onDash: () => this.onDash(0)
    });
    this.pad2 = null;
    this.bindRoot();
  }

  // single-player accessors (kept so the existing input code keeps working)
  get stickActive() { return this.pad1.stickActive; }
  get move() { return this.pad1.move; }
  get vertical() { return this.pad1.vertical; }
  get sprint() { return this.pad1.sprint; }
  get wantSprint() { return this.pad1.wantSprint; }
  get playerChar() { return this.pad1.charId; }

  bindRoot() {
    if (!this.root) return;
    this.root.addEventListener("pointerdown", (e) => this.onDown(e));
    this.root.addEventListener("pointermove", (e) => this.onMove(e));
    const up = (e) => this.onUp(e);
    this.root.addEventListener("pointerup", up);
    this.root.addEventListener("pointercancel", up);
    this.root.addEventListener("pointerleave", up);
  }

  setEnabled(on) {
    this.enabled = on;
    document.body.classList.toggle("touch-mode", on);
    if (this.root) this.root.classList.toggle("hidden", !on);
    if (!on) {
      this.pad1.reset();
      this.pad2?.reset();
    }
  }

  // local versus on touch: give player 2 their own mirrored pad
  setDual(on) {
    if (on === this.dual) return;
    this.dual = on;
    document.body.classList.toggle("dual-touch", on);
    if (on) this.buildPad2();
    else this.removePad2();
  }

  buildPad2() {
    if (this.pad2 || !this.root) return;
    const stickBase = document.createElement("div");
    stickBase.className = "stick-base p2 hidden";
    stickBase.innerHTML = `<div class="stick-ring"></div><div class="stick-knob p2"></div>`;
    const cluster = document.createElement("div");
    cluster.className = "touch-right p2";
    cluster.innerHTML = `
      <div class="vt-stack">
        <button class="vt-btn" type="button" data-slot="rise">▲<i>升空</i></button>
        <button class="vt-btn" type="button" data-slot="fall">▼<i>下降</i></button>
      </div>
      <div class="touch-abilities"></div>
      <div class="touch-slot">
        <button class="touch-btn small" type="button" data-slot="sprint">疾跑</button>
        <button class="touch-btn small" type="button" data-slot="dash">冲刺</button>
        <button class="touch-btn small switch" type="button" data-slot="switch">切换目标</button>
      </div>`;
    this.root.appendChild(stickBase);
    this.root.appendChild(cluster);
    this.pad2 = new TouchPad({
      root: this.root,
      stickBase,
      stickKnob: stickBase.querySelector(".stick-knob"),
      abilityBar: cluster.querySelector(".touch-abilities"),
      rise: cluster.querySelector('[data-slot="rise"]'),
      fall: cluster.querySelector('[data-slot="fall"]'),
      sprintBtn: cluster.querySelector('[data-slot="sprint"]'),
      dashBtn: cluster.querySelector('[data-slot="dash"]'),
      onCast: (i) => this.onCast(1, i),
      onDash: () => this.onDash(1)
    });
    this.pad2.el = { stickBase, cluster };
  }

  removePad2() {
    if (!this.pad2) return;
    this.pad2.el?.stickBase.remove();
    this.pad2.el?.cluster.remove();
    this.pad2 = null;
  }

  onDown(e) {
    if (!this.enabled) return;
    const left = e.clientX < window.innerWidth * 0.5;
    if (left) {
      if (this.pad1.stick.id === null) {
        this.pad1.beginStick(e);
        try { this.root.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer */ }
      }
      return;
    }
    if (this.dual) {
      if (this.pad2 && this.pad2.stick.id === null) {
        this.pad2.beginStick(e);
        try { this.root.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer */ }
      }
      return;
    }
    if (this.pad1.look.id === null) this.pad1.beginLook(e);
  }

  onMove(e) {
    if (!this.enabled) return;
    this.pad1.onPointerMove(e, this.renderer);
    this.pad2?.onPointerMove(e, this.renderer);
  }

  onUp(e) {
    this.pad1.onPointerUp(e);
    this.pad2?.onPointerUp(e);
  }

  rebuildAbilities(charId) {
    if (this.pad1.charId !== charId) this.pad1.rebuildAbilities(charId);
  }

  updateSlots(player, game) {
    this.pad1.updateSlots(player, game);
  }
}
