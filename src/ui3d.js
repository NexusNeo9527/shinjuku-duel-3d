import { CHARACTERS, STORY_STAGES, COPY_TECHNIQUES, DIFFICULTY } from "./config3d.js";
import { STORY_VICTORY_LINES } from "./storyDialogue.js";

const SLOT_KEYS = ["p1.cast1", "p1.cast2", "p1.cast3", "p1.cast4", "p1.cast5"];
const P2_KEYS = ["p2.cast1", "p2.cast2", "p2.cast3", "p2.cast4", "p2.cast5"];
const STORY_DIFFICULTY_TEXT = {
  easy: "耐久 85 · 出招较慢",
  normal: "耐久 100 · 预判移动 · 减伤",
  shura: "耐久 112 · 攻击放缓 · 伤害降低",
  abyss: "耐久 130 · 攻势与伤害下调"
};
// 练习面板开关 -> Game3D 上的字段
const PRACTICE_FLAGS = {
  infinite: "practiceInfinite",
  invincible: "practiceInvincible",
  enemyInvincible: "practiceEnemyInvincible",
  dummy: "practiceDummy"
};
const practiceFlag = (game, key) => Boolean(game[PRACTICE_FLAGS[key]]);
// 胜利者在结算页说的话（按角色 charId）
const VICTORY_LINES = {
  gojo: "我大概明天就会忘记你吧",
  ...STORY_VICTORY_LINES
};
// 胜利插图（结算页顶部）
const WIN_ART = {
  gojo: "win-gojo.jpg",
  sukuna: "win-sukuna.jpg",
  yuta: "win-yuta.png",
  yutaGojo: "win-yuta.png"
};
const RING_CIRC = 276.5;

export const ICONS = {
  blue: `<circle cx="12" cy="12" r="3.2"/><path d="M12 3a9 9 0 0 1 8.4 5.8"/><path d="M12 21a9 9 0 0 1-8.4-5.8"/><path d="M4 8.5A9 9 0 0 0 3.2 13"/>`,
  red: `<path d="M12 2.5l2 6.2 6.5-.2-5.2 3.9 2 6.2-5.3-3.8-5.3 3.8 2-6.2L3.5 8.5l6.5.2z"/>`,
  purple: `<circle cx="12" cy="12" r="6.5"/><path d="M1.8 12h20.4"/><path d="M12 5.5l3.6 6.5-3.6 6.5"/>`,
  void: `<ellipse cx="12" cy="12" rx="9" ry="5.4"/><circle cx="12" cy="12" r="2.8"/>`,
  slash: `<path d="M4 20L20 4"/><path d="M9 20L20 9"/>`,
  cleave: `<path d="M4 4l16 16"/><path d="M20 4L4 20"/>`,
  flame: `<path d="M12 2.5c1 4.2 5 5.4 5 9.5a5 5 0 0 1-10 0c0-2 1-3.2 2.2-4.2-.2 2 .8 3.2 1.8 3.2 0-2.4-1-5.6 1-8.5z"/>`,
  shrine: `<path d="M3 5h18"/><path d="M5 8.2h14"/><path d="M7 8.2V20"/><path d="M17 8.2V20"/><path d="M4.5 20h15"/>`,
  mahoraga: `<circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M4 12h16"/><path d="M6.4 6.4l11.2 11.2"/><path d="M17.6 6.4L6.4 17.6"/>`,
  dash: `<path d="M13 3l-7 9h6l-1 9 7-9h-6z"/>`
  ,katana: `<path d="M4 20L20 4M9 21l3-3"/>`,
  rika: `<circle cx="12" cy="9" r="5"/><path d="M5 21c0-5 14-5 14 0"/>`,
  copy: `<path d="M5 3h11v13H5zM9 7h11v13H9z"/>`,
  authenticLove: `<path d="M12 21L3 11a5 5 0 0 1 9-5 5 5 0 0 1 9 5z"/>`,
  worldSlash: `<path d="M2 20L22 4M4 12l16-8M5 21l16-8"/>`,
  wickerBasket: `<path d="M3 9h18l-3 11H6zM6 9l6-6 6 6"/>`
};

export class UI3D {
  constructor(game, handlers) {
    this.game = game;
    this.handlers = handlers;
    this.slots = [];
    this.dom = {
      menu: document.querySelector("#menu"),
      modeSelectMenu: document.querySelector("#modeSelectMenu"),
      modeSelectBackBtn: document.querySelector("#modeSelectBackBtn"),
      startGameBtn: document.querySelector("#startGameBtn"),
      openGuideBtn: document.querySelector("#openGuideBtn"),
      openSettingsBtn: document.querySelector("#openSettingsBtn"),
      guideMenu: document.querySelector("#guideMenu"),
      guideBackBtn: document.querySelector("#guideBackBtn"),
      settingsMenu: document.querySelector("#settingsMenu"),
      settingsBackBtn: document.querySelector("#settingsBackBtn"),
      storyPlayModeBtns: [...document.querySelectorAll("[data-story-play-mode]")],
      storyPlayHelp: document.querySelector("#storyPlayHelp"),
      gojoMenu: document.querySelector("#gojoMenu"),
      gojoBackBtn: document.querySelector("#gojoBackBtn"),
      gojoModeBtns: [...document.querySelectorAll("[data-gojo-mode]")],
      difficultyMenu: document.querySelector("#difficultyMenu"),
      storyMenu: document.querySelector("#storyMenu"),
      storyBackBtn: document.querySelector("#storyBackBtn"),
      storyStageBtns: [...document.querySelectorAll("[data-story-stage]")],
      storySideBtns: [...document.querySelectorAll("[data-story-side]")],
      storySideSelect: document.querySelector("#storySideSelect"),
      singleCharSelect: document.querySelector("#singleCharSelect"),
      difficultyHelp: document.querySelector("#difficultyHelp"),
      continueStoryBtn: document.querySelector("#continueStoryBtn"),
      battleStatus: document.querySelector("#battleStatus"),
      pauseMenu: document.querySelector("#pauseMenu"),
      resumeBtn: document.querySelector("#resumeBtn"),
      restartBtn: document.querySelector("#restartBtn"),
      pauseHomeBtn: document.querySelector("#pauseHomeBtn"),
      difficultyBackBtn: document.querySelector("#difficultyBackBtn"),
      difficultyButtons: [...document.querySelectorAll("[data-difficulty]")],
      modeButtons: [...document.querySelectorAll("[data-mode]")],
      hud: document.querySelector("#hud"),
      hitBorder: document.querySelector("#hitBorder"),
      cutIn: document.querySelector("#cutIn"),
      cutInImg: document.querySelector("#cutInImg"),
      result: document.querySelector("#result"),
      resultKicker: document.querySelector("#resultKicker"),
      resultTitle: document.querySelector("#resultTitle"),
      resultReason: document.querySelector("#resultReason"),
      resultArt: document.querySelector("#resultArt"),
      resultQuote: document.querySelector("#resultQuote"),
      resultQuoteText: document.querySelector("#resultQuoteText"),
      homeBtn: document.querySelector("#homeBtn"),
      soundBtn: document.querySelector("#soundBtn"),
      modeAudioControls: document.querySelector("#modeAudioControls"),
      againBtn: document.querySelector("#againBtn"),
      modeBtn: document.querySelector("#modeBtn"),
      playerName: document.querySelector("#playerName"),
      enemyName: document.querySelector("#enemyName"),
      enemyHpNum: document.querySelector("#enemyHpNum"),
      enemyTag: document.querySelector("#enemyTag"),
      playerHp: document.querySelector("#playerHp"),
      playerHpText: document.querySelector("#playerHpText"),
      enemyHp: document.querySelector("#enemyHp"),
      sideP1: document.querySelector(".duel-side.p1"),
      sideP2: document.querySelector(".duel-side.p2"),
      chargeFill: document.querySelector("#chargeFill"),
      domainFill: document.querySelector("#domainFill"),
      chargeLabel: document.querySelector("#chargeLabel"),
      domainLabel: document.querySelector("#domainLabel"),
      chargeGain: document.querySelector("#chargeGain"),
      domainGain: document.querySelector("#domainGain"),
      domainRing: document.querySelector("#domainRing"),
      playerSigil: document.querySelector("#playerSigil"),
      altLabel: document.querySelector("#altLabel"),
      summonRow: document.querySelector("#summonRow"),
      summonTag: document.querySelector("#summonRow .summon-tag"),
      summonHp: document.querySelector("#summonHp"),
      summonHpText: document.querySelector("#summonHpText"),
      abilityBar: document.querySelector("#abilityBar"),
      announce: document.querySelector("#announce"),
      dialogueL: document.querySelector("#dialogueL"),
      dialogueLSigil: document.querySelector("#dialogueLSigil"),
      dialogueLName: document.querySelector("#dialogueLName"),
      dialogueLText: document.querySelector("#dialogueLText"),
      dialogueR: document.querySelector("#dialogueR"),
      dialogueRSigil: document.querySelector("#dialogueRSigil"),
      dialogueRName: document.querySelector("#dialogueRName"),
      dialogueRText: document.querySelector("#dialogueRText"),
      hint: document.querySelector("#hint"),
      modeStatus: document.querySelector("#modeStatus"),
      practicePanel: document.querySelector("#practicePanel"),
      practicePanelToggle: document.querySelector("#practicePanelToggle"),
      splitUI: document.querySelector("#splitUI"),
      practiceChars: [...document.querySelectorAll("[data-pchar]")],
      singleCharBtns: [...document.querySelectorAll("[data-single-char]")],
      practiceToggles: [...document.querySelectorAll("[data-ptoggle]")],
      themeChips: [...document.querySelectorAll("[data-theme]")],
      ppCombo: document.querySelector("#ppCombo")
    };
    this.bind();
  }

  bind() {
    const h = this.handlers;
    this.dom.startGameBtn.addEventListener("click", () => h.onStart());
    this.dom.openGuideBtn.addEventListener("click", () => h.onOpenGuide());
    this.dom.openSettingsBtn.addEventListener("click", () => h.onOpenSettings());
    this.dom.modeSelectBackBtn.addEventListener("click", () => h.onBackToHome());
    this.dom.guideBackBtn.addEventListener("click", () => h.onBackToHome());
    this.dom.settingsBackBtn.addEventListener("click", () => h.onBackToHome());
    this.dom.modeButtons.forEach((b) => b.addEventListener("click", () => h.onMode(b.dataset.mode)));
    this.dom.gojoModeBtns.forEach((b) => b.addEventListener("click", () => h.onGojoMode(b.dataset.gojoMode)));
    this.dom.gojoBackBtn.addEventListener("click", () => h.onBackToModeSelect());
    this.dom.storyPlayModeBtns.forEach((b) => b.addEventListener("click", () => {
      this.dom.storyPlayModeBtns.forEach((button) => button.classList.toggle("active", button === b));
      h.onStoryPlayMode(b.dataset.storyPlayMode);
    }));
    this.dom.storyStageBtns.forEach((b) => b.addEventListener("click", () => h.onStoryStage(b.dataset.storyStage)));
    this.dom.storySideBtns.forEach((b) => b.addEventListener("click", () => {
      h.onStorySide(b.dataset.storySide);
    }));
    this.dom.storyBackBtn.addEventListener("click", () => h.onBackToModeSelect());
    this.dom.continueStoryBtn.addEventListener("click", () => h.onContinueStory());
    this.dom.difficultyButtons.forEach((b) => b.addEventListener("click", () => {
      this.dom.difficultyButtons.forEach((x) => x.classList.toggle("selected", x === b));
      h.onDifficulty(b.dataset.difficulty);
    }));
    this.dom.difficultyBackBtn.addEventListener("click", () => h.onBack());
    this.dom.homeBtn.addEventListener("click", () => h.onHome());
    this.dom.modeBtn.addEventListener("click", () => h.onBackToModeSelect());
    this.dom.againBtn.addEventListener("click", () => h.onAgain());
    this.dom.resumeBtn.addEventListener("click", () => h.onResume());
    this.dom.restartBtn.addEventListener("click", () => h.onRestart());
    this.dom.pauseHomeBtn.addEventListener("click", () => h.onHome());
    this.dom.soundBtn.addEventListener("click", () => h.onSound(this.dom.soundBtn));
    this.dom.practiceChars.forEach((b) => b.addEventListener("click", () => h.onPracticeChar(b.dataset.pchar)));
    this.dom.practicePanelToggle.addEventListener("click", () => {
      const collapsed = this.dom.practicePanel.classList.toggle("collapsed");
      this.dom.practicePanelToggle.setAttribute("aria-expanded", String(!collapsed));
      this.dom.practicePanelToggle.querySelector(".pp-chevron").textContent = collapsed ? "+" : "−";
    });
    this.dom.singleCharBtns.forEach((b) => b.addEventListener("click", () => {
      h.onSingleChar(b.dataset.singleChar);
    }));
    this.dom.themeChips.forEach((b) => b.addEventListener("click", () => h.onTheme(b.dataset.theme)));
    this.dom.practiceToggles.forEach((b) => b.addEventListener("click", () => {
      const key = b.dataset.ptoggle;
      const g = this.game;
      const current = practiceFlag(g, key);
      h.onPracticeOption(key, !current);
    }));

    // dual mode: one mirrored HUD panel per half (built here so both are identical)
    this.splitP1 = this.buildSplitPanel("left", "P1", SLOT_KEYS);
    this.splitP2 = this.buildSplitPanel("right", "P2", P2_KEYS);
  }

  buildSplitPanel(side, tag, keys) {
    const el = document.createElement("div");
    el.className = `split-panel ${side}`;
    el.innerHTML = `
      <div class="sp-head">
        <span class="sp-sigil"></span>
        <b class="sp-name"></b>
        <span class="sp-tag">${tag}</span>
        <b class="sp-hpnum"></b>
      </div>
      <div class="sp-bar"><div class="sp-fill"></div></div>
      <div class="sp-gauges">
        <div class="sp-gauge"><span>奥义</span><div class="sp-track"><div class="sp-gfill sp-charge"></div></div></div>
        <div class="sp-gauge"><span>领域</span><div class="sp-track"><div class="sp-gfill sp-domain"></div></div></div>
      </div>
      <div class="sp-slots"></div>`;
    this.dom.splitUI.appendChild(el);
    return {
      el,
      sigil: el.querySelector(".sp-sigil"),
      name: el.querySelector(".sp-name"),
      hpNum: el.querySelector(".sp-hpnum"),
      hp: el.querySelector(".sp-fill"),
      charge: el.querySelector(".sp-charge"),
      domain: el.querySelector(".sp-domain"),
      slotHost: el.querySelector(".sp-slots"),
      keys,
      charId: null,
      slots: []
    };
  }

  rebuildSplitSlots(panel, charId) {
    const char = CHARACTERS[charId] || CHARACTERS.gojo;
    panel.slotHost.innerHTML = "";
    panel.charId = charId;
    panel.slots = char.abilities.map((ab, i) => {
      const el = document.createElement("div");
      el.className = "ability-slot";
      el.style.color = ab.color;
      el.innerHTML = `
        <span class="slot-key">${this.getKeyLabel(panel.keys[i])}</span>
        <svg class="slot-icon" viewBox="0 0 24 24">${ICONS[ab.id] || ICONS.blue}</svg>
        <span class="slot-glyph">${ab.label}</span>
        <span class="slot-cd"></span>`;
      panel.slotHost.appendChild(el);
      return { el, cd: el.querySelector(".slot-cd"), ability: ab };
    });
  }

  updateSplitPanel(panel, ent, game) {
    this.applyCharColor(panel.el, ent.charId);
    panel.sigil.textContent = ent.charId.startsWith("yuta") ? "乙" : ent.charId === "gojo" ? "五" : "宿";
    panel.name.textContent = ent.name;
    panel.hpNum.textContent = Math.ceil(Math.max(0, ent.hp));
    panel.hp.style.transform = `scaleX(${Math.max(0, ent.hp / ent.maxHp)})`;
    panel.charge.style.transform = `scaleX(${ent.charge / 100})`;
    panel.domain.style.transform = `scaleX(${ent.domainCharge / 100})`;
    if (panel.charId !== ent.charId) this.rebuildSplitSlots(panel, ent.charId);
    for (let i = 0; i < panel.slots.length; i += 1) {
      const sl = panel.slots[i];
      const cd = ent.cooldowns[i] || 0;
      sl.cd.style.setProperty("--cd", String(this.slotShade(sl.ability, ent, game, cd)));
      const needCharge = sl.ability.needsCharge && ent.charge < 100 && !game.practice;
      const needDomain = sl.ability.needsDomain && ent.domainCharge < 100 && !game.practice;
      sl.el.classList.toggle("locked", Boolean(needCharge || needDomain));
      sl.el.classList.toggle("ready", cd <= 0.001 && !needCharge && !needDomain);
    }
  }

  updateCutIn(game) {
    const c = game.cutIn;
    if (!c) {
      this.dom.cutIn.classList.add("hidden");
      this._cutArt = null;
      return;
    }
    if (this._cutArt !== c.art) {
      this._cutArt = c.art;
      this.dom.cutInImg.src = `${import.meta.env.BASE_URL}assets/${c.art.includes(".") ? c.art : `${c.art}.png`}`;
      this.dom.cutIn.classList.toggle("contain", c.fit === "contain");
      this.dom.cutIn.classList.toggle("compact", c.presentation === "compact");
      this.dom.cutIn.style.setProperty("--cut-tint", c.tint || "rgba(176, 92, 255, 0.32)");
      this.dom.cutIn.style.setProperty("--cut-shadow", c.shadow || "rgba(120, 60, 220, 0.5)");
    }
    // Keep the arena visible while a newly selected illustration is loading.
    if (!this.dom.cutInImg.complete || !this.dom.cutInImg.naturalWidth) {
      this.dom.cutIn.classList.add("hidden");
      return;
    }
    const p = 1 - c.life / c.maxLife;
    const alpha = Math.min(1, p / 0.14) * Math.min(1, c.life / 0.3);
    const scale = 1.24 - 0.24 * Math.min(1, p / 0.4);
    this.dom.cutIn.classList.remove("hidden");
    this.dom.cutIn.style.opacity = String(Math.max(0, alpha));
    this.dom.cutInImg.style.transform = `scale(${scale})`;
  }

  updateHitBorder(game) {
    const p = game.hitPulse || 0;
    const el = this.dom.hitBorder;
    if (!el) return;
    if (p <= 0.02) { el.style.opacity = "0"; el.style.transform = "none"; return; }
    el.style.color = game.hitPulseColor || "#ecc25a";
    el.style.opacity = String(Math.min(0.92, p));
    const j = p * 8;
    el.style.transform = `translate(${(Math.random() - 0.5) * j}px, ${(Math.random() - 0.5) * j}px)`;
  }

  // HP colour follows the character (五条悟 = blue, 宿傩 = red), not the player slot
  applyCharColor(el, charId) {
    if (!el) return;
    const cls = charId?.startsWith("sukuna") ? "char-sukuna" : charId?.startsWith("yuta") ? "char-yuta" : "char-gojo";
    if (el.dataset.char === cls) return;
    el.dataset.char = cls;
    el.classList.remove("char-gojo", "char-sukuna", "char-yuta");
    el.classList.add(cls);
  }

  setThemeChip(charId) {
    for (const b of this.dom.themeChips) b.classList.toggle("active", b.dataset.theme === charId);
  }

  getKeyLabel(bindingId) {
    return this.handlers.getKeyLabel?.(bindingId) || bindingId || "";
  }

  refreshKeyLabels() {
    this.slots.forEach((slot, i) => {
      const label = slot.el.querySelector(".slot-key");
      if (label) label.textContent = this.getKeyLabel(SLOT_KEYS[i]);
    });
    const dashLabel = this.dashSlot?.el.querySelector(".slot-key");
    if (dashLabel) dashLabel.textContent = this.getKeyLabel("p1.dash");
    for (const panel of [this.splitP1, this.splitP2]) {
      panel?.slots.forEach((slot, i) => {
        const label = slot.el.querySelector(".slot-key");
        if (label) label.textContent = this.getKeyLabel(panel.keys[i]);
      });
    }
    const controls1 = document.querySelector(".split-controls-p1");
    const controls2 = document.querySelector(".split-controls-p2");
    if (controls1) controls1.textContent = `P1 · ${this.getKeyLabel("p1.up")}${this.getKeyLabel("p1.left")}${this.getKeyLabel("p1.down")}${this.getKeyLabel("p1.right")} 移动 · ${this.getKeyLabel("p1.sprint")} 疾跑 · ${this.getKeyLabel("p1.ascend")} 升空 · ${this.getKeyLabel("p1.descend")} 下降 · ${SLOT_KEYS.map((id) => this.getKeyLabel(id)).join("/")} 术式 · ${this.getKeyLabel("p1.dash")} 冲刺`;
    if (controls2) controls2.textContent = `P2 · ${this.getKeyLabel("p2.up")}${this.getKeyLabel("p2.left")}${this.getKeyLabel("p2.down")}${this.getKeyLabel("p2.right")} 移动 · ${this.getKeyLabel("p2.sprint")} 疾跑 · ${this.getKeyLabel("p2.ascend")} 升空 · ${this.getKeyLabel("p2.descend")} 下降 · ${P2_KEYS.map((id) => this.getKeyLabel(id)).join("/")} 术式 · ${this.getKeyLabel("p2.dash")} 冲刺`;
    if (this.dom.hint) this.dom.hint.textContent = `${this.getKeyLabel("p1.up")}${this.getKeyLabel("p1.left")}${this.getKeyLabel("p1.down")}${this.getKeyLabel("p1.right")} 移动 · ${this.getKeyLabel("p1.sprint")} 疾跑 · ${this.getKeyLabel("p1.ascend")} 升空 · ${this.getKeyLabel("p1.descend")} 下降 · ${SLOT_KEYS.map((id) => this.getKeyLabel(id)).join("/")} 术式 · ${this.getKeyLabel("p1.dash")} 冲刺 · 滚轮缩放`;
  }

  rebuildAbilityBar(charId) {
    const char = CHARACTERS[charId] || CHARACTERS.gojo;
    this.dom.abilityBar.innerHTML = "";
    this.slots = char.abilities.map((ab, i) => {
      const el = document.createElement("div");
      el.className = "ability-slot";
      el.style.color = ab.color;
      el.innerHTML = `
        <span class="slot-key">${this.getKeyLabel(SLOT_KEYS[i])}</span>
        <svg class="slot-icon" viewBox="0 0 24 24">${ICONS[ab.id] || ICONS.blue}</svg>
        <span class="slot-glyph">${ab.label}</span>
        <span class="slot-cd"></span>
        <span class="slot-lock"></span>`;
      this.dom.abilityBar.appendChild(el);
      return { el, cd: el.querySelector(".slot-cd"), lock: el.querySelector(".slot-lock"), ability: ab };
    });

    const dashEl = document.createElement("div");
    dashEl.className = "ability-slot dash-slot";
    dashEl.innerHTML = `
      <span class="slot-key">${this.getKeyLabel("p1.dash")}</span>
      <svg class="slot-icon" viewBox="0 0 24 24">${ICONS.dash}</svg>
      <span class="slot-glyph">冲刺</span>
      <span class="slot-cd"></span>`;
    this.dom.abilityBar.appendChild(dashEl);
    this.dashSlot = { el: dashEl, cd: dashEl.querySelector(".slot-cd") };

    const comboText = (char.combos || []).map((c) => c.seq.map((id) => {
      const ab = char.abilities.find((a) => a.id === id);
      return ab ? ab.label : id;
    }).join("→")).join(" / ");
    this.dom.ppCombo.textContent = `连招：${comboText}`;
  }

  update(game) {
    const s = game.state;
    this.updateHitBorder(game);
    this.updateCutIn(game);
    this.dom.menu.classList.toggle("hidden", s !== "menu");
    this.dom.modeSelectMenu.classList.toggle("hidden", s !== "modeSelect");
    this.dom.guideMenu.classList.toggle("hidden", s !== "guide");
    this.dom.settingsMenu.classList.toggle("hidden", s !== "settings");
    this.dom.gojoMenu.classList.toggle("hidden", s !== "gojoSelect");
    this.dom.storyMenu.classList.toggle("hidden", s !== "storySelect");
    this.dom.difficultyMenu.classList.toggle("hidden", s !== "difficulty");
    const homeSurface = ["menu", "modeSelect", "guide", "settings"].includes(s);
    this.dom.homeBtn.classList.toggle("hidden", homeSurface);
    this.dom.modeAudioControls.classList.toggle("hidden", homeSurface);
    this.dom.storyPlayModeBtns.forEach((button) => button.classList.toggle("active", button.dataset.storyPlayMode === game.storyPlayMode));
    if (this.dom.storyPlayHelp) {
      this.dom.storyPlayHelp.textContent = game.storyPlayMode === "dual"
        ? "选择阶段后，双方分别操控乙骨与宿傩。"
        : game.storyPlayMode === "practice"
          ? "选择阶段与角色后进入练习，可随时更换角色。"
          : "选择剧情阶段后开始单人战斗。";
    }
    this.dom.storySideSelect.classList.toggle("hidden", game.pendingMode !== "story");
    this.dom.singleCharSelect.classList.toggle("hidden", game.pendingMode === "story");
    this.dom.storySideBtns[0].textContent = game.storyStage === "borrowed" ? "乙骨·五条之身" : "乙骨忧太";
    this.dom.storySideBtns.forEach((button) => button.classList.toggle("active", button.dataset.storySide === game.storySide));
    this.dom.singleCharBtns.forEach((button) => button.classList.toggle("active", button.dataset.singleChar === game.singleChar));
    this.dom.difficultyHelp.textContent = game.pendingMode === "story"
      ? "难度影响电脑对手的反应、伤害和耐久；此剧情战斗没有魔虚罗。"
      : "难度会改变对手的瞄准精度、反应速度、伤害、减伤、机动与魔虚罗强度。";
    for (const button of this.dom.difficultyButtons) {
      const small = button.querySelector("small");
      if (!small.dataset.original) small.dataset.original = small.textContent;
      const caption = game.pendingMode === "story" ? STORY_DIFFICULTY_TEXT[button.dataset.difficulty] : small.dataset.original;
      if (small.textContent !== caption) small.textContent = caption;
    }
    this.dom.pauseMenu.classList.toggle("hidden", s !== "paused");
    this.dom.result.classList.toggle("hidden", s !== "ended");
    this.dom.hud.classList.toggle("hidden", s !== "playing" && s !== "ended" && s !== "paused");
    this.dom.hint.classList.toggle("hidden", s !== "playing" || game.mode === "dual");

    const player = game.player();
    if (player) {
      if (!this.slots.length || this._charId !== player.charId) {
        this._charId = player.charId;
        this.rebuildAbilityBar(player.charId);
      }
      this.dom.playerName.textContent = player.name;
      this.dom.playerSigil.textContent = player.charId.startsWith("yuta") ? "乙" : player.charId === "gojo" ? "五" : "宿";
      this.applyCharColor(this.dom.sideP1, player.charId);
      this.applyCharColor(this.dom.playerHp, player.charId);
      this.dom.playerHp.style.transform = `scaleX(${Math.max(0, player.hp / player.maxHp)})`;
      this.dom.playerHpText.textContent = Math.ceil(Math.max(0, player.hp));
      this.dom.chargeFill.style.transform = `scaleX(${player.charge / 100})`;
      this.dom.domainFill.style.transform = `scaleX(${player.domainCharge / 100})`;
      this.dom.chargeLabel.textContent = `${Math.floor(player.charge)}%`;
      this.dom.domainLabel.textContent = `${Math.floor(player.domainCharge)}%`;
      this.dom.domainRing.style.strokeDashoffset = String(RING_CIRC * (1 - player.domainCharge / 100));
      this.dom.altLabel.textContent = String(Math.round(player.y));
      this.updateSlots(player, game);
      this.updateDash(player);
      this.updateGaugeGain(player);
    }

    const otherPlayer = game.entities.find((e) => e.isPlayer && e !== player);
    const enemy = game.mode === "dual" ? otherPlayer : game.entities.find((e) => !e.isPlayer && !e.summon);
    if (enemy) {
      this.dom.enemyName.textContent = enemy.name;
      this.dom.enemyTag.textContent = game.mode === "dual" ? "P2" : "AI";
      this.applyCharColor(this.dom.sideP2, enemy.charId);
      this.applyCharColor(this.dom.enemyHp, enemy.charId);
      this.dom.enemyHp.style.transform = `scaleX(${Math.max(0, enemy.hp / enemy.maxHp)})`;
      this.dom.enemyHpNum.textContent = Math.ceil(Math.max(0, enemy.hp));
    } else {
      this.dom.enemyName.textContent = "无对手";
      this.dom.enemyTag.textContent = "——";
      this.applyCharColor(this.dom.sideP2, "sukuna");
      this.applyCharColor(this.dom.enemyHp, "sukuna");
      this.dom.enemyHp.style.transform = "scaleX(1)";
      this.dom.enemyHpNum.textContent = "—";
    }

    const summon = game.entities.find((e) => e.summon && e.alive);
    if (summon) {
      this.dom.summonRow.classList.remove("hidden");
      this.dom.summonTag.textContent = summon.name;
      this.dom.summonHp.style.transform = `scaleX(${Math.max(0, summon.hp / summon.maxHp)})`;
      this.dom.summonHpText.textContent = Math.ceil(Math.max(0, summon.hp));
    } else {
      this.dom.summonRow.classList.add("hidden");
    }

    this.dom.practicePanel.classList.toggle("hidden", !(game.practice && (s === "playing" || s === "ended")));
    if (game.practice) this.updatePracticePanel(game);

    // split-screen: both halves get the same HUD (HP + gauges + cooldowns)
    const p2 = game.entities.find((e) => e.isPlayer && e !== player);
    const dual = game.mode === "dual";
    const dualOn = Boolean(dual && (s === "playing" || s === "paused" || s === "ended"));
    this.dom.splitUI.classList.toggle("hidden", !dualOn);
    document.body.classList.toggle("dual-hud", dualOn);
    if (dualOn && player && p2) {
      this.updateSplitPanel(this.splitP1, player, game);
      this.updateSplitPanel(this.splitP2, p2, game);
    }

    this.updateAnnounce(game);
    this.updateDialogue(game);
    this.updateResult(game);

    const modeLabel = s === "menu" ? "咒术回战"
      : s === "modeSelect" ? "选择战场"
      : s === "guide" ? "游戏说明"
      : s === "settings" ? "设置"
      : s === "gojoSelect" ? "五条悟 VS 宿傩"
      : s === "storySelect" ? "乙骨忧太 VS 宿傩"
      : s === "difficulty" ? "选择难度"
      : game.mode === "single" ? `单人对决 · ${DIFFICULTY[game.difficulty].label}`
      : game.mode === "story" ? `剧情 · ${STORY_STAGES[game.storyStage].label} · ${DIFFICULTY[game.difficulty].label}`
      : game.mode === "dual" ? `${game.modeFamily === "story" ? "乙骨篇 · " : ""}双人同屏`
      : `${game.modeFamily === "story" ? "乙骨篇 · " : ""}练习终端`;
    this.dom.modeStatus.textContent = modeLabel;
    const status = [];
    if (game.isStoryCombat() && game.storyStage === "borrowed") {
      const secs = Math.ceil(game.storyTimer);
      status.push(`五条之身 ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`);
    }
    if (player?.burnout > 0) status.push(`术式熔断 ${player.burnout.toFixed(1)}秒 · ${this.getKeyLabel("p1.restore")} 强行恢复`);
    if (player?.domainLocked) status.push("本场领域已锁定");
    if (player?.charId === "yuta") status.push(`${this.getKeyLabel("p1.copy")} 切换复制：${COPY_TECHNIQUES[player.copyIndex].label}`);
    this.dom.battleStatus.textContent = status.join("  ·  ");
    this.dom.battleStatus.classList.toggle("hidden", !status.length || !["playing", "paused", "ended"].includes(s));
  }

  // gauge-gated skills fill up with 奥义/领域 instead of running a separate cooldown
  slotShade(ab, ent, game, cd) {
    if (!game.practice) {
      if (ab.needsCharge) return Math.max(0, Math.min(1, 1 - ent.charge / 100));
      if (ab.needsDomain) return Math.max(0, Math.min(1, 1 - ent.domainCharge / 100));
    }
    const max = ab.cooldown || 0;
    return max > 0 ? Math.max(0, Math.min(1, cd / max)) : 0;
  }

  updateSlots(player, game) {
    for (let i = 0; i < this.slots.length; i += 1) {
      const slot = this.slots[i];
      const ab = slot.ability;
      const cd = player.cooldowns[i] || 0;
      slot.cd.style.setProperty("--cd", String(this.slotShade(ab, player, game, cd)));
      const needCharge = ab.needsCharge && player.charge < 100 && !game.practice;
      const needDomain = ab.needsDomain && player.domainCharge < 100 && !game.practice;
      const burnout = player.burnout > 0 && !ab.physical;
      const domainLocked = ab.needsDomain && (player.domainLocked || (game.isStoryCombat() && game.storyStage === "borrowed" && game.storyTimer <= 0 && player.charId === "yutaGojo"));
      slot.el.classList.toggle("locked", Boolean(needCharge || needDomain || burnout || domainLocked));
      slot.lock.textContent = burnout ? "熔断" : domainLocked ? "领域封锁" : needCharge ? "需蓄力" : (needDomain ? "需领域" : "");
      slot.el.classList.toggle("ready", cd <= 0.001 && !needCharge && !needDomain && !burnout && !domainLocked);
      if (ab.type === "copy") slot.el.querySelector(".slot-glyph").textContent = COPY_TECHNIQUES[player.copyIndex].label;
    }
  }

  updateDash(player) {
    if (!this.dashSlot) return;
    const cfg = CHARACTERS[player.charId].dash;
    const cd = player.dashCooldown || 0;
    this.dashSlot.cd.style.setProperty("--cd", String(Math.min(1, cd / cfg.cooldown)));
    this.dashSlot.el.classList.toggle("ready", cd <= 0.001);
  }

  updateGaugeGain(player) {
    const prevC = this._pCharge ?? player.charge;
    const prevD = this._pDomain ?? player.domainCharge;
    const dc = player.charge - prevC;
    const dd = player.domainCharge - prevD;
    if (dc > 1) this.showGain("charge", Math.round(dc));
    if (dd > 1) this.showGain("domain", Math.round(dd));
    this._pCharge = player.charge;
    this._pDomain = player.domainCharge;
  }

  showGain(kind, amount) {
    const el = kind === "charge" ? this.dom.chargeGain : this.dom.domainGain;
    const bar = kind === "charge" ? this.dom.chargeFill : this.dom.domainFill;
    const track = bar.parentElement;
    el.textContent = `+${amount}`;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    track.classList.remove("pulse");
    void track.offsetWidth;
    track.classList.add("pulse");
  }

  updateAnnounce(game) {
    if (!game.announcements.length) { this.dom.announce.style.opacity = "0"; return; }
    const a = game.announcements[game.announcements.length - 1];
    const alpha = Math.sin(Math.max(0, Math.min(1, a.life / a.maxLife)) * Math.PI);
    this.dom.announce.textContent = a.text;
    this.dom.announce.style.color = a.color;
    this.dom.announce.style.opacity = String(alpha);
  }

  updateDialogue(game) {
    const d = game.currentDialogue();
    const player = game.player();
    const left = Boolean(d && player && d.speaker === player.charId);
    this.dom.dialogueL.classList.toggle("hidden", !left);
    this.dom.dialogueR.classList.toggle("hidden", !d || left);
    if (!d) return;
    this.applyCharColor(left ? this.dom.dialogueL : this.dom.dialogueR, d.speaker);
    if (left) {
      this.dom.dialogueLSigil.textContent = d.sigil;
      this.dom.dialogueLName.textContent = d.name;
      this.dom.dialogueLText.textContent = d.text;
    } else {
      this.dom.dialogueRSigil.textContent = d.sigil;
      this.dom.dialogueRName.textContent = d.name;
      this.dom.dialogueRText.textContent = d.text;
    }
  }

  updatePracticePanel(game) {
    for (const b of this.dom.practiceChars) {
      b.classList.toggle("active", b.dataset.pchar === game.practiceChar);
    }
    for (const b of this.dom.practiceToggles) {
      const key = b.dataset.ptoggle;
      const on = practiceFlag(game, key);
      b.classList.toggle("on", on);
      b.textContent = on ? "开" : "关";
    }
  }

  updateResult(game) {
    if (game.state !== "ended") return;
    const w = game.winner;
    this.dom.resultKicker.textContent = game.mode === "single" || game.mode === "story" ? `BATTLE COMPLETE · ${DIFFICULTY[game.difficulty].label}` : "BATTLE COMPLETE";
    this.dom.continueStoryBtn.classList.toggle("hidden", !(game.mode === "story" && game.storyStage === "yuta" && w?.isPlayer));
    this.dom.resultTitle.textContent = `${w ? w.name : "平局"} 胜`;
    this.dom.resultTitle.style.color = w ? w.color : "#e8eefc";
    const loser = game.entities.find((e) => !e.alive && !e.summon);
    this.dom.resultReason.textContent = loser ? `${loser.name} 退场` : "战斗结束";
    // winner illustration
    const art = w && WIN_ART[w.charId];
    this.dom.resultArt.classList.toggle("hidden", !art);
    if (art) {
      this.dom.resultArt.alt = `${w.name}胜利插画`;
      const src = `${import.meta.env.BASE_URL}assets/${art}`;
      if (!this.dom.resultArt.src.endsWith(art)) this.dom.resultArt.src = src;
    }
    // 胜利者的台词（五条悟击败宿傩后对宿傩说的话）
    const line = w ? VICTORY_LINES[w.charId] : null;
    this.dom.resultQuote.classList.toggle("hidden", !line);
    if (line) {
      this.applyCharColor(this.dom.resultQuote, w.charId);
      this.dom.resultQuoteText.textContent = line;
    }
  }
}
