import { Game3D } from "./Game3D.js";
import { Renderer3D } from "./three/Renderer3D.js";
import { AudioEngine } from "./audio.js";
import { UI3D } from "./ui3d.js";
import { TouchControls } from "./touch.js";
import { STORY_STAGES } from "./config3d.js";
import { BINDINGS, DEFAULT_TOUCH_MOVE_POSITION, clampTouchMovePosition, displayKey, loadInputSettings, saveInputSettings } from "./inputSettings.js";

const canvas = document.querySelector("#gameCanvas");
const arena = document.querySelector("#arena");
const loadingScreen = document.querySelector("#loadingScreen");
const loadingProgress = document.querySelector("#loadingProgress");
const loadingPercent = document.querySelector("#loadingPercent");
const loadingStatus = document.querySelector("#loadingStatus");
const loadingDetails = document.querySelector("#loadingDetails");

const game = new Game3D();
const renderer = new Renderer3D(canvas);
const audio = new AudioEngine();
const inputSettings = loadInputSettings();
let bindingCodes = new Map();
let bindingCapture = null;
const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
const coarseTouch = isTouchDevice && Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
let touchUsed = false;
window.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") touchUsed = true; }, { capture: true, passive: true });

const keys = new Set();
const PRACTICE_CHARACTER_NAMES = {
  gojo: "五条悟",
  sukuna: "宿傩",
  yuta: "乙骨忧太",
  sukunaStory1: "四手宿傩",
  yutaGojo: "乙骨·五条之身",
  sukunaStory2: "完全体宿傩"
};

function rebuildBindingCodes() {
  bindingCodes = new Map();
  for (const binding of BINDINGS) {
    const code = inputSettings.bindings[binding.id];
    if (!bindingCodes.has(code)) bindingCodes.set(code, []);
    bindingCodes.get(code).push(binding.id);
  }
}
rebuildBindingCodes();
const keyCode = (id) => inputSettings.bindings[id];
const actionBoundTo = (code, id) => (bindingCodes.get(code) || []).includes(id);


const ui = new UI3D(game, {
  getKeyLabel: (id) => displayKey(inputSettings.bindings[id]),
  onStart: () => { game.state = "modeSelect"; },
  onOpenGuide: () => { game.state = "guide"; },
  onOpenSettings: () => { game.state = "settings"; },
  onBackToHome: () => { game.state = "menu"; },
  onBackToModeSelect: () => {
    game.state = "modeSelect";
    setMusicScene("menu");
    setModeTitle("gojo");
    applyTheme("gojo");
  },
  onMode: (mode) => {
    audio.ensure();
    game.modeFamily = mode === "story" ? "story" : "gojo";
    game.storyPlayMode = "story";
    if (mode === "gojo") { setMusicScene("gojo"); setModeTitle("gojo"); applyTheme("gojo"); game.state = "gojoSelect"; return; }
    if (mode === "story") {
      setMusicScene("story");
      game.setStory("yuta", "ally");
      game.pendingMode = "story";
      setModeTitle("story", game.storyStage);
      applyTheme("yuta");
      game.state = "storySelect";
    }
  },
  onGojoMode: (mode) => {
    game.modeFamily = "gojo";
    setModeTitle("gojo");
    if (mode === "single") { game.pendingMode = "single"; applyTheme(game.singleChar); game.state = "difficulty"; return; }
    startGame(mode, "normal");
  },
  onDifficulty: (d) => startGame(game.pendingMode === "story" ? "story" : "single", d),
  onStoryPlayMode: (mode) => { game.storyPlayMode = mode; },
  onStoryStage: (stage) => {
    game.setStory(stage, game.storySide);
    const stageInfo = STORY_STAGES[game.storyStage];
    if (game.storyPlayMode === "story") {
      game.pendingMode = "story";
      setModeTitle("story", game.storyStage);
      applyTheme(game.storySide === "enemy" ? "sukuna" : "yuta");
      game.state = "difficulty";
      return;
    }
    if (game.storyPlayMode === "practice") {
      game.setPracticeChar(game.storySide === "enemy" ? stageInfo.enemy : stageInfo.ally);
      applyTheme(game.practiceChar);
      startGame("practice", "normal");
      return;
    }
    startGame("dual", "normal");
  },
  onStorySide: (side) => { game.setStory(game.storyStage, side); applyTheme(game.storySide === "enemy" ? "sukuna" : "yuta"); },
  onContinueStory: () => { game.setStory("borrowed", game.storySide); startGame("story", game.difficulty); },
  onSingleChar: (id) => { game.setSingleChar(id); applyTheme(game.singleChar); },
  onBack: () => {
    game.state = game.pendingMode === "story" ? "storySelect" : "gojoSelect";
    setModeTitle(game.pendingMode === "story" ? "story" : "gojo", game.pendingMode === "story" ? game.storyStage : null);
    applyTheme(game.pendingMode === "story" ? "yuta" : "gojo");
  },
  onHome: () => {
    game.state = "menu";
    setMusicScene("menu");
    game.modeFamily = "gojo";
    game.storyPlayMode = "story";
    setModeTitle("gojo");
    applyTheme("gojo");
    renderer.reset();
  },
  onAgain: () => startGame(game.mode, game.difficulty),
  onResume: () => { if (game.state === "paused") game.state = "playing"; },
  onRestart: () => startGame(game.mode, game.difficulty),
  onPracticeChar: (c) => {
    game.setPracticeChar(c);
    applyTheme(game.practiceChar);
    startGame("practice", "normal");
  },
  onTheme: (c) => {
    game.setPracticeChar(c);
    applyTheme(game.practiceChar);
  },
  onPracticeOption: (key, value) => {
    game.setPracticeOption(key, value);
  },
  onSound: (btn) => {
    const muted = !audio.muted;
    audio.setMuted(muted);
    refreshSoundButtons();
    if (!muted) audio.ensure();
  }
});

function refreshSoundButtons() {
  const muted = audio.muted;
  for (const button of [document.querySelector("#soundBtn"), document.querySelector("#settingsMuteBtn")]) {
    if (!button) continue;
    const label = button.id === "settingsMuteBtn" ? (muted ? "开启声音" : "关闭声音") : (muted ? "♪ 关" : "♪ 开");
    button.textContent = label;
    button.setAttribute("aria-pressed", String(muted));
    button.setAttribute("aria-label", muted ? "开启声音" : "关闭声音");
  }
}

function applyTheme(charId) {
  const id = charId?.startsWith("sukuna") ? "sukuna" : charId?.startsWith("yuta") ? "yuta" : "gojo";
  document.body.classList.toggle("theme-gojo", id === "gojo");
  document.body.classList.toggle("theme-sukuna", id === "sukuna");
  document.body.classList.toggle("theme-yuta", id === "yuta");
  ui.setThemeChip(id);
}

function setModeTitle(mode, stage = null) {
  const home = game.state === "menu";
  const story = mode === "story" || (mode === "dual" && game.modeFamily === "story");
  const borrowed = story && stage === "borrowed";
  const practice = mode === "practice";
  const practiceName = PRACTICE_CHARACTER_NAMES[game.practiceChar] || "五条悟";
  const title = home
    ? "咒术回战"
    : practice
    ? `${practiceName} · 练习模式`
    : story
      ? `${borrowed ? "乙骨忧太（五条之身）" : "乙骨忧太"}${mode === "dual" ? " 双人对战" : " VS 宿傩"}`
      : mode === "dual" ? "五条悟 VS 宿傩 · 双人对战" : "五条悟 VS 宿傩";
  const homeLead = home
    ? "咒术"
    : practice
    ? practiceName
    : story
      ? borrowed ? "乙骨忧太（五条之身）" : "乙骨忧太"
      : "五条悟";
  const homeRest = home ? "回战" : practice ? " · 练习模式" : " VS 宿傩";
  const context = practice
    ? "CURSED TECHNIQUE PRACTICE"
    : story
      ? borrowed ? "YUTA IN GOJO'S BODY / DOMAIN REMATCH" : "YUTA / RIKA & COPIED TECHNIQUES"
      : "GOJO VS SUKUNA / CURSED ARENA";
  const kicker = practice
    ? "CURSED TECHNIQUE PRACTICE"
    : story ? "YUTA VS SUKUNA" : "THIRD-PERSON CURSED TECHNIQUE ARENA";

  document.title = title;
  document.body.classList.toggle("story-title-active", story);
  document.body.classList.toggle("borrowed-title-active", borrowed);
  document.body.classList.toggle("practice-title-active", practice);
  const homeTitle = document.querySelector("#homeTitle");
  homeTitle?.classList.toggle("story-home-title", story);
  homeTitle?.classList.toggle("borrowed-home-title", borrowed);
  const brandTitle = document.querySelector("#brandTitle");
  const brandContext = document.querySelector("#brandContext");
  const homeTitleLead = document.querySelector("#homeTitleLead");
  const homeTitleRest = document.querySelector("#homeTitleRest");
  const homeKicker = document.querySelector("#homeKicker");
  const storyMenuTitle = document.querySelector("#storyMenuTitle");
  if (brandTitle) brandTitle.textContent = title;
  if (brandContext) brandContext.textContent = context;
  if (homeTitleLead) homeTitleLead.textContent = homeLead;
  if (homeTitleRest) homeTitleRest.textContent = homeRest;
  if (homeKicker) homeKicker.textContent = kicker;
  if (storyMenuTitle && story) storyMenuTitle.textContent = title;
}

function updateLoadingProgress({ completed, total, label, failed }) {
  const ratio = total > 0 ? completed / total : 1;
  const percent = Math.round(ratio * 100);
  if (loadingProgress) loadingProgress.style.width = `${percent}%`;
  if (loadingPercent) loadingPercent.textContent = `${percent}%`;
  if (loadingStatus) loadingStatus.textContent = failed ? `${label} · 使用备用资源` : label;
  if (loadingDetails) loadingDetails.textContent = `${completed} / ${total} 项资源已准备`;
}

async function preloadGameAssets() {
  if (!loadingScreen) return;
  updateLoadingProgress({ completed: 0, total: 1, label: "连接资源库", failed: false });
  try {
    const result = await renderer.preloadAssets(updateLoadingProgress);
    if (result.failed.length > 0) {
      if (loadingStatus) loadingStatus.textContent = `${result.failed.length} 项资源使用备用版本`;
      if (loadingDetails) loadingDetails.textContent = "核心系统已准备，可以开始游戏";
    } else if (loadingStatus) {
      loadingStatus.textContent = "全部资源已准备";
    }
  } catch (error) {
    console.warn("Unable to preload game assets", error);
    if (loadingStatus) loadingStatus.textContent = "部分资源加载失败，使用备用版本";
    if (loadingDetails) loadingDetails.textContent = "核心系统已准备，可以开始游戏";
  }
  loadingScreen.classList.add("loading-ready");
  window.setTimeout(() => {
    loadingScreen.classList.add("hidden");
    loadingScreen.setAttribute("aria-hidden", "true");
  }, 420);
}

const secondPlayer = () => game.entities.find((e) => e.isPlayer && e !== game.player());
const touch = new TouchControls({
  game,
  renderer,
  movePosition: inputSettings.touchMovePosition,
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
for (const [selector, action] of [
  ["#btnBasic", () => game.tryBasicAttack(game.player())],
  ["#btnCopy", () => game.cycleCopy(game.player())],
  ["#btnRestore", () => game.tryForceRestore(game.player())]
]) document.querySelector(selector)?.addEventListener("pointerdown", (event) => {
  event.preventDefault(); event.stopPropagation(); action();
});

// Each scene has a default track; the adjacent button owns sound on/off.
const bgmBtn = document.querySelector("#bgmBtn");
function refreshBgmBtn() { if (bgmBtn) bgmBtn.textContent = `♫ ${audio.bgmLabel()}`; }
function setMusicScene(scene) {
  audio.setScene(scene);
  refreshBgmBtn();
}
refreshBgmBtn();
bgmBtn?.addEventListener("click", () => {
  audio.cycleBgm();
  refreshBgmBtn();
});

function startGame(mode, difficulty) {
  audio.ensure();
  setMusicScene(game.modeFamily === "story" ? "story" : mode === "practice" ? "practice" : "gojo");
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  game.start(mode, difficulty);
  setModeTitle(mode, game.modeFamily === "story" ? game.storyStage : null);
  renderer.reset();
  const stageReady = renderer.setStoryStage(game.modeFamily === "story" ? game.storyStage : null);
  game.setWorldObstacles(renderer.getWorldCollisionBoxes());
  stageReady.then(() => game.setWorldObstacles(renderer.getWorldCollisionBoxes()));
  // Dual rendering temporarily gives the main camera a half-screen aspect ratio.
  // Restore the actual canvas size synchronously before the first frame of any
  // new mode; ResizeObserver alone can otherwise leave practice looking flat.
  fitCanvas();
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

function setBindingStatus(message) {
  const status = document.querySelector("#bindingStatus");
  if (status) status.textContent = message;
}

function renderBindingEditor() {
  const host = document.querySelector("#keyBindings");
  if (!host) return;
  const openGroups = new Set([...host.querySelectorAll("details[open]")].map((section) => section.dataset.group));
  host.replaceChildren();
  const groups = new Map();
  for (const binding of BINDINGS) {
    const groupName = `${binding.player} · ${binding.group}`;
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(binding);
  }
  for (const [name, bindings] of groups) {
    const section = document.createElement("details");
    section.className = "key-binding-group";
    section.dataset.group = name;
    section.open = openGroups.size ? openGroups.has(name) : name === "玩家 1 · 移动";
    const summary = document.createElement("summary");
    summary.textContent = name;
    const rows = document.createElement("div");
    rows.className = "key-binding-rows";
    for (const binding of bindings) {
      const row = document.createElement("div");
      row.className = "key-binding-row";
      const label = document.createElement("span");
      label.textContent = binding.label;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "key-binding-button";
      button.dataset.bindingId = binding.id;
      button.textContent = displayKey(inputSettings.bindings[binding.id]);
      button.addEventListener("click", () => {
        if (bindingCapture?.button) bindingCapture.button.classList.remove("listening");
        bindingCapture = { id: binding.id, button };
        button.classList.add("listening");
        button.textContent = "按下按键";
        setBindingStatus(`${binding.player} · ${binding.label}：按下新按键，Esc 取消。`);
      });
      row.append(label, button);
      rows.appendChild(row);
    }
    section.append(summary, rows);
    host.appendChild(section);
  }
}

function persistInputSettings() {
  saveInputSettings(inputSettings);
  rebuildBindingCodes();
  ui.refreshKeyLabels();
}

window.addEventListener("keydown", (event) => {
  if (!bindingCapture) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.code === "Escape") {
    bindingCapture.button.classList.remove("listening");
    bindingCapture = null;
    renderBindingEditor();
    setBindingStatus("已取消修改。键位会保存在本机。");
    return;
  }
  if (!event.code || event.code === "Unidentified") {
    setBindingStatus("无法识别这个按键，请换一个再试。仍在等待按键。");
    return;
  }
  const duplicate = BINDINGS.find((binding) => binding.id !== bindingCapture.id && inputSettings.bindings[binding.id] === event.code);
  if (duplicate) {
    setBindingStatus(`${displayKey(event.code)} 已用于${duplicate.player}的「${duplicate.label}」，请换一个按键。`);
    return;
  }
  inputSettings.bindings[bindingCapture.id] = event.code;
  bindingCapture.button.classList.remove("listening");
  bindingCapture = null;
  persistInputSettings();
  renderBindingEditor();
  setBindingStatus("键位已保存到本机。");
});

renderBindingEditor();
const volumeSlider = document.querySelector("#masterVolume");
const volumeValue = document.querySelector("#volumeValue");
function refreshVolumeLabel() {
  if (volumeSlider) volumeSlider.value = String(Math.round(audio.masterVolume * 100));
  if (volumeValue) volumeValue.value = `${Math.round(audio.masterVolume * 100)}%`;
}
refreshVolumeLabel();
volumeSlider?.addEventListener("input", () => {
  audio.setVolume(Number(volumeSlider.value) / 100);
  refreshVolumeLabel();
});
document.querySelector("#settingsMuteBtn")?.addEventListener("click", () => {
  audio.setMuted(!audio.muted);
  refreshSoundButtons();
  if (!audio.muted) audio.ensure();
});
refreshSoundButtons();

const touchMoveSettings = document.querySelector("#touchMoveSettings");
const touchLayoutPreview = document.querySelector("#touchLayoutPreview");
const touchPositionHandle = document.querySelector("#touchPositionHandle");
let draggingTouchPosition = false;
function renderTouchPosition() {
  const position = inputSettings.touchMovePosition;
  touchPositionHandle?.style.setProperty("left", `${position.x * 100}%`);
  touchPositionHandle?.style.setProperty("top", `${position.y * 100}%`);
}
function updateTouchPosition(event) {
  if (!touchLayoutPreview) return;
  const rect = touchLayoutPreview.getBoundingClientRect();
  inputSettings.touchMovePosition = clampTouchMovePosition({
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height
  });
  touch.setMovePosition(inputSettings.touchMovePosition);
  renderTouchPosition();
  saveInputSettings(inputSettings);
}
if (touchMoveSettings) touchMoveSettings.classList.toggle("hidden", !isTouchDevice);
touchPositionHandle?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  draggingTouchPosition = true;
  try { touchPositionHandle.setPointerCapture(event.pointerId); } catch (_) { /* synthetic pointer */ }
  updateTouchPosition(event);
});
touchPositionHandle?.addEventListener("pointermove", (event) => {
  if (draggingTouchPosition) updateTouchPosition(event);
});
const stopTouchPositionDrag = () => { draggingTouchPosition = false; };
touchPositionHandle?.addEventListener("pointerup", stopTouchPositionDrag);
touchPositionHandle?.addEventListener("pointercancel", stopTouchPositionDrag);
document.querySelector("#resetTouchPositionBtn")?.addEventListener("click", () => {
  inputSettings.touchMovePosition = { ...DEFAULT_TOUCH_MOVE_POSITION };
  touch.setMovePosition(inputSettings.touchMovePosition);
  saveInputSettings(inputSettings);
  renderTouchPosition();
});
renderTouchPosition();

// ---- input ----
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    if (game.state === "playing") { game.state = "paused"; }
    else if (game.state === "paused") { game.state = "playing"; }
    else if (game.state === "difficulty") {
      game.state = game.pendingMode === "story" ? "storySelect" : "gojoSelect";
      setModeTitle(game.pendingMode === "story" ? "story" : "gojo", game.pendingMode === "story" ? game.storyStage : null);
      applyTheme(game.pendingMode === "story" ? "yuta" : "gojo");
    }
    else if (game.state === "storySelect" || game.state === "gojoSelect") {
      game.state = "modeSelect";
      setMusicScene("menu");
      setModeTitle("gojo");
      applyTheme("gojo");
    }
    else if (["modeSelect", "guide", "settings"].includes(game.state)) {
      game.state = "menu";
      setMusicScene("menu");
      setModeTitle("gojo");
      applyTheme("gojo");
    }
    return;
  }
  if (bindingCodes.has(event.code)) event.preventDefault();
  if (event.repeat) return;
  keys.add(event.code);
  const p1 = game.player();
  const p2 = game.entities.find((e) => e.isPlayer && e !== p1);
  const c = game.state === "playing";
  if (c && p1) {
    const actions = bindingCodes.get(event.code) || [];
    const cast = actions.find((id) => /^p1\.cast[1-5]$/.test(id));
    if (cast) game.tryCast(p1, Number(cast.at(-1)) - 1);
    if (actions.includes("p1.copy")) game.cycleCopy(p1);
    if (actions.includes("p1.restore")) game.tryForceRestore(p1);
    if (actions.includes("p1.melee")) game.tryBasicAttack(p1);
    if (actions.includes("p1.lock")) game.cycleLock(p1);
    if (actions.includes("p1.dash")) game.tryDash(p1, p1.moveInput.x, p1.moveInput.y, p1.moveInput.z);
  }
  if (c && p2) {
    const actions = bindingCodes.get(event.code) || [];
    const cast = actions.find((id) => /^p2\.cast[1-5]$/.test(id));
    if (cast) game.tryCast(p2, Number(cast.at(-1)) - 1);
    if (actions.includes("p2.melee")) game.tryBasicAttack(p2);
    if (actions.includes("p2.restore")) game.tryForceRestore(p2);
    if (actions.includes("p2.dash")) game.tryDash(p2, p2.moveInput.x, p2.moveInput.y, p2.moveInput.z);
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
function restoreVisibleCanvas() {
  requestAnimationFrame(() => {
    fitCanvas();
    renderer.recoverGraphicsState();
  });
}
function releaseActiveInputs() {
  keys.clear();
  touch.reset();
}
window.addEventListener("blur", releaseActiveInputs);
window.addEventListener("focus", restoreVisibleCanvas);
window.addEventListener("pageshow", restoreVisibleCanvas);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseActiveInputs();
  else restoreVisibleCanvas();
});
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
    document.querySelector("#btnCopy")?.classList.toggle("hidden", p1.charId !== "yuta");
    document.querySelector("#btnRestore")?.classList.toggle("hidden", p1.burnout <= 0 || p1.domainLocked);
    const yaw = renderer.camYaw;
    const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
    let mx = 0;
    let mz = 0;
    let my = 0;
    if (keys.has(keyCode("p1.up"))) { mx += fwd.x; mz += fwd.z; }
    if (keys.has(keyCode("p1.down"))) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has(keyCode("p1.right"))) { mx += right.x; mz += right.z; }
    if (keys.has(keyCode("p1.left"))) { mx -= right.x; mz -= right.z; }
    // vertical: descend wins over ascend so the two can never cancel out
    const up = keys.has(keyCode("p1.ascend")) ? 1 : 0;
    const down = keys.has(keyCode("p1.descend"));
    my = down ? -1 : up;
    let sprint = keys.has(keyCode("p1.sprint"));

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
    if (keys.has(keyCode("p2.up"))) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has(keyCode("p2.down"))) { mx += fwd.x; mz += fwd.z; }
    if (keys.has(keyCode("p2.left"))) { mx += right.x; mz += right.z; }
    if (keys.has(keyCode("p2.right"))) { mx -= right.x; mz -= right.z; }
    let my = 0;
    if (keys.has(keyCode("p2.descend"))) my = -1;
    else if (keys.has(keyCode("p2.ascend"))) my = 1;
    let sprint2 = keys.has(keyCode("p2.sprint"));
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
  if (document.hidden) {
    previousTime = now;
    requestAnimationFrame(frame);
    return;
  }
  // simulation steps are capped so a hitch cannot teleport the fighters…
  const realDt = Math.min(0.033, rawDt);
  previousTime = now;
  applyInput();
  // …but the cinematic timers must use real time, otherwise a low frame rate
  // stretches the death cut-in / time-stop into what looks like a freeze
  if (game.timeStop > 0) game.timeStop = Math.max(0, game.timeStop - rawDt);
  if (game.cutIn) { game.cutIn.life -= rawDt; if (game.cutIn.life <= 0) game.cutIn = null; }
  // freeze the whole scene behind the menus / during a time-stop
  const frozen = ["menu", "modeSelect", "guide", "settings", "gojoSelect", "storySelect", "difficulty", "paused"].includes(game.state)
    || game.timeStop > 0 || renderer._renderUnavailable;
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
setModeTitle("gojo");
requestAnimationFrame(frame);
void preloadGameAssets();

window.__arena3d = {
  game,
  renderer,
  audio,
  touch,
  start: (mode = "single", difficulty = "normal") => startGame(mode, difficulty),
  cast: (id, index) => { const e = game.entities.find((x) => x.charId === id) || game.player(); return game.tryCast(e, index); }
};
