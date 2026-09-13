import { CHARACTERS, DIFFICULTY } from "./config3d.js";

const SLOT_KEYS = ["LMB", "Q", "E", "R", "T"];
const P2_KEYS = ["U", "O", "P", "[", "]"];
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
};

export class UI3D {
  constructor(game, handlers) {
    this.game = game;
    this.handlers = handlers;
    this.slots = [];
    this.dom = {
      menu: document.querySelector("#menu"),
      difficultyMenu: document.querySelector("#difficultyMenu"),
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
      homeBtn: document.querySelector("#homeBtn"),
      soundBtn: document.querySelector("#soundBtn"),
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
      rotateHint: document.querySelector("#rotateHint"),
      practicePanel: document.querySelector("#practicePanel"),
      splitUI: document.querySelector("#splitUI"),
      p2Bar: document.querySelector("#p2Bar"),
      practiceChars: [...document.querySelectorAll("[data-pchar]")],
      practiceToggles: [...document.querySelectorAll("[data-ptoggle]")],
      themeChips: [...document.querySelectorAll("[data-theme]")],
      ppCombo: document.querySelector("#ppCombo")
    };
    this.bind();
  }

  bind() {
    const h = this.handlers;
    this.dom.modeButtons.forEach((b) => b.addEventListener("click", () => h.onMode(b.dataset.mode)));
    this.dom.difficultyButtons.forEach((b) => b.addEventListener("click", () => {
      this.dom.difficultyButtons.forEach((x) => x.classList.toggle("selected", x === b));
      h.onDifficulty(b.dataset.difficulty);
    }));
    this.dom.difficultyBackBtn.addEventListener("click", () => h.onBack());
    this.dom.homeBtn.addEventListener("click", () => h.onHome());
    this.dom.modeBtn.addEventListener("click", () => h.onHome());
    this.dom.againBtn.addEventListener("click", () => h.onAgain());
    this.dom.resumeBtn.addEventListener("click", () => h.onResume());
    this.dom.restartBtn.addEventListener("click", () => h.onRestart());
    this.dom.pauseHomeBtn.addEventListener("click", () => h.onHome());
    this.dom.soundBtn.addEventListener("click", () => h.onSound(this.dom.soundBtn));
    this.dom.practiceChars.forEach((b) => b.addEventListener("click", () => h.onPracticeChar(b.dataset.pchar)));
    this.dom.themeChips.forEach((b) => b.addEventListener("click", () => h.onTheme(b.dataset.theme)));
    this.dom.practiceToggles.forEach((b) => b.addEventListener("click", () => {
      const key = b.dataset.ptoggle;
      const g = this.game;
      const current = key === "infinite" ? g.practiceInfinite : key === "invincible" ? g.practiceInvincible : g.practiceDummy;
      h.onPracticeOption(key, !current);
    }));
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
      this.dom.cutInImg.src = `/assets/${c.art}.png`;
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
    const cls = charId === "sukuna" ? "char-sukuna" : "char-gojo";
    if (el.dataset.char === cls) return;
    el.dataset.char = cls;
    el.classList.remove("char-gojo", "char-sukuna");
    el.classList.add(cls);
  }

  setThemeChip(charId) {
    for (const b of this.dom.themeChips) b.classList.toggle("active", b.dataset.theme === charId);
  }

  rebuildAbilityBar(charId) {
    const char = CHARACTERS[charId] || CHARACTERS.gojo;
    this.dom.abilityBar.innerHTML = "";
    this.slots = char.abilities.map((ab, i) => {
      const el = document.createElement("div");
      el.className = "ability-slot";
      el.style.color = ab.color;
      el.innerHTML = `
        <span class="slot-key">${SLOT_KEYS[i]}</span>
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
      <span class="slot-key">F</span>
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

  rebuildP2Bar(charId) {
    const char = CHARACTERS[charId] || CHARACTERS.sukuna;
    this.dom.p2Bar.innerHTML = "";
    this.p2Slots = char.abilities.map((ab, i) => {
      const el = document.createElement("div");
      el.className = "p2-slot";
      el.style.color = ab.color;
      el.innerHTML = `<span class="p2-key">${P2_KEYS[i] || ""}</span><svg viewBox="0 0 24 24">${ICONS[ab.id] || ICONS.blue}</svg><b>${ab.label}</b><span class="p2-cd"></span>`;
      this.dom.p2Bar.appendChild(el);
      return { el, cd: el.querySelector(".p2-cd"), ability: ab };
    });
  }

  update(game) {
    const s = game.state;
    this.updateHitBorder(game);
    this.updateCutIn(game);
    this.dom.menu.classList.toggle("hidden", s !== "menu");
    this.dom.difficultyMenu.classList.toggle("hidden", s !== "difficulty");
    this.dom.pauseMenu.classList.toggle("hidden", s !== "paused");
    this.dom.result.classList.toggle("hidden", s !== "ended");
    this.dom.hud.classList.toggle("hidden", s !== "playing" && s !== "ended" && s !== "paused");
    this.dom.hint.classList.toggle("hidden", s !== "playing");

    const player = game.player();
    if (player) {
      if (!this.slots.length || this._charId !== player.charId) {
        this._charId = player.charId;
        this.rebuildAbilityBar(player.charId);
      }
      this.dom.playerName.textContent = player.name;
      this.dom.playerSigil.textContent = player.charId === "gojo" ? "五" : "宿";
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
      this.dom.summonHp.style.transform = `scaleX(${Math.max(0, summon.hp / summon.maxHp)})`;
      this.dom.summonHpText.textContent = Math.ceil(Math.max(0, summon.hp));
    } else {
      this.dom.summonRow.classList.add("hidden");
    }

    this.dom.practicePanel.classList.toggle("hidden", !(game.practice && (s === "playing" || s === "ended")));
    if (game.practice) this.updatePracticePanel(game);

    // split-screen P2 bar (dual)
    const p2 = game.entities.find((e) => e.isPlayer && e !== player);
    const dual = game.mode === "dual";
    this.dom.splitUI.classList.toggle("hidden", !(dual && (s === "playing" || s === "paused" || s === "ended")));
    if (dual && p2) {
      if (this._p2Char !== p2.charId) { this._p2Char = p2.charId; this.rebuildP2Bar(p2.charId); }
      if (this.p2Slots) {
        for (let i = 0; i < this.p2Slots.length; i += 1) {
          const sl = this.p2Slots[i];
          const cd = p2.cooldowns[i] || 0;
          sl.cd.style.setProperty("--cd", String(Math.min(1, cd / (sl.ability.cooldown || 1))));
        }
      }
    }

    this.updateAnnounce(game);
    this.updateDialogue(game);
    this.updateResult(game);

    const modeLabel = game.mode === "single" ? `单人对决 · ${DIFFICULTY[game.difficulty].label}`
      : game.mode === "dual" ? "双人同屏" : "练习终端";
    this.dom.modeStatus.textContent = modeLabel;

    const blocked = window.innerWidth < window.innerHeight && window.innerWidth <= 620;
    this.dom.rotateHint.classList.toggle("hidden", !blocked);
  }

  updateSlots(player, game) {
    for (let i = 0; i < this.slots.length; i += 1) {
      const slot = this.slots[i];
      const ab = slot.ability;
      const cdMax = ab.cooldown || 1;
      const cd = player.cooldowns[i] || 0;
      slot.cd.style.setProperty("--cd", String(Math.min(1, cd / cdMax)));
      const needCharge = ab.needsCharge && player.charge < 100 && !game.practice;
      const needDomain = ab.needsDomain && player.domainCharge < 100 && !game.practice;
      slot.el.classList.toggle("locked", Boolean(needCharge || needDomain));
      slot.lock.textContent = needCharge ? "需蓄力" : (needDomain ? "需领域" : "");
      slot.el.classList.toggle("ready", cd <= 0.001 && !needCharge && !needDomain);
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
      const on = key === "infinite" ? game.practiceInfinite : key === "invincible" ? game.practiceInvincible : game.practiceDummy;
      b.classList.toggle("on", on);
      b.textContent = on ? "开" : "关";
    }
  }

  updateResult(game) {
    if (game.state !== "ended") return;
    const w = game.winner;
    this.dom.resultKicker.textContent = game.mode === "single" ? `BATTLE COMPLETE · ${DIFFICULTY[game.difficulty].label}` : "BATTLE COMPLETE";
    this.dom.resultTitle.textContent = `${w ? w.name : "平局"} 胜`;
    this.dom.resultTitle.style.color = w ? w.color : "#e8eefc";
    const loser = game.entities.find((e) => !e.alive && !e.summon);
    this.dom.resultReason.textContent = loser ? `${loser.name} 退场` : "战斗结束";
  }
}
