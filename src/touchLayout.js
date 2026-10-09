export const TOUCH_LAYOUT_PROFILE_COUNT = 5;
export const TOUCH_LAYOUT_BUTTONS = Object.freeze({
  skill1: '技能 1', skill2: '技能 2', skill3: '技能 3', skill4: '技能 4', skill5: '技能 5',
  lock: '锁定', rise: '升空', fall: '下降', sprint: '疾跑', dash: '冲刺',
  switch: '切换目标', basic: '近战', copy: '切换复制', restore: '强行恢复',
  simpleDomain: '简易领域', page: '换技能'
});

export const touchLayoutOrientation = () => window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
export function touchButtonKey(button) {
  const slot = button.dataset.slot;
  return /^ab\d+$/.test(slot || '') ? `skill${Number(slot.slice(2)) % 5 + 1}`
    : button.classList.contains('skill-page-button') ? 'page' : slot;
}
export function normalizeTouchButtonPositions(value) {
  const result = { portrait: {}, landscape: {} };
  for (const orientation of Object.keys(result)) {
    for (const key of Object.keys(TOUCH_LAYOUT_BUTTONS)) {
      const position = value?.[orientation]?.[key];
      if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) {
        result[orientation][key] = { x: Math.max(0, Math.min(1, position.x)), y: Math.max(0, Math.min(1, position.y)) };
      }
    }
  }
  return result;
}
export function normalizeTouchLayoutProfiles(value) {
  return Array.from({ length: TOUCH_LAYOUT_PROFILE_COUNT }, (_, index) => {
    const profile = Array.isArray(value) ? value[index] : null;
    if (!profile || typeof profile.name !== 'string') return null;
    const move = profile.movePosition;
    return {
      name: profile.name.trim().slice(0, 24) || `方案 ${index + 1}`,
      positions: normalizeTouchButtonPositions(profile.positions),
      movePosition: { x: Number.isFinite(move?.x) ? Math.max(.08, Math.min(.46, move.x)) : .2,
        y: Number.isFinite(move?.y) ? Math.max(.14, Math.min(.86, move.y)) : .76 }
    };
  });
}

// Fit a tile to the nearest free point. Account for its real size, both player
// halves, and optional buttons that appear when a role/page changes.
export function fitTouchButton(desired, width, height, bounds, obstacles) {
  const minX = bounds.left + width / 2, maxX = bounds.right - width / 2;
  const minY = bounds.top + height / 2, maxY = bounds.bottom - height / 2;
  if (minX > maxX || minY > maxY) return null;
  const clampX = x => Math.max(minX, Math.min(maxX, x));
  const clampY = y => Math.max(minY, Math.min(maxY, y));
  const origin = { x: clampX(desired.x), y: clampY(desired.y) };
  const blocked = (x, y) => obstacles.some(r => x + width / 2 > r.left - 3 && x - width / 2 < r.right + 3
    && y + height / 2 > r.top - 3 && y - height / 2 < r.bottom + 3);
  if (!blocked(origin.x, origin.y)) return origin;
  const xs = new Set([origin.x, minX, maxX]), ys = new Set([origin.y, minY, maxY]);
  for (const r of obstacles) {
    xs.add(clampX(r.left - width / 2 - 4)); xs.add(clampX(r.right + width / 2 + 4));
    ys.add(clampY(r.top - height / 2 - 4)); ys.add(clampY(r.bottom + height / 2 + 4));
  }
  let best = null, distance = Infinity;
  for (const x of xs) for (const y of ys) {
    const d = (x - origin.x) ** 2 + (y - origin.y) ** 2;
    if (d >= distance || blocked(x, y)) continue;
    best = { x, y }; distance = d;
  }
  return best;
}
