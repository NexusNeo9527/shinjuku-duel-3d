// Combat extensions for the periods already represented in the game.
// Chapter references and adaptation limits are recorded in docs/period-skills.md.
const move = (id, label, type, extra = {}) => ({ id, label, type, color: '#bdeeff', core: '#ffffff', cooldown: 8, ...extra });
export function extendPeriodSkills(chars) {
  const add = (id, skills) => chars[id].abilities.push(...skills.map(a => ({ ...a })));
  const blossom = move('fallingBlossom', '落花之情', 'guard', { cooldown: 14, desc: '以咒力迎击实体必中攻击，减轻斩击；不能抵挡无量空处的信息，也不免疫普通体术' });
  const heal = move('gojoHeal', '反转术式 · 恢复', 'heal', { heal: 18, cooldown: 16, needsCharge: true, desc: '恢复身体；与强行恢复熔断术式为不同操作' });
  add('gojo', [{ ...chars.gojoTeen.abilities[2] }, heal, blossom, { ...chars.gojoTeen.abilities[1] }]);
  add('gojo', [move('unboundedPurple', '虚式 · 不限范围茈', 'nova', { damage: 36, radius: 18, needsCharge: true, cooldown: 14, color: '#b05cff', desc: '在自身周围引爆苍与赫，范围内敌人和自己都会受伤；自己的咒力使自身伤害更低' })]);
  // Ch. 227 explicitly says Gojo learned this family art as a child.
  add('gojoTeen', [blossom]); add('gojoAwakened', [blossom, { ...chars.gojoTeen.abilities[1] }]);
  const amp = move('amplification', '领域展延', 'amplification', { physical: true, cooldown: 0, desc: '开关式展延，接触突破无下限；开启时不能同时施展生得术式' });
  const basket = move('wickerBasket', '彌虚葛籠', 'guard', { cooldown: 12, desc: '抵消领域必中，不能挡普通攻击；双手维持时不能攻击' });
  const sukunaHeal = move('sukunaHeal', '反转术式', 'heal', { heal: 15, cooldown: 18, needsCharge: true, color: '#ff7583' });
  add('sukuna', [sukunaHeal, amp, basket]);
  add('sukuna', [
    move('maxElephantWater', '满象 · 水流射击', 'beam', { damage: 18, length: 30, width: 1, power: 2, life: .4, cooldown: 6, color: '#9edfff', desc: '借满象的水模拟穿血，并非赤血操术' }),
    move('rabbitEscape', '脱兔 · 掩护', 'flyheads', { cooldown: 12, color: '#eeeeee', desc: '兔群遮蔽视线与锁定，制造移动机会' }),
    move('agito', '嵌合兽 · 颚吐', 'summon', { cooldown: 28, hp: 60, life: 24, speed: 7, color: '#dfcfb5', desc: '独立于魔虚罗的融合式神，近身协战并恢复自身；仅伏黑受肉时期持有' })
  ]);
  chars.agito = { id: 'agito', name: '嵌合兽 · 颚吐', color: '#dfcfb5', aura: '#dfcfb5', hp: 60, height: 1.85, speed: 7, abilities: [], combos: [], dash: { speed: 26, duration: .2, cooldown: 1.1 } };
  add('sukunaRaid', [sukunaHeal, amp, basket]);
  add('sukunaStory1', [amp, { ...chars.sukunaRaid.abilities[3] }]);
  // Preserve the first five chapter-specific inputs and the automatic domain clash.
  add('sukunaStory2', [sukunaHeal, { ...chars.sukunaRaid.abilities[0] }, { ...chars.sukunaRaid.abilities[1] }, basket]);
  add('sukunaStory2', [{ ...chars.sukunaRaid.abilities[3] }]);
  add('sukuna', [{ ...chars.sukunaRaid.abilities[3], requiresWorldCut: true, desc: '魔虚罗示范空间斩后才能使用；本作以魔虚罗三次近身命中表示示范完成，次数为改编' }]);
  add('yutaGojo', [{ ...chars.gojo.abilities[1] }, { ...heal, id: 'borrowedHeal', label: '反转术式' }]);
  add('higuruma', [{ ...chars.higurumaCulling.abilities[1] }, { ...chars.higurumaCulling.abilities[2] }]);
  add('higurumaCulling', [{ ...chars.higuruma.abilities[1] }]);
  add('tojiRematch', [{ ...chars.toji.abilities[2] }]);
  const tools = [
    move('soulKatana', '释魂刀', 'melee', { damage: 17, range: 3.6, cooldown: 2.6, physical: true, soulDamage: true, color: '#d8dce3', desc: '绕过肉体硬度伤及灵魂；不能靠普通肉体修复恢复' }),
    move('handgun', '手枪', 'orb', { damage: 8, speed: 45, radius: .2, life: 1.2, power: 1, cooldown: 1.5, physical: true, color: '#d8dce3' })
  ];
  add('toji', tools); add('tojiRematch', tools);
  // These are already learned in these periods; no later Shrine/Domain for Yuji.
  add('yujiCulling', [{ ...chars.yujiShibuya.abilities[1] }, { ...chars.yujiShibuya.abilities[2] }]);
  add('yujiRaid', [{ ...chars.yujiShibuya.abilities[1] }, { ...chars.yujiShibuya.abilities[2] }, { ...chars.yujiShibuya.abilities[4] }]);
  add('mahito', [move('soulRestore', '无为转变 · 修复肉体', 'heal', { heal: 16, requiresTechnique: true, cooldown: 16, color: '#b5a3d8', desc: '用术式重塑肉体，不是反转术式；灵魂受伤不能靠这项能力恢复' })]);
  chars.todoShibuya.abilities = [
    move('todoKick', '咒力体术 · 踢击', 'melee', { damage: 11, range: 3.4, cooldown: 1, physical: true, canBlackFlash: true, color: '#e6c780' }),
    move('boogieWoogie', '不义游戏 · 换位', 'swap', { cooldown: 5, requiresTechnique: true, color: '#e6c780', desc: '与有咒力的目标交换位置；天与咒缚零咒力目标不可交换' })
  ];
  chars.todoInjured.abilities = [
    { ...chars.todoShibuya.abilities[0] },
    move('todoFeint', '最后的拍手 · 佯攻', 'feint', { cooldown: 0, physical: true, maxUses: 1, color: '#e6c780', desc: '最终战仅能佯装拍手一次，制造破绽；不实际交换' })
  ];
}

export function extendCopies(copies) {
  copies.push(
    move('copiedCleave', '复制 · 捌', 'melee', { damage: 17, range: 3.4, cooldown: 3.5, requiresTechnique: true, color: '#d9c8ff' }),
    move('gWarstaff', 'G战杖 · 未来视', 'melee', { damage: 6, range: 3.4, cooldown: 7, requiresTechnique: true, color: '#d9c8ff', desc: '先以刀伤目标取得血液，命中后短暂预判该目标；未命中不获得效果' }),
    move('dhruvOrbit', '德鲁夫 · 式神轨迹', 'orbit', { damage: 9, radius: 4, life: 4, cooldown: 8, requiresTechnique: true, color: '#d9c8ff', desc: '式神围绕目标形成轨迹结界；目标穿越轨迹时受斩击' })
  );
}
