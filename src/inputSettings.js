const STORAGE_KEY = "sd3d.input.settings.v1";

export const DEFAULT_TOUCH_MOVE_POSITION = Object.freeze({ x: 0.2, y: 0.76 });

export const BINDINGS = [
  { id: "p1.up", player: "玩家 1", group: "移动", label: "向前", defaultCode: "KeyW" },
  { id: "p1.down", player: "玩家 1", group: "移动", label: "向后", defaultCode: "KeyS" },
  { id: "p1.left", player: "玩家 1", group: "移动", label: "向左", defaultCode: "KeyA" },
  { id: "p1.right", player: "玩家 1", group: "移动", label: "向右", defaultCode: "KeyD" },
  { id: "p1.sprint", player: "玩家 1", group: "移动", label: "疾跑", defaultCode: "ShiftLeft" },
  { id: "p1.ascend", player: "玩家 1", group: "移动", label: "升空", defaultCode: "Space" },
  { id: "p1.descend", player: "玩家 1", group: "移动", label: "下降", defaultCode: "KeyX" },
  { id: "p1.cast1", player: "玩家 1", group: "术式", label: "术式 1", defaultCode: "Digit1" },
  { id: "p1.cast2", player: "玩家 1", group: "术式", label: "术式 2", defaultCode: "KeyQ" },
  { id: "p1.cast3", player: "玩家 1", group: "术式", label: "术式 3", defaultCode: "KeyE" },
  { id: "p1.cast4", player: "玩家 1", group: "术式", label: "术式 4", defaultCode: "KeyR" },
  { id: "p1.cast5", player: "玩家 1", group: "术式", label: "术式 5", defaultCode: "KeyT" },
  { id: "p1.copy", player: "玩家 1", group: "战斗", label: "切换复制术式", defaultCode: "KeyG" },
  { id: "p1.restore", player: "玩家 1", group: "战斗", label: "强行恢复术式", defaultCode: "KeyH" },
  { id: "p1.melee", player: "玩家 1", group: "战斗", label: "近身攻击", defaultCode: "KeyV" },
  { id: "p1.lock", player: "玩家 1", group: "战斗", label: "切换目标", defaultCode: "AltLeft" },
  { id: "p1.dash", player: "玩家 1", group: "战斗", label: "冲刺", defaultCode: "KeyF" },
  { id: "p2.up", player: "玩家 2", group: "移动", label: "向前", defaultCode: "KeyI" },
  { id: "p2.down", player: "玩家 2", group: "移动", label: "向后", defaultCode: "KeyK" },
  { id: "p2.left", player: "玩家 2", group: "移动", label: "向左", defaultCode: "KeyJ" },
  { id: "p2.right", player: "玩家 2", group: "移动", label: "向右", defaultCode: "KeyL" },
  { id: "p2.sprint", player: "玩家 2", group: "移动", label: "疾跑", defaultCode: "ShiftRight" },
  { id: "p2.ascend", player: "玩家 2", group: "移动", label: "升空", defaultCode: "KeyN" },
  { id: "p2.descend", player: "玩家 2", group: "移动", label: "下降", defaultCode: "KeyM" },
  { id: "p2.cast1", player: "玩家 2", group: "术式", label: "术式 1", defaultCode: "KeyU" },
  { id: "p2.cast2", player: "玩家 2", group: "术式", label: "术式 2", defaultCode: "KeyO" },
  { id: "p2.cast3", player: "玩家 2", group: "术式", label: "术式 3", defaultCode: "KeyP" },
  { id: "p2.cast4", player: "玩家 2", group: "术式", label: "术式 4", defaultCode: "BracketLeft" },
  { id: "p2.cast5", player: "玩家 2", group: "术式", label: "术式 5", defaultCode: "BracketRight" },
  { id: "p2.restore", player: "玩家 2", group: "战斗", label: "强行恢复术式", defaultCode: "Quote" },
  { id: "p2.melee", player: "玩家 2", group: "战斗", label: "近身攻击", defaultCode: "Semicolon" },
  { id: "p2.dash", player: "玩家 2", group: "战斗", label: "冲刺", defaultCode: "KeyB" }
];

export function loadInputSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const defaults = Object.fromEntries(BINDINGS.map((binding) => [binding.id, binding.defaultCode]));
    const candidates = Object.fromEntries(BINDINGS.map((binding) => {
      const code = saved.bindings?.[binding.id];
      return [binding.id, typeof code === "string" && code && code !== "Escape" ? code : binding.defaultCode];
    }));
    const codes = Object.values(candidates);
    const bindings = new Set(codes).size === codes.length ? candidates : defaults;
    const pos = saved.touchMovePosition;
    return {
      bindings,
      touchMovePosition: pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)
        ? clampTouchMovePosition(pos)
        : { ...DEFAULT_TOUCH_MOVE_POSITION }
    };
  } catch (_) {
    return {
      bindings: Object.fromEntries(BINDINGS.map((binding) => [binding.id, binding.defaultCode])),
      touchMovePosition: { ...DEFAULT_TOUCH_MOVE_POSITION }
    };
  }
}

export function saveInputSettings(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) { /* storage unavailable */ }
}

export function clampTouchMovePosition(position) {
  return {
    x: Math.max(0.08, Math.min(0.46, position.x)),
    y: Math.max(0.14, Math.min(0.86, position.y))
  };
}

export function displayKey(code) {
  const labels = {
    Space: "空格", ShiftLeft: "左 Shift", ShiftRight: "右 Shift", AltLeft: "左 Alt", AltRight: "右 Alt",
    BracketLeft: "[", BracketRight: "]", Semicolon: ";", Quote: "'", Backslash: "\\", Comma: ",", Period: ".", Slash: "/",
    Backquote: "`", Minus: "-", Equal: "=", Escape: "Esc"
  };
  if (labels[code]) return labels[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `数字键盘 ${code.slice(6)}`;
  return code.replace(/([A-Z])/g, " $1").trim();
}
