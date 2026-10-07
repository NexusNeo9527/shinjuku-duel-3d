// Canon: chapters 164–166, 244–245. Other matchups are explicitly hypothetical.
export const COURT_RESPONSES = ['deny', 'confess', 'silence'];
export const RESPONSE_LABELS = { deny: '否认', confess: '自白', silence: '默秘' };
export function caseForDefendant(id, { round = 1, culling = false } = {}) {
  if (id.startsWith('sukuna')) return { id: 'shibuya', charge: '涩谷大量杀人案', evidence: '宿傩控制肉体，展开伏魔御厨子并造成大量人员死亡', responsibility: 'proven', death: true, canon: true, chapter: '244–245' };
  if (id.startsWith('yuji')) {
    if (culling && round === 1) return { id: 'pachinko', charge: '未成年进入柏青哥店', evidence: '柏青哥店内的监控记录；证据证明进入店内', responsibility: 'proven', death: false, canon: true, chapter: '164' };
    return { id: 'shibuya-vessel', charge: '涩谷大量杀人案', evidence: '实际杀人者是控制肉体的宿傩，虎杖当时无法控制身体', responsibility: 'possession', death: true, canon: culling, chapter: '165–166' };
  }
  if (id.startsWith('mahito')) return { id: 'transfiguration', charge: '故意杀害、改造人类（自由对战推演）', evidence: '真人以无为转变伤害人类；审判能否适用于咒灵未获原著确认', responsibility: 'proven', death: true, canon: false, chapter: '27–31、120–130' };
  if (id === 'kashimo') return { id: 'colony', charge: '死灭回游中杀害泳者（自由对战推演）', evidence: '泳者死亡及积分记录；原著未展示日车对此案的裁判', responsibility: 'proven', death: true, canon: false, chapter: '158、184–190' };
  return { id: 'unproven', charge: '缺少可确认的指控', evidence: '未配置足以成立的原著罪行证据，不把战斗或正当防卫直接认定为犯罪', responsibility: 'unproven', death: false, canon: false };
}
export function decideVerdict(caseFile, response) {
  const guilty = caseFile.responsibility === 'proven' || (caseFile.responsibility === 'possession' && response === 'confess');
  return { guilty, death: guilty && caseFile.death, response, label: guilty ? caseFile.death ? '有罪 · 没收与死刑' : '有罪 · 没收' : '无罪 · 不予没收' };
}
export function confiscationFor(target, character) {
  if (target.kamutoke) return { kind: 'tool', id: 'kamutoke', label: '神武解' };
  if (character.cursedEnergy === 0) return { kind: 'none', label: '无可没收咒力' };
  if (target.charId.startsWith('yuji')) return { kind: 'energy', label: '咒力' }; // All current Yuji loadouts precede Shrine awakening.
  return { kind: 'technique', label: '生得术式' };
}
const TECHNIQUE_MELEE = new Set(['slash', 'cleave', 'cleaveRush', 'soulTouch', 'soulBlade', 'soulHeavy', 'soulRush', 'soulIsomer', 'gavel', 'gavelExtend', 'gavelHeavy', 'executionerSword', 'cullingExecution', 'todoSupport']);
export function confiscationLocks(entity, ability) {
  if (entity.confiscatedTool === ability.id) return true;
  // RCT and anti-domain barriers use CE, but are not the confiscated innate technique.
  if (entity.techniqueConfiscated) return ability.requiresTechnique ?? (TECHNIQUE_MELEE.has(ability.id) || (!ability.physical && ability.id !== 'kashimoDischarge' && !['heal', 'guard', 'appeal'].includes(ability.type)));
  if (entity.cursedEnergyConfiscated) return TECHNIQUE_MELEE.has(ability.id) || (!ability.physical && ability.type !== 'appeal') || ability.id === 'yujiBlackFlash';
  return false;
}
