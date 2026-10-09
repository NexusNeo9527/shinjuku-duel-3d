import { Game3D } from "./Game3D.js";
import { Renderer3D } from "./three/Renderer3D.js";
import { AudioEngine } from "./audio.js";
import { mediaPreloadTasks } from "./preloadMedia.js";
import { UI3D } from "./ui3d.js";
import { TouchControls } from "./touch.js";
import { TouchLayoutEditor } from './touchLayoutEditor.js';
import { PLAYER_HP_SETTINGS, STORY_STAGES, CHARACTERS } from "./config3d.js";
import { BINDINGS, DEFAULT_TOUCH_MOVE_POSITION, clampPlayerMaxHp, clampTouchMovePosition, displayKey, loadInputSettings, saveInputSettings } from "./inputSettings.js";

const canvas = document.querySelector("#gameCanvas");
const arena = document.querySelector("#arena");
const loadingScreen = document.querySelector("#loadingScreen");
const loadingProgress = document.querySelector("#loadingProgress");
const loadingPercent = document.querySelector("#loadingPercent");
const loadingStatus = document.querySelector("#loadingStatus");
const loadingDetails = document.querySelector("#loadingDetails");
const loadingRetry = document.querySelector("#loadingRetry");
loadingRetry?.addEventListener("click", () => window.location.reload());
let assetsReady = false;
const bootContent = [...document.querySelector(".game-shell").children].filter((element) => element !== loadingScreen);
for (const element of bootContent) element.inert = true;

const game = new Game3D();
const renderer = new Renderer3D(canvas);
const audio = new AudioEngine();
const inputSettings = loadInputSettings();
game.setPlayerMaxHp(inputSettings.playerMaxHp);
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
  sukunaStory2: "完全体宿傩",
  gojoTeen: "五条悟·高专", gojoAwakened: "五条悟·觉醒", toji: "伏黑甚尔", tojiRematch: "伏黑甚尔·万里锁"
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
let returnToStoryMenuAfterClassic = false;

function openClassicDuel(fromStory) {
  returnToStoryMenuAfterClassic = fromStory;
  audio.ensure();
  game.modeFamily = "gojo";
  game.storyPlayMode = "story";
  game.setSingleChar("gojo");
  game.pendingMode = "single";
  setMusicScene("gojo");
  game.state = "gojoSelect";
  setModeTitle("single");
  applyTheme(game.singleChar);
}


const ui = new UI3D(game, {
  getKeyLabel: (id) => displayKey(inputSettings.bindings[id]),
  onStart: () => { game.state = "modeSelect"; },
  onOpenGuide: () => { game.state = "guide"; },
  onOpenSettings: () => { game.state = "settings"; },
  onBackToHome: () => returnHome(),
  onBackToModeSelect: () => {
    if (returnToStoryMenuAfterClassic) {
      returnToStoryMenuAfterClassic = false;
      game.modeFamily = "story";
      game.pendingMode = "story";
      game.state = "storySelect";
      setMusicScene("story");
      setModeTitle("story", game.storyStage);
      const stageInfo = STORY_STAGES[game.storyStage];
      applyTheme(game.storySide === "enemy" ? stageInfo.enemy : stageInfo.ally);
      return;
    }
    game.state = "modeSelect";
    setMusicScene("menu");
    setModeTitle("gojo");
    applyTheme("gojo");
  },
  onMode: (mode) => {
    if (mode === "gojo") { openClassicDuel(false); return; }
    audio.ensure();
    returnToStoryMenuAfterClassic = false;
    game.modeFamily = mode === "story" ? "story" : "free";
    game.storyPlayMode = "story";
    if (mode === "free") {
      game.pendingMode = "single"; setMusicScene("gojo"); game.state = "gojoSelect";
      setModeTitle("single"); applyTheme(game.freePlayerChar); return;
    }
    if (mode === "story") {
      setMusicScene("story");
      game.setStory("opening", "ally");
      game.pendingMode = "story";
      game.state = "storySelect";
      setModeTitle("story", game.storyStage);
      applyTheme(STORY_STAGES[game.storyStage].ally);
    }
  },
  onGojoMode: (mode) => {
    if (game.modeFamily === "free") game.singleChar = game.freePlayerChar;
    game.setPracticeChar(game.modeFamily === "free" ? game.freePlayerChar : game.singleChar);
    setModeTitle("single");
    if (mode === "single") { game.pendingMode = "single"; applyTheme(game.modeFamily === "free" ? game.freePlayerChar : game.singleChar); game.state = "difficulty"; return; }
    startGame(mode, "normal");
  },
  onDifficulty: (d) => startGame(game.pendingMode === "story" ? "story" : "single", d),
  onStoryPlayMode: (mode) => { game.storyPlayMode = mode; },
  onStoryClassic: () => openClassicDuel(true),
  onStoryStage: (stage) => {
    game.setStory(stage, game.storySide);
    const stageInfo = STORY_STAGES[game.storyStage];
    if (game.storyPlayMode === "story") {
      game.pendingMode = "story";
      game.state = "difficulty";
      setModeTitle("story", game.storyStage);
      applyTheme(game.storySide === "enemy" ? stageInfo.enemy : stageInfo.ally);
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
  onStorySide: (side) => {
    game.setStory(game.storyStage, side);
    const stageInfo = STORY_STAGES[game.storyStage];
    applyTheme(game.storySide === "enemy" ? stageInfo.enemy : stageInfo.ally);
  },
  onContinueStory: () => {
    const next = STORY_STAGES[game.storyStage]?.next;
    if (game.mode !== "story" || game.state !== "ended" || !game.winner?.isPlayer || !next) return;
    game.setStory(next, game.storySide);
    startGame("story", game.difficulty);
  },
  onStoryTransition: () => { releaseActiveInputs(); game.finishStoryTransition(); },
  onFreeCharacter: (side, id) => {
    if (side === "player") { game.freePlayerChar = id; game.singleChar = id; applyTheme(id); }
    else game.freeEnemyChar = id;
    setModeTitle("single");
  },
  onSingleChar: (id) => { game.setSingleChar(id); applyTheme(game.singleChar); },
  onBack: () => {
    if (game.pendingMode === "story") game.setStory("opening", game.storySide);
    game.state = game.pendingMode === "story" ? "storySelect" : "gojoSelect";
    setModeTitle(game.pendingMode === "story" ? "story" : "gojo", game.pendingMode === "story" ? game.storyStage : null);
    const stageInfo = STORY_STAGES[game.storyStage];
    applyTheme(game.pendingMode === "story" ? (game.storySide === "enemy" ? stageInfo.enemy : stageInfo.ally) : "gojo");
  },
  onHome: () => returnHome(),
  onAgain: () => startGame(game.mode, game.difficulty),
  onResume: () => { if (game.state === "paused") game.state = "playing"; },
  onRestart: () => startGame(game.mode, game.difficulty),
  onPracticeChar: (c) => {
    game.setPracticeChar(c);
    applyTheme(game.practiceChar);
    startGame("practice", "normal");
  },
  onPracticeEnemy: (c) => {
    if (!game.setPracticeEnemy(c)) return;
    game.practiceDummy = true;
    startGame("practice", "normal");
  },
  onTheme: (c) => {
    game.trainingTask = null;
    game.setPracticeChar(c);
    applyTheme(game.practiceChar);
  },
  onPracticeOption: (key, value) => {
    game.setPracticeOption(key, value);
  },
  onTraining: (task) => {
    releaseActiveInputs();
    game.startTraining(task);
    renderer.reset();
    renderer.setStoryStage(null).then(()=>game.setWorldObstacles(renderer.getWorldCollisionBoxes()));
    setModeTitle('practice'); setMusicScene('practice'); fitCanvas();
    applyTheme(game.practiceChar);
    document.querySelector('#practicePanel').classList.add('collapsed');
    document.querySelector('#practicePanelToggle').setAttribute('aria-expanded','false');
    document.querySelector('#practicePanelToggle .pp-chevron').textContent='+';
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

function returnHome() {
  releaseActiveInputs();
  game.state = "menu";
  game.modeFamily = "gojo";
  game.storyPlayMode = "story";
  setMusicScene("menu");
  setModeTitle("gojo");
  applyTheme("gojo");
  renderer.reset();
}

function setModeTitle(mode, stage = null) {
  const home = ["menu", "modeSelect", "guide", "settings"].includes(game.state);
  const story = !home && (mode === "story" || (mode === "dual" && game.modeFamily === "story"));
  const borrowed = story && stage === "borrowed";
  const hiddenInventory = story && ["hiddenInventory", "hiddenInventoryRematch"].includes(stage);
  const shibuya = story && STORY_STAGES[stage]?.shibuya;
  const storyAlly = CHARACTERS[STORY_STAGES[stage]?.ally]?.name || "乙骨忧太";
  const storyEnemy = CHARACTERS[STORY_STAGES[stage]?.enemy]?.name || "宿傩";
  const practice = !home && mode === "practice";
  const practiceName = CHARACTERS[game.practiceChar]?.name || "五条悟";
  const free = game.modeFamily === "free";
  const title = home
    ? "咒术回战"
    : practice
    ? `${practiceName} · 练习模式`
    : free
      ? CHARACTERS[game.freePlayerChar].name + " VS " + CHARACTERS[game.freeEnemyChar].name + (mode === "dual" ? " · 双人对战" : "")
    : story
      ? `${storyAlly} VS ${storyEnemy}${mode === "dual" ? " · 双人对战" : ""}`
      : mode === "dual" ? "五条悟 VS 宿傩 · 双人对战" : "五条悟 VS 宿傩";
  const context = home ? "STORY MODE / FREE BATTLE"
    : practice
    ? "CURSED TECHNIQUE PRACTICE"
    : story
      ? stage === "opening" ? "SHINJUKU / GOJO VS SUKUNA" : STORY_STAGES[stage]?.culling ? 'CULLING GAME / YUJI VS HIGURUMA' : STORY_STAGES[stage]?.raid ? stage === 'kashimoDuel' ? 'SHINJUKU / KASHIMO VS SUKUNA' : 'SHINJUKU / HIGURUMA & YUJI VS SUKUNA' : shibuya ? "SHIBUYA INCIDENT / YUJI & TODO VS MAHITO" : hiddenInventory ? "HIDDEN INVENTORY / GOJO VS TOJI" : borrowed ? "YUTA IN GOJO'S BODY / DOMAIN REMATCH" : "YUTA / RIKA & COPIED TECHNIQUES"
      : free ? "FREE BATTLE / 自由战斗" : "GOJO VS SUKUNA / CURSED ARENA";

  document.title = story && game.state === "storySelect" ? "怀玉 / 涩谷 / 新宿" : title;
  document.body.classList.toggle("story-title-active", story);
  document.body.classList.toggle("borrowed-title-active", borrowed);
  document.body.classList.toggle("practice-title-active", practice);
  const homeTitle = document.querySelector("#homeTitle");
  homeTitle?.classList.remove("story-home-title", "borrowed-home-title");
  const brandTitle = document.querySelector("#brandTitle");
  const brandContext = document.querySelector("#brandContext");
  const homeTitleLead = document.querySelector("#homeTitleLead");
  const homeTitleRest = document.querySelector("#homeTitleRest");
  const homeKicker = document.querySelector("#homeKicker");
  const storyMenuTitle = document.querySelector("#storyMenuTitle");
  if (brandTitle) brandTitle.textContent = title;
  if (brandContext) brandContext.textContent = context;
  if (homeTitleLead) homeTitleLead.textContent = "咒术";
  if (homeTitleRest) homeTitleRest.textContent = "回战";
  if (homeKicker) homeKicker.textContent = "STORY MODE / FREE BATTLE";
  if (storyMenuTitle && story) storyMenuTitle.textContent = game.state === "storySelect" ? "怀玉 / 涩谷 / 新宿" : title;
}

function updateLoadingProgress({ completed, total, label, failed, failedCount = 0 }) {
  const ready = completed - failedCount;
  const ratio = total > 0 ? ready / total : 1;
  const percent = Math.round(ratio * 100);
  if (loadingProgress) loadingProgress.style.width = `${percent}%`;
  if (loadingPercent) loadingPercent.textContent = `${percent}%`;
  if (loadingStatus) loadingStatus.textContent = failed ? `${label} · 加载失败` : label;
  if (loadingDetails) loadingDetails.textContent = `${ready} / ${total} 项资源已准备`;
}

async function preloadGameAssets() {
  if (!loadingScreen) return;
  updateLoadingProgress({ completed: 0, total: 1, label: "连接资源库", failed: false });
  try {
    const result = await renderer.preloadAssets(updateLoadingProgress, mediaPreloadTasks(audio));
    if (result.failed.length > 0) {
      if (loadingStatus) loadingStatus.textContent = `${result.failed.length} 项资源加载失败`;
      if (loadingDetails) loadingDetails.textContent = `请检查网络后重试：${result.failed.join("、")}`;
      loadingRetry?.classList.remove("hidden");
      return;
    } else if (loadingStatus) {
      loadingStatus.textContent = "全部资源已准备";
    }
  } catch (error) {
    console.warn("Unable to preload game assets", error);
    if (loadingStatus) loadingStatus.textContent = "资源加载失败";
    if (loadingDetails) loadingDetails.textContent = "请检查网络后重新加载";
    loadingRetry?.classList.remove("hidden");
    return;
  }
  if (loadingDetails) loadingDetails.textContent = "模型、场景、图片与音乐全部就绪";
  assetsReady = true;
  for (const element of bootContent) element.inert = false;
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
  buttonPositions: inputSettings.touchButtonPositions,
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
  ["#btnRestore", () => game.tryForceRestore(game.player())],
  ["#btnSimpleDomain", () => game.trySimpleDomain(game.player())]
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
  game.challenge = document.querySelector('#challengeSelect')?.value || '';
  if (!assetsReady) return;
  releaseActiveInputs();
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
  if (game.state === "storyTransition" && ["Enter", "Space", "Escape"].includes(event.code)) {
    event.preventDefault();
    if (!event.repeat) { releaseActiveInputs(); game.finishStoryTransition(); }
    return;
  }
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
const bgmVolumeSlider = document.querySelector("#bgmVolume");
const bgmVolumeValue = document.querySelector("#bgmVolumeValue");
function refreshVolumeLabel() {
  if (volumeSlider) volumeSlider.value = String(Math.round(audio.masterVolume * 100));
  if (volumeValue) volumeValue.value = `${Math.round(audio.masterVolume * 100)}%`;
  if (bgmVolumeSlider) bgmVolumeSlider.value = String(Math.round(audio.bgmVolume * 100));
  if (bgmVolumeValue) bgmVolumeValue.value = `${Math.round(audio.bgmVolume * 100)}%`;
}
refreshVolumeLabel();
volumeSlider?.addEventListener("input", () => {
  audio.setVolume(Number(volumeSlider.value) / 100);
  refreshVolumeLabel();
});
bgmVolumeSlider?.addEventListener("input", () => {
  audio.setBgmVolume(Number(bgmVolumeSlider.value) / 100);
  refreshVolumeLabel();
});
document.querySelector("#settingsMuteBtn")?.addEventListener("click", () => {
  audio.setMuted(!audio.muted);
  refreshSoundButtons();
  if (!audio.muted) audio.ensure();
});

const playerMaxHpSlider = document.querySelector("#playerMaxHp");
const playerMaxHpValue = document.querySelector("#playerMaxHpValue");
if (playerMaxHpSlider) {
  playerMaxHpSlider.min = String(PLAYER_HP_SETTINGS.min);
  playerMaxHpSlider.max = String(PLAYER_HP_SETTINGS.max);
  playerMaxHpSlider.step = String(PLAYER_HP_SETTINGS.step);
}
function refreshPlayerMaxHpLabel() {
  const hp = inputSettings.playerMaxHp;
  if (playerMaxHpSlider) playerMaxHpSlider.value = String(hp);
  if (playerMaxHpValue) playerMaxHpValue.value = `${hp} HP`;
}
refreshPlayerMaxHpLabel();
playerMaxHpSlider?.addEventListener("input", () => {
  inputSettings.playerMaxHp = clampPlayerMaxHp(Number(playerMaxHpSlider.value));
  game.setPlayerMaxHp(inputSettings.playerMaxHp);
  saveInputSettings(inputSettings);
  refreshPlayerMaxHpLabel();
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

new TouchLayoutEditor({ game, touch, settings: inputSettings, onChange: renderTouchPosition });

// ---- input ----
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    if (game.state === "playing") { releaseActiveInputs(); game.state = "paused"; }
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
      returnHome();
    }
    return;
  }
  if (game.state !== "playing") return;
  if (bindingCodes.has(event.code)) event.preventDefault();
  if (event.repeat) return;
  keys.add(event.code);
  const p1 = game.player();
  const p2 = game.entities.find((e) => e.isPlayer && e !== p1);
  const c = game.state === "playing";
  if (c && p1) {
    const actions = bindingCodes.get(event.code) || [];
    const cast = actions.find((id) => /^p1\.cast[1-5]$/.test(id));
    if (cast) game.castSkillSlot(p1, Number(cast.at(-1)) - 1);
    if (actions.includes('p1.skillPage')) game.cycleSkillPage(p1);
    if (actions.includes("p1.copy")) game.cycleCopy(p1);
    if (actions.includes("p1.restore")) game.tryForceRestore(p1);
    if (actions.includes("p1.simpleDomain")) game.trySimpleDomain(p1);
    if (actions.includes("p1.melee")) game.tryBasicAttack(p1);
    if (actions.includes("p1.lock")) game.cycleLock(p1);
    if (actions.includes("p1.dash")) game.tryDash(p1, p1.moveInput.x, p1.moveInput.y, p1.moveInput.z);
  }
  if (c && p2) {
    const actions = bindingCodes.get(event.code) || [];
    const cast = actions.find((id) => /^p2\.cast[1-5]$/.test(id));
    if (cast) game.castSkillSlot(p2, Number(cast.at(-1)) - 1);
    if (actions.includes('p2.skillPage')) game.cycleSkillPage(p2);
    if (actions.includes("p2.copy")) game.cycleCopy(p2);
    if (actions.includes("p2.lock")) game.cycleLock(p2);
    if (actions.includes("p2.melee")) game.tryBasicAttack(p2);
    if (actions.includes("p2.restore")) game.tryForceRestore(p2);
    if (actions.includes("p2.simpleDomain")) game.trySimpleDomain(p2);
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
  for (const entity of game.entities.filter(e => e.isPlayer)) {
    game.setMove(entity, 0, 0, 0);
    entity.sprinting = false;
  }
}
window.addEventListener("blur", releaseActiveInputs);
window.addEventListener("focus", restoreVisibleCanvas);
window.addEventListener("pageshow", restoreVisibleCanvas);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseActiveInputs();
  else restoreVisibleCanvas();
});
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || document.webkitCurrentFullScreenElement;
function refreshFullscreenButton() {
  const nativeFullscreen = Boolean(fullscreenElement());
  if (nativeFullscreen) document.body.classList.remove("app-fullscreen");
  const active = nativeFullscreen || document.body.classList.contains("app-fullscreen");
  fullBtn?.setAttribute("aria-pressed", String(active));
  fullBtn?.setAttribute("aria-label", active ? "退出全屏" : "全屏");
  fullBtn?.setAttribute("title", active ? "退出全屏" : "进入全屏");
  fullBtn?.classList.toggle("on", active);
  if (fullBtn) fullBtn.textContent = active ? "⤡" : "⛶";
}
function resizeAfterFullscreenChange() {
  const nativeFullscreen = Boolean(fullscreenElement());
  if (nativeFullscreen && !fullscreenWanted) {
    // A browser may finish an old request after the player has already exited.
    exitNativeFullscreen()?.catch?.(() => {});
    return;
  }
  if (nativeFullscreen) {
    wasNativeFullscreen = true;
    clearTimeout(fullscreenFallbackTimer);
  } else if (wasNativeFullscreen) {
    wasNativeFullscreen = false;
    fullscreenWanted = false;
    fullscreenAttempt += 1;
    document.body.classList.remove("app-fullscreen");
    clearTimeout(fullscreenFallbackTimer);
    hideFullscreenNotice();
  }
  refreshFullscreenButton();
  setTimeout(() => { fitCanvas(); refreshFullscreenButton(); }, 120);
}
let fullscreenFallbackTimer = 0;
let fullscreenNoticeTimer = 0;
let fullscreenAttempt = 0;
let fullscreenWanted = false;
let wasNativeFullscreen = false;
const fullscreenNotice = document.querySelector("#fullscreenNotice");
function hideFullscreenNotice() {
  clearTimeout(fullscreenNoticeTimer);
  fullscreenNotice?.classList.add("hidden");
}
function showFullscreenNotice() {
  if (!fullscreenNotice) return;
  fullscreenNotice.textContent = "已铺满页面 · 浏览器地址栏可能仍保留";
  fullscreenNotice.classList.remove("hidden");
  clearTimeout(fullscreenNoticeTimer);
  fullscreenNoticeTimer = setTimeout(hideFullscreenNotice, 3500);
}
function ensureFullscreenFallback(attempt) {
  clearTimeout(fullscreenFallbackTimer);
  fullscreenFallbackTimer = setTimeout(() => {
    if (attempt !== fullscreenAttempt || !fullscreenWanted) return;
    if (!fullscreenElement()) {
      document.body.classList.add("app-fullscreen");
      showFullscreenNotice();
    }
    refreshFullscreenButton();
    fitCanvas();
  }, 300);
}
function exitNativeFullscreen() {
  if (!fullscreenElement()) return;
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
}
document.addEventListener("fullscreenchange", resizeAfterFullscreenChange);
document.addEventListener("webkitfullscreenchange", resizeAfterFullscreenChange);
setTimeout(fitCanvas, 250);

const fullBtn = document.querySelector("#fullBtn");
async function toggleFullscreen() {
  const active = Boolean(fullscreenElement()) || document.body.classList.contains("app-fullscreen");
  const attempt = ++fullscreenAttempt;
  fullscreenWanted = !active;
  clearTimeout(fullscreenFallbackTimer);
  hideFullscreenNotice();
  try {
    if (!active) {
      // Respond during the gesture even if the native API never settles.
      document.body.classList.add("app-fullscreen");
      refreshFullscreenButton();
      fitCanvas();
      ensureFullscreenFallback(attempt);
      if (document.fullscreenEnabled !== false && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      } else if (document.webkitFullscreenEnabled !== false && document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else {
        // Embedded browsers may not expose DOM fullscreen. Keep a reversible
        // page layout and explain when browser chrome can remain visible.
        showFullscreenNotice();
      }
    } else {
      document.body.classList.remove("app-fullscreen");
      refreshFullscreenButton();
      fitCanvas();
      await exitNativeFullscreen();
    }
  } catch (error) {
    if (attempt !== fullscreenAttempt) return;
    document.body.classList.toggle("app-fullscreen", fullscreenWanted);
    if (fullscreenWanted) showFullscreenNotice();
    console.warn("Fullscreen API unavailable; using app fullscreen fallback", error);
  }
  if (attempt !== fullscreenAttempt) return;
  if (fullscreenElement()) hideFullscreenNotice();
  refreshFullscreenButton();
  setTimeout(fitCanvas, 150);
}
let lastFullscreenTouch = -Infinity;
fullBtn?.addEventListener("pointerup", event => {
  if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
  event.preventDefault();
  lastFullscreenTouch = performance.now();
  void toggleFullscreen();
});
fullBtn?.addEventListener("click", event => {
  // Keep keyboard/mouse activation, without toggling twice on touch + click.
  const fromPointer = event.detail || ["touch", "pen"].includes(event.pointerType) || event.sourceCapabilities?.firesTouchEvents;
  if (fromPointer && performance.now() - lastFullscreenTouch < 700) return;
  void toggleFullscreen();
});
refreshFullscreenButton();

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
  const wantTouch = game.state === 'touchLayout' || inBattle && (coarseTouch || touchUsed);
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

  if (p1 && (inBattle || game.state === 'touchLayout')) {
    document.querySelector("#btnCopy")?.classList.toggle("hidden", p1.charId !== "yuta");
    document.querySelector("#btnRestore")?.classList.toggle("hidden", !game.canForceRestore(p1) || p1.burnout <= 0 || p1.domainLocked);
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
    const yaw = renderer.cam2Yaw;
    const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
    const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
    let mx = 0;
    let mz = 0;
    if (keys.has(keyCode("p2.up"))) { mx += fwd.x; mz += fwd.z; }
    if (keys.has(keyCode("p2.down"))) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.has(keyCode("p2.left"))) { mx -= right.x; mz -= right.z; }
    if (keys.has(keyCode("p2.right"))) { mx += right.x; mz += right.z; }
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
    const enemy = game.lockEntity(p2);
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
  const frozen = ["menu", "modeSelect", "guide", "settings", "touchLayout", "gojoSelect", "storySelect", "difficulty", "paused", "storyTransition"].includes(game.state)
    || game.timeStop > 0 || renderer._renderUnavailable;
  const dt = frozen ? 0 : realDt;
  game.update(dt);
  for (const ev of game.drainEvents()) audio.handle(ev);
  renderer.sync(game, dt);
  renderer.render(dt);
  ui.update(game);
  touch.refreshLayout();
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
