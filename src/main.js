import { Game3D } from "./Game3D.js";
import { Renderer3D } from "./three/Renderer3D.js";
import { AudioEngine } from "./audio.js";
import { UI3D } from "./ui3d.js";
import { TouchControls } from "./touch.js";

const canvas = document.querySelector("#gameCanvas");
const arena = document.querySelector("#arena");

const game = new Game3D();
const renderer = new Renderer3D(canvas);
const audio = new AudioEngine();
const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
const coarseTouch = isTouchDevice && Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
let touchUsed = false;
window.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") touchUsed = true; }, { capture: true, passive: true });

const keys = new Set();


const ui = new UI3D(game, {
  onMode: (mode) => {
    audio.ensure();
    if (mode === "single") { game.state = "difficulty"; return; }
    startGame(mode, "normal");
  },
  onDifficulty: (d) => startGame("single", d),
  onSingleChar: (id) => game.setSingleChar(id),
  onBack: () => { game.state = "menu"; },
  onHome: () => {
    game.state = "menu";
    renderer.reset();
  },
  onAgain: () => startGame(game.mode, game.difficulty),
  onResume: () => { if (game.state === "paused") game.state = "playing"; },
  onRestart: () => startGame(game.mode, game.difficulty),
  onPracticeChar: (c) => {
    game.practiceChar = c === "sukuna" ? "sukuna" : "gojo";
    applyTheme(game.practiceChar);
    startGame("practice", "normal");
  },
  onTheme: (c) => {
    game.practiceChar = c === "sukuna" ? "sukuna" : "gojo";
    applyTheme(game.practiceChar);
  },
  onPracticeOption: (key, value) => {
    game.setPracticeOption(key, value);
  },
  onSound: (btn) => {
    const muted = !audio.muted;
    audio.setMuted(muted);
    btn.textContent = muted ? "♪ 关" : "♪ 开";
    btn.setAttribute("aria-pressed", String(!muted));
    btn.setAttribute("aria-label", muted ? "开启声音" : "关闭声音");
    if (!muted) audio.ensure();
  }
});

function applyTheme(charId) {
  const id = charId === "sukuna" ? "sukuna" : "gojo";
  document.body.classList.toggle("theme-gojo", id === "gojo");
  document.body.classList.toggle("theme-sukuna", id === "sukuna");
  ui.setThemeChip(id);
}

const secondPlayer = () => game.entities.find((e) => e.isPlayer && e !== game.player());
const touch = new TouchControls({
  game,
  renderer,
  onCast: (pad, i) => {
    audio.ensure();
    const p = pad === 1 ? secondPlayer() : game.player();
    if (p && game.state === "playing") game.tryCast(p, i);
  },
  onDash: (pad) => {
    const p = pad === 1 ? secondPlayer() : game.player();
    if (p && game.state === "playing") game.tryDash(p, p.moveInput.x, p.moveInput.y, p.moveInput.z);
  }
});

const btnLock = document.querySelector("#btnLock");
const btnSwitch = document.querySelector("#btnSwitch");
function switchTarget(e) {
  e?.preventDefault();
  e?.stopPropagation();
  audio.ensure();
  const p = game.player();
  if (p && game.state === "playing") game.cycleLock(p);
}
btnLock?.addEventListener("pointerdown", switchTarget);
btnSwitch?.addEventListener("pointerdown", switchTarget);

// BGM version: 正常 <-> 司凤; the adjacent button owns sound on/off.
const bgmBtn = document.querySelector("#bgmBtn");
function refreshBgmBtn() { if (bgmBtn) bgmBtn.textContent = `♫ ${audio.bgmLabel()}`; }
refreshBgmBtn();
bgmBtn?.addEventListener("click", () => {
  audio.cycleBgm();
  refreshBgmBtn();
});

function startGame(mode, difficulty) {
  audio.ensure();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  game.start(mode, difficulty);
  renderer.reset();
  renderer.dualZoom = 0;
  renderer.lastManualOrbit = 0;
  applyTheme(game.player()?.charId);
  const p = game.player();
  if (mode === "dual") {
    const players = game.entities.filter((e) => e.isPlayer);
    const a = players[0];
    const b = players[1];
    if (a && b) {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      renderer.setOrbit(Math.atan2(dx, dz), 0.16, 11);
      renderer.cam2Yaw = Math.atan2(-dx, -dz);
      game.setAim(p, b.x, b.z);
    }
  } else {
    const enemy = game.entities.find((e) => !e.isPlayer && e.alive);
    if (p && enemy) {
      const dx = enemy.x - p.x;
      const dz = enemy.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      renderer.setOrbit(Math.atan2(dx / len, dz / len), renderer.camPitch, 11);
      game.setAim(p, enemy.x, enemy.z);
    } else {
      renderer.setOrbit(renderer.camYaw, renderer.camPitch, 13);
    }
  }
}

// ---- input ----
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    if (game.state === "playing") { game.state = "paused"; }
    else if (game.state === "paused") { game.state = "playing"; }
    else if (game.state === "difficulty") { game.state = "menu"; }
    return;
  }
  if ([
    "KeyW", "KeyA", "KeyS", "KeyD", "KeyZ", "KeyX", "KeyC", "ShiftLeft", "Space", "AltLeft",
    "KeyI", "KeyJ", "KeyK", "KeyL", "KeyN", "KeyM", "ShiftRight",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
  ].includes(event.code)) {
    event.preventDefault();
  }
  if (event.repeat) return;
  keys.add(event.code);
  const p1 = game.player();
  const p2 = game.entities.find((e) => e.isPlayer && e !== p1);
  const c = game.state === "playing";
  if (c && p1) {
    if (event.code === "Digit1") game.tryCast(p1, 0);
    if (event.code === "KeyQ" || event.code === "Digit2") game.tryCast(p1, 1);
    if (event.code === "KeyE" || event.code === "Digit3") game.tryCast(p1, 2);
    if (event.code === "KeyR" || event.code === "Digit4") game.tryCast(p1, 3);
    if (event.code === "KeyT" || event.code === "Digit5") game.tryCast(p1, 4);
    if (event.code === "AltLeft") game.cycleLock(p1);
    if (event.code === "KeyF") {
      game.tryDash(p1, p1.moveInput.x, p1.moveInput.y, p1.moveInput.z);
    }
  }
  if (c && p2) {
    if (event.code === "KeyU") game.tryCast(p2, 0);
    if (event.code === "KeyO") game.tryCast(p2, 1);
    if (event.code === "KeyP") game.tryCast(p2, 2);
    if (event.code === "BracketLeft") game.tryCast(p2, 3);
    if (event.code === "BracketRight") game.tryCast(p2, 4);
    if (event.code === "KeyB") game.tryDash(p2, p2.moveInput.x, p2.moveInput.y, p2.moveInput.z);
  }
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
// no aiming: left click attacks, the camera & shots auto-face the locked target
canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0 || game.state !== "playing") return;
  const p1 = game.player();
  if (p1) game.tryCast(p1, 0);
});
window.addEventListener("wheel", (event) => {
  if (game.mode === "dual") {
    renderer.dualZoom = Math.max(-10, Math.min(28, (renderer.dualZoom || 0) + event.deltaY * 0.012));
  } else {
    renderer.setOrbit(renderer.camYaw, renderer.camPitch, renderer.camDist + event.deltaY * 0.012);
  }
}, { passive: true });

document.addEventListener("pointerdown", () => audio.ensure(), { capture: true, passive: true });

// keep the canvas matched to the *visible* viewport: mobile browsers resize the
// visible area as the URL bar / toolbars collapse, and an orientation change is
// not always followed by a reliable resize event
function fitCanvas() {
  const rect = arena.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) renderer.resize(rect.width, rect.height);
}
window.addEventListener("resize", fitCanvas);
window.addEventListener("orientationchange", () => { fitCanvas(); setTimeout(fitCanvas, 120); setTimeout(fitCanvas, 450); });
if (window.visualViewport) window.visualViewport.addEventListener("resize", fitCanvas);
if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe(arena);
window.addEventListener("focus", fitCanvas);
document.addEventListener("fullscreenchange", () => { setTimeout(fitCanvas, 120); });
setTimeout(fitCanvas, 250);

const fullBtn = document.querySelector("#fullBtn");
fullBtn?.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } else {
      await document.exitFullscreen();
    }
  } catch (_) { /* fullscreen unsupported */ }
  setTimeout(fitCanvas, 150);
});

// phones: suggest landscape once per visit, but never force it
const rotateTip = document.querySelector("#rotateTip");
let rotateTipShown = false;
let rotateTipTimer = 0;
const isPortrait = () => (window.matchMedia
  ? window.matchMedia("(orientation: portrait)").matches
  : window.innerHeight >= window.innerWidth);
function hideRotateTip() {
  clearTimeout(rotateTipTimer);
  rotateTip?.classList.add("hidden");
}
document.querySelector("#rotateTipClose")?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  hideRotateTip();
});
function updateRotateTip() {
  if (!rotateTip) return;
  // phones only — tablets are fine in either orientation
  const shortest = Math.min(window.innerWidth, window.innerHeight);
  if (!isPortrait() || shortest > 560 || game.state !== "playing") { rotateTip.classList.add("hidden"); return; }
  if (rotateTipShown) return;
  if (!touch.enabled && !isTouchDevice && !touchUsed) return;
  rotateTipShown = true;
  rotateTip.classList.remove("hidden");
  rotateTipTimer = setTimeout(() => rotateTip.classList.add("hidden"), 7000);
}

// ---- per-frame input application ----
function applyInput() {
  const p1 = game.player();
  const inBattle = game.state === "playing";

  // show the touch UI on touch-first devices, or as soon as a touch is used
  const wantTouch = inBattle && (coarseTouch || touchUsed);
  if (touch.enabled !== wantTouch) touch.setEnabled(wantTouch);
  // local versus on a touch device: both players get their own pad
  touch.setDual(inBattle && game.mode === "dual" && wantTouch);
  updateRotateTip();
  // auto-lock camera (no manual aim) + split-screen layout
  renderer.lockCamera = true;
  // target buttons: visible whenever there is at least one enemy to aim at
  const hasTarget = Boolean(p1 && game.enemyList(p1).length);
  const targetBtnDisplay = touch.enabled && hasTarget ? "" : "none";
  if (btnLock) btnLock.style.display = targetBtnDisplay;
  if (btnSwitch) btnSwitch.style.display = targetBtnDisplay;
  document.body.classList.toggle("split-mode", game.mode === "dual" && inBattle && !touch.enabled);

  if (p1 && inBattle) {
    const yaw = renderer.camYaw;
    const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
    let mx = 0;
    let mz = 0;
    let my = 0;
    if (keys.has("KeyW")) { mx += fwd.x; mz += fwd.z; }
    if (keys.has("KeyS")) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has("KeyD")) { mx += right.x; mz += right.z; }
    if (keys.has("KeyA")) { mx -= right.x; mz -= right.z; }
    // vertical: descend wins over ascend so the two can never cancel out
    let up = 0;
    if (keys.has("KeyZ")) up = 1;
    // hold Space to fly up (target switching is on Left Alt)
    if (keys.has("Space")) up = 1;
    const down = keys.has("KeyX") || keys.has("KeyC");
    my = down ? -1 : up;
    let sprint = keys.has("ShiftLeft");

    if (touch.enabled) {
      if (touch.stickActive) {
        mx = fwd.x * touch.move.y + right.x * touch.move.x;
        mz = fwd.z * touch.move.y + right.z * touch.move.x;
      }
      if (touch.vertical !== 0) my = touch.vertical;
      if (touch.sprint) sprint = true;
    }
    p1.sprinting = sprint;
    game.setMove(p1, mx, mz, my);

    if (touch.enabled) {
      if (touch.playerChar !== p1.charId) touch.rebuildAbilities(p1.charId);
      touch.updateSlots(p1, game);
      const target = game.lockEntity(p1);
      if (btnLock && target) btnLock.textContent = `锁定 · ${target.name}`;
    }
  }

  const p2 = game.entities.find((e) => e.isPlayer && e !== game.player());
  if (p2 && game.state === "playing") {
    const pad2 = touch.enabled && touch.dual ? touch.pad2 : null;
    // player 2 looks through their own half of the split screen
    const yaw = pad2 ? renderer.cam2Yaw : renderer.camYaw;
    const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
    let mx = 0;
    let mz = 0;
    // P2 faces the mirrored camera, so its forward axis is opposite P1's.
    if (keys.has("KeyI")) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has("KeyK")) { mx += fwd.x; mz += fwd.z; }
    if (keys.has("KeyJ")) { mx += right.x; mz += right.z; }
    if (keys.has("KeyL")) { mx -= right.x; mz -= right.z; }
    let my = 0;
    if (keys.has("KeyM")) my = -1;
    else if (keys.has("KeyN")) my = 1;
    let sprint2 = keys.has("ShiftRight");
    if (pad2) {
      if (pad2.stickActive) {
        mx = fwd.x * pad2.move.y + right.x * pad2.move.x;
        mz = fwd.z * pad2.move.y + right.z * pad2.move.x;
      }
      if (pad2.vertical !== 0) my = pad2.vertical;
      if (pad2.sprint) sprint2 = true;
    }
    p2.sprinting = sprint2;
    game.setMove(p2, mx, mz, my);
    const enemy = game.entities.find((e) => e.id !== p2.id && e.alive);
    if (enemy) game.setAim(p2, enemy.x, enemy.z);
    if (pad2) {
      if (pad2.charId !== p2.charId) pad2.rebuildAbilities(p2.charId);
      pad2.updateSlots(p2, game);
    }
  }
}

// ---- loop ----
let previousTime = performance.now();
function frame(now) {
  const rawDt = Math.max(0, (now - previousTime) / 1000);
  // simulation steps are capped so a hitch cannot teleport the fighters…
  const realDt = Math.min(0.033, rawDt);
  previousTime = now;
  applyInput();
  // …but the cinematic timers must use real time, otherwise a low frame rate
  // stretches the death cut-in / time-stop into what looks like a freeze
  if (game.timeStop > 0) game.timeStop = Math.max(0, game.timeStop - rawDt);
  if (game.cutIn) { game.cutIn.life -= rawDt; if (game.cutIn.life <= 0) game.cutIn = null; }
  // freeze the whole scene behind the menus / during a time-stop
  const frozen = game.state === "menu" || game.state === "difficulty" || game.state === "paused" || game.timeStop > 0;
  const dt = frozen ? 0 : realDt;
  game.update(dt);
  for (const ev of game.drainEvents()) audio.handle(ev);
  renderer.sync(game, dt);
  renderer.render(dt);
  ui.update(game);
  requestAnimationFrame(frame);
}

const rect = arena.getBoundingClientRect();
renderer.resize(rect.width, rect.height);
applyTheme("gojo");
requestAnimationFrame(frame);

window.__arena3d = {
  game,
  renderer,
  audio,
  touch,
  start: (mode = "single", difficulty = "normal") => startGame(mode, difficulty),
  cast: (id, index) => { const e = game.entities.find((x) => x.charId === id) || game.player(); return game.tryCast(e, index); }
};
