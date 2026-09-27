// Stylized choreography. Seconds use the simulation clock so pause/restart are safe.
const pose = (armR, foreR, armL, foreL, torso = [0, 0, 0], extra = {}) =>
  ({ armR, foreR, armL, foreL, torso, ...extra });
const ready = pose([-.3, 0, -.25], [-1.1, 0, 0], [-.3, 0, .25], [-1.1, 0, 0]);
const clasp = pose([-.55, 0, -.48], [-1.9, 0, -.35], [-.55, 0, .48], [-1.9, 0, .35]);
const reach = pose([-1.48, 0, -.12], [-.08, 0, 0], [-.2, 0, .35], [-1.1, 0, 0], [.08, -.16, 0]);
const swordUp = pose([-2.4, -.25, -.35], [-.8, 0, 0], [-.4, 0, .3], [-1, 0, 0], [-.08, -.3, -.07]);
const swordDown = pose([-.75, .5, .45], [-.12, 0, 0], [-.25, 0, .35], [-1.2, 0, 0], [.18, .45, .08]);
const clip = (duration, frames, hands = {}) => ({ duration, frames, hands });

export const COMBAT_MOTIONS = {
  punch: clip(.42, [[0, ready], [.12, reach], [.28, reach], [1, ready]], { R: 'fist', L: 'fist' }),
  katana: clip(.52, [[0, swordUp], [.28, swordDown], [.55, swordDown], [1, ready]], { R: 'grip', L: 'fist' }),
  slash: clip(.44, [[0, pose([-1.15, -.7, -.65], [-.8, 0, 0], [-.2, 0, .25], [-.7, 0, 0], [0, -.3, 0])],
    [.22, pose([-1.2, .55, .6], [-.05, 0, 0], [-.2, 0, .25], [-.7, 0, 0], [.08, .3, 0])], [1, ready]], { R: 'point', L: 'fist' }),
  cleave: clip(.62, [[0, swordUp], [.25, reach], [.55, reach], [1, ready]], { R: 'open', L: 'fist' }),
  cleaveRush: clip(.85, [[0, swordUp], [.18, swordDown], [.35, swordUp], [.53, swordDown], [.7, reach], [1, ready]], { R: 'open', L: 'open' }),
  blue: clip(.44, [[0, reach], [.28, pose([-1.05, -.2, -.3], [-1.1, 0, 0], [-.2, 0, .3], [-.5, 0, 0], [0, -.18, 0])], [1, ready]], { R: 'point', L: 'open' }),
  red: clip(.58, [[0, pose([-.75, 0, -.15], [-1.5, 0, 0], [-.25, 0, .3], [-.7, 0, 0])], [.22, reach], [.58, reach], [1, ready]], { R: 'point', L: 'fist' }),
  purple: clip(1.05, [[0, clasp], [.24, clasp], [.42, reach], [.76, reach], [1, ready]], { R: 'point', L: 'open' }),
  void: clip(1.25, [[0, ready], [.16, pose([-.45, 0, -.15], [-2.5, 0, 0], [0, 0, .15], [-.25, 0, 0])],
    [.86, pose([-.45, 0, -.15], [-2.5, 0, 0], [0, 0, .15], [-.25, 0, 0])], [1, ready]], { R: 'cross', L: 'open' }),
  shrine: clip(1.3, [[0, ready], [.14, clasp], [.86, clasp], [1, ready]], { R: 'seal', L: 'seal' }),
  authenticLove: clip(1.3, [[0, swordUp], [.2, clasp], [.85, clasp], [1, ready]], { R: 'seal', L: 'seal' }),
  flame: clip(1.1, [[0, pose([-1.5, -.6, -.2], [-2.1, 0, 0], [-1.5, 0, .1], [-.12, 0, 0], [0, -.65, 0])],
    [.3, pose([-1.5, -.6, -.2], [-2.1, 0, 0], [-1.5, 0, .1], [-.12, 0, 0], [0, -.65, 0])],
    [.46, pose([-1.4, -.8, -.6], [-.55, 0, 0], [-1.5, 0, .1], [-.12, 0, 0], [0, -.4, 0])], [1, ready]], { R: 'grip', L: 'point' }),
  mahoraga: clip(1.1, [[0, ready], [.2, clasp], [.72, clasp], [1, ready]], { R: 'seal', L: 'seal' }),
  rika: clip(.95, [[0, ready], [.22, pose([-1.2, 0, -.8], [-.35, 0, 0], [-.7, 0, .65], [-1.2, 0, 0])], [1, ready]], { R: 'open', L: 'open' }),
  cursedSpeech: clip(.65, [[0, ready], [.18, pose([-.5, 0, -.2], [-2.25, 0, 0], [-.2, 0, .25], [-.7, 0, 0])], [.7, ready], [1, ready]], { R: 'open', L: 'grip' }),
  skyBreak: clip(.65, [[0, swordUp], [.25, reach], [.62, reach], [1, ready]], { R: 'fist', L: 'open' }),
  jacobsLadder: clip(1.15, [[0, clasp], [.28, pose([-2.6, 0, -.45], [-.2, 0, 0], [-2.6, 0, .45], [-.2, 0, 0])], [.8, clasp], [1, ready]], { R: 'open', L: 'open' }),
  heal: clip(.95, [[0, ready], [.2, pose([-.4, 0, -.5], [-1.9, 0, -.4], [-.4, 0, .5], [-1.9, 0, .4], [.1, 0, 0])], [.8, clasp], [1, ready]], { R: 'open', L: 'open' }),
  wickerBasket: clip(.8, [[0, ready], [.2, clasp], [1, clasp]], { R: 'seal', L: 'seal' }),
  mahoragaSlash: clip(.7, [[0, swordUp], [.26, swordDown], [.6, swordDown], [1, ready]]),
  rikaStrike: clip(.65, [[0, pose([-2.3, 0, -.55], [-.5, 0, 0], [-2.3, 0, .55], [-.5, 0, 0], [-.1, 0, 0])],
    [.28, pose([-1, 0, .2], [-.15, 0, 0], [-1, 0, -.2], [-.15, 0, 0], [.25, 0, 0])], [1, ready]])
};

export function beginCombatMotion(entity, abilityId, time) {
  let id = abilityId;
  if (id.endsWith('Heal')) id = 'heal';
  if (id === 'basicAttack' || id === 'mahoragaContact') {
    id = entity.charId === 'yuta' ? 'katana' : entity.charId === 'rika' ? 'rikaStrike'
      : entity.charId === 'mahoraga' ? 'mahoragaSlash' : 'punch';
  }
  if (!COMBAT_MOTIONS[id]) return;
  entity.actionSequence = (entity.actionSequence || 0) + 1;
  entity.combatAction = { id, startedAt: time, yaw: entity.yaw, sequence: entity.actionSequence };
}

const smooth = x => x * x * (3 - 2 * x);

export function sampleCombatMotion(action, time) {
  const motion = action && COMBAT_MOTIONS[action.id];
  if (!motion) return null;
  const age = time - action.startedAt;
  if (age < 0 || age >= motion.duration) return null;
  const t = age / motion.duration;
  let i = 1;
  while (i < motion.frames.length - 1 && motion.frames[i][0] < t) i++;
  const [a, from] = motion.frames[i - 1], [b, to] = motion.frames[i];
  const blend = smooth((t - a) / (b - a));
  const joints = {};
  for (const name of new Set([...Object.keys(from), ...Object.keys(to)])) {
    joints[name] = (from[name] || [0, 0, 0]).map((v, axis) => v + ((to[name]?.[axis] || 0) - v) * blend);
  }
  // Alternate bare-handed jabs without swapping a sword into the wrong hand.
  if (action.id === 'punch' && action.sequence % 2 === 0) {
    for (const pair of [['armL', 'armR'], ['foreL', 'foreR']]) {
      const [l, r] = pair;
      [joints[l], joints[r]] = [joints[r], joints[l]];
      for (const name of pair) joints[name] = joints[name].map((v, axis) => axis ? -v : v);
    }
    joints.torso[1] *= -1;
  }
  const weight = Math.min(smooth(Math.min(1, age / .045)), smooth(Math.min(1, (motion.duration - age) / .14)));
  return { joints, weight, hands: motion.hands };
}

export const GUARD_POSE = clasp;
