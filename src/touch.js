import { CHARACTERS } from "./config3d.js";
import { ICONS } from "./ui3d.js";

const STICK_RADIUS = 56;
const LOOK_SENS = 0.005;

// Mobile dual-thumb controls:
//   left thumb  -> floating move stick (camera-relative)
//   right thumb -> drag to orbit the camera (aim = camera forward)
//   side buttons -> ascend / descend / sprint / dash / abilities
export class TouchControls {
  constructor({ game, renderer, onCast, onDash }) {
    this.game = game;
    this.renderer = renderer;
    this.onCast = onCast;
    this.onDash = onDash;
    this.enabled = false;
    this.move = { x: 0, y: 0 };
    this.vertical = 0;
    this.sprint = false;
    this.stick = { id: null, ox: 0, oy: 0 };
    this.look = { id: null, lx: 0, ly: 0 };
    this.playerChar = null;
    this.slots = [];
    this.root = document.querySelector("#touchUI");
    this.stickBase = document.querySelector("#stickBase");
    this.stickKnob = document.querySelector("#stickKnob");
    this.abilityBar = document.querySelector("#touchAbilities");
    this.rise = document.querySelector("#btnRise");
    this.fall = document.querySelector("#btnFall");
    this.sprintBtn = document.querySelector("#btnSprint");
    this.dashBtn = document.querySelector("#btnDash");
    this.bind();
  }

  setEnabled(on) {
    this.enabled = on;
    document.body.classList.toggle("touch-mode", on);
    if (this.root) this.root.classList.toggle("hidden", !on);
    if (!on) this.reset();
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
    if (this.stickBase) this.stickBase.classList.add("hidden");
    this.sprintBtn?.classList.toggle("on", false);
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

    if (!this.root) return;
    this.root.addEventListener("pointerdown", (e) => this.onDown(e));
    this.root.addEventListener("pointermove", (e) => this.onMove(e));
    const up = (e) => this.onUp(e);
    this.root.addEventListener("pointerup", up);
    this.root.addEventListener("pointercancel", up);
    this.root.addEventListener("pointerleave", up);
  }

  onDown(e) {
    if (!this.enabled) return;
    const half = window.innerWidth * 0.5;
    if (e.clientX < half && this.stick.id === null) {
      this.stick.id = e.pointerId;
      this.stick.ox = e.clientX;
      this.stick.oy = e.clientY;
      this.stickBase.style.left = `${e.clientX}px`;
      this.stickBase.style.top = `${e.clientY}px`;
      this.stickBase.classList.remove("hidden");
      this.stickKnob.style.transform = "";
      try { this.root.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer */ }
    } else if (e.clientX >= half && this.look.id === null) {
      this.look.id = e.pointerId;
      this.look.lx = e.clientX;
      this.look.ly = e.clientY;
    }
  }

  onMove(e) {
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
      this.renderer.lastManualOrbit = performance.now();
      this.renderer.setOrbit(this.renderer.camYaw - dx * LOOK_SENS, this.renderer.camPitch + dy * LOOK_SENS, this.renderer.camDist);
    }
  }

  onUp(e) {
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
    this.playerChar = charId;
    const char = CHARACTERS[charId] || CHARACTERS.gojo;
    this.abilityBar.innerHTML = "";
    this.slots = char.abilities.map((ab, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "touch-ability";
      b.style.color = ab.color;
      b.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[ab.id] || ICONS.blue}</svg><b>${ab.label}</b><span class="ta-cd"></span>`;
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); this.onCast(i); });
      this.abilityBar.appendChild(b);
      return { el: b, cd: b.querySelector(".ta-cd"), ability: ab };
    });
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

  apply(player) {
    if (!this.enabled || !player) return false;
    const yaw = this.renderer.camYaw;
    const fwd = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const mx = fwd.x * this.move.y + right.x * this.move.x;
    const mz = fwd.z * this.move.y + right.z * this.move.x;
    player.sprinting = this.sprint;
    this.game.setMove(player, mx, mz, this.vertical);
    const f = this.renderer.cameraForward();
    if (f) this.game.setAim(player, player.x + f.x * 30, player.z + f.z * 30);
    return true;
  }
}
