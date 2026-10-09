import { DEFAULT_TOUCH_MOVE_POSITION, saveInputSettings } from './inputSettings.js';
import { normalizeTouchButtonPositions, touchButtonKey, touchLayoutOrientation } from './touchLayout.js';

export class TouchLayoutEditor {
  constructor({ game, touch, settings, onChange }) {
    Object.assign(this, { game, touch, settings, onChange });
    const $ = id => document.getElementById(id);
    this.select = $('touchProfile');
    this.name = $('touchProfileName');
    this.status = $('touchLayoutStatus');
    this.applyButton = $('applyTouchProfile');
    this.select.addEventListener('change', () => this.render());
    $('saveTouchProfile').addEventListener('click', () => this.saveProfile());
    this.applyButton.addEventListener('click', () => this.applyProfile());
    $('resetTouchLayout').addEventListener('click', () => this.reset());
    $('editTouchLayout').addEventListener('click', () => this.enter());
    $('finishTouchLayout').addEventListener('click', () => this.finish());
    $('resetTouchLayoutEditor').addEventListener('click', () => this.reset());
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      touch.root.addEventListener(type, event => this.pointer(event), true);
    }
    window.addEventListener('resize', () => {
      this.drag = null;
      $('touchEditorDirection').textContent = touchLayoutOrientation() === 'portrait' ? '竖屏 · 拖动按钮' : '横屏 · 拖动按钮';
    });
    window.addEventListener('keydown', event => {
      if (this.touch.editing && event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.finish(); }
    }, true);
    this.render();
  }

  render() {
    const index = Number(this.select.value) || 0;
    this.select.replaceChildren(...this.settings.touchLayoutProfiles.map((profile, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `${i + 1}. ${profile?.name || '空方案'}`;
      return option;
    }));
    this.select.value = index;
    this.name.value = this.settings.touchLayoutProfiles[index]?.name || `方案 ${index + 1}`;
    this.applyButton.disabled = !this.settings.touchLayoutProfiles[index];
  }

  persist(message) {
    this.status.textContent = saveInputSettings(this.settings) ? message : '本次调整已生效，但浏览器无法保存；关闭页面后可能丢失。';
  }

  update() {
    this.touch.setButtonPositions(this.settings.touchButtonPositions);
    this.touch.setMovePosition(this.settings.touchMovePosition);
    this.onChange();
  }

  saveProfile() {
    const index = Number(this.select.value);
    this.settings.touchLayoutProfiles[index] = {
      name: this.name.value.trim().slice(0, 24) || `方案 ${index + 1}`,
      positions: normalizeTouchButtonPositions(this.settings.touchButtonPositions),
      movePosition: { ...this.settings.touchMovePosition }
    };
    this.render();
    this.persist(`已保存“${this.name.value}”，包含横屏、竖屏按钮位置与摇杆位置。`);
  }

  applyProfile() {
    const profile = this.settings.touchLayoutProfiles[Number(this.select.value)];
    if (!profile) return;
    this.settings.touchButtonPositions = normalizeTouchButtonPositions(profile.positions);
    this.settings.touchMovePosition = { ...profile.movePosition };
    this.update();
    this.persist(`已应用“${profile.name}”。`);
  }

  reset() {
    this.drag = null;
    this.settings.touchButtonPositions = normalizeTouchButtonPositions();
    this.settings.touchMovePosition = { ...DEFAULT_TOUCH_MOVE_POSITION };
    this.update();
    this.persist('横屏、竖屏按钮与摇杆已恢复默认，已保存的方案仍保留。');
  }

  enter() {
    if (this.game.state !== 'settings') return;
    this.previous = { entities: this.game.entities, mode: this.game.mode, practice: this.game.practice };
    this.touch.reset();
    this.game.entities = [this.game.makeEntity('gojo', 0, 6, true), this.game.makeEntity('sukuna', 0, -14, false)];
    this.game.mode = 'single';
    this.game.practice = false;
    this.game.state = 'touchLayout';
    this.touch.editing = true;
    document.body.classList.add('touch-layout-editing');
    document.getElementById('touchEditorDirection').textContent = touchLayoutOrientation() === 'portrait' ? '竖屏 · 拖动按钮' : '横屏 · 拖动按钮';
  }

  finish() {
    if (!this.touch.editing) return;
    this.drag = null;
    this.touch.reset();
    Object.assign(this.game, this.previous, { state: 'settings' });
    this.touch.editing = false;
    document.body.classList.remove('touch-layout-editing');
    this.persist('当前布局已保存。可继续存入方案，或返回游戏使用。');
    document.getElementById('editTouchLayout').focus();
  }

  pointer(event) {
    if (!this.touch.editing) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const root = this.touch.root;
    if (event.type === 'pointerdown') {
      if (this.drag) return;
      const button = event.target.closest('.touch-right button');
      if (!button) return;
      const rect = button.getBoundingClientRect();
      this.drag = { id: event.pointerId, key: touchButtonKey(button), dx: rect.left + rect.width / 2 - event.clientX, dy: rect.top + rect.height / 2 - event.clientY };
      try { root.setPointerCapture(event.pointerId); } catch (_) { /* synthetic pointer */ }
    } else if (this.drag?.id === event.pointerId) {
      if (event.type === 'pointermove') {
        const rect = root.getBoundingClientRect();
        this.settings.touchButtonPositions[touchLayoutOrientation()][this.drag.key] = {
          x: Math.max(0, Math.min(1, (event.clientX + this.drag.dx - rect.left) / rect.width)),
          y: Math.max(0, Math.min(1, (event.clientY + this.drag.dy - rect.top) / rect.height))
        };
        this.update();
      } else {
        this.drag = null;
        this.persist('当前布局已保存。');
      }
    }
  }
}
