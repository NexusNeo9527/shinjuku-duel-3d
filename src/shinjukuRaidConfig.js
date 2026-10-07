// Manga 237–238 and 244–248. Numeric values and charge thresholds are game tuning.
const move = (id, label, type, extra = {}) => ({ id, label, type, color: '#9ee9ee', core: '#ffffff', cooldown: 2, ...extra });
const fighter = (id, name, color, abilities) => ({ id, name, color, aura: color, hp: 100, speed: 8.5, height: 1.85, grounded: true, combos: [], dash: { speed: 28, duration: .2, cooldown: 1.1, invuln: .25 }, abilities });
export const RAID_CHARACTERS = {
  yujiCulling: fighter('yujiCulling', '虎杖悠仁 · 东京第一结界', '#ff867e', [
    move('yujiBodyPunch', '肉体 · 连拳', 'melee', { damage: 9, range: 3.4, physical: true, cooldown: .7, color: '#ff867e', desc: '咒力被没收后，依靠身体能力继续战斗' }),
    move('yujiBodyHeavy', '肉体 · 重击', 'melee', { damage: 16, range: 3.2, physical: true, cooldown: 2.5, color: '#ff867e' }),
    move('bodyGuard', '体术防守', 'guard', { physical: true, cooldown: 5, color: '#ff867e' }),
    move('appealCourt', '要求再审', 'appeal', { physical: true, cooldown: 0, color: '#e9bc70', desc: '一次再审涩谷事件；虎杖认罪后，日车察觉真正责任在宿傩并撤回处刑剑。无需再审也可击败日车' })
  ]),
  higurumaCulling: fighter('higurumaCulling', '日车宽见 · 东京第一结界', '#e9bc70', [
    move('gavel', '法槌 · 挥击', 'melee', { damage: 10, range: 4, physical: true, cooldown: 1, color: '#e9bc70' }),
    move('gavelExtend', '法槌 · 延伸', 'melee', { damage: 12, range: 8, physical: true, cooldown: 3.5, color: '#e9bc70' }),
    move('gavelHeavy', '法槌 · 巨大化', 'melee', { damage: 19, range: 4.6, physical: true, cooldown: 4, color: '#e9bc70' }),
    move('cullingExecution', '处刑人之剑', 'execution', { range: 2.8, physical: true, cooldown: 4, windup: .9, color: '#ffd685', desc: '再审死刑判决后获得；日车察觉虎杖并非真正凶手后收回' }),
    move('bodyGuard', '法槌 · 格挡', 'guard', { physical: true, cooldown: 6, color: '#e9bc70' })
  ]),
  kashimo: fighter('kashimo', '鹿紫云一 · 幻兽琥珀', '#9ee9ee', [
    move('kashimoPunch', '带电体术', 'melee', { damage: 9, range: 3.5, physical: true, cooldown: .7, desc: '命中对手蓄积电荷；普通体术也能击败敌人' }),
    move('amberSound', '幻兽琥珀 · 声波', 'beam', { damage: 14, length: 24, width: 3, life: .35, power: 2, knock: 5, cooldown: 3, desc: '首次使用不可逆发动幻兽琥珀，每战一次；90秒后肉体崩解，时长为游戏改编' }),
    move('kashimoDischarge', '电荷分离 · 放电', 'discharge', { damage: 26, cooldown: 4, desc: '带电体术命中三次后放电；蓄积次数为游戏改编' }),
    move('amberRay', '幻兽琥珀 · 电磁波', 'beam', { damage: 22, length: 38, width: 1.8, life: .4, power: 3, knock: 8, cooldown: 5 }),
    move('wickerBasket', '彌虚葛籠', 'guard', { cooldown: 9, desc: '鹿紫云掌握的反领域手段；此战宿傩尚未恢复领域' })
  ]),
  higuruma: fighter('higuruma', '日车宽见', '#e9bc70', [
    move('gavel', '法槌', 'melee', { damage: 10, range: 4, physical: true, cooldown: .8, color: '#e9bc70' }),
    move('sentencing', '诛伏赐死 · 审判', 'sentencing', { cooldown: 0, desc: '按被告与证据审判，禁止暴力；有罪时优先没收咒具，其次术式，无术式则没收咒力；死刑才获得处刑剑', color: '#e9bc70' }),
    move('executionerSword', '处刑人之剑', 'execution', { range: 2.8, cooldown: 5, windup: .65, physical: true, desc: '获得死刑判决后可用，命中指定死刑被告即处决；无罪或仅没收时不可用', color: '#ffd685' }),
    move('higurumaAmplification', '领域展延', 'guard', { cooldown: 7, desc: '短暂削弱术式伤害；期间不能使用法槌或处刑人之剑', color: '#e9bc70' }),
    move('higurumaHeal', '反转术式', 'heal', { heal: 16, cooldown: 18, needsCharge: true, desc: '日车在本次交战中领悟的恢复能力', color: '#e9bc70' })
  ]),
  yujiRaid: fighter('yujiRaid', '虎杖悠仁 · 新宿协战', '#ff867e', [
    move('yujiSoulPunch', '灵魂边界 · 拳击', 'melee', { damage: 7, range: 3.4, physical: true, cooldown: 1.3, desc: '攻击宿傩与伏黑的灵魂边界；此阶段不使用后期觉醒的御厨子或领域', color: '#ff867e' }),
    move('yujiRaidHeal', '反转术式 · 恢复', 'heal', { heal: 14, cooldown: 16, needsCharge: true, maxUses: 3, desc: '新宿时期已掌握反转术式；每战三次、恢复量和冷却为游戏改编', color: '#8dffd4' })
  ]),
  sukunaRaid: fighter('sukunaRaid', '宿傩 · 完全受肉', '#ff7583', [
    move('slash', '解', 'orb', { shape: 'blade', damage: 11, speed: 27, radius: .6, life: 2, power: 1, knock: 4, cooldown: 1.5, color: '#ff7583' }),
    move('cleave', '捌 · 接触斩击', 'melee', { damage: 15, range: 3.5, physical: true, cooldown: 1.6, color: '#ff7583' }),
    move('kamutoke', '神武解 · 雷击', 'beam', { damage: 19, length: 32, width: 2, life: .3, power: 2, knock: 6, cooldown: 4, color: '#b0ddff', desc: '对鹿紫云无效；日车审判后被没收' }),
    move('worldDismantle', '扩张术式对象 · 解', 'raidWindup', { damage: 29, length: 46, width: 2.2, life: .35, power: 3, knock: 10, cooldown: 8, windup: 1.15, color: '#ff7583', desc: '手印、咏唱并指定方向后斩击；准备期间可以闪避' }),
    move('bodyGuard', '四臂体术 · 防守', 'guard', { physical: true, cooldown: 7, color: '#ff7583' })
  ])
};
RAID_CHARACTERS.yujiCulling.assetId = 'yujiRaid';
RAID_CHARACTERS.higurumaCulling.assetId = 'higuruma';
export const RAID_STAGES = {
  cullingTrial: { label: '死灭回游 · 虎杖对日车', ally: 'yujiCulling', enemy: 'higurumaCulling', canon: true, raid: true, culling: true, allyOnly: true,
    intro: '东京第一结界的剧场内，虎杖请日车使用100分添加规则。交涉失败，日车展开诛伏赐死；第一审没收虎杖的咒力，虎杖依靠肉体迎战法槌。',
    objective: '击败日车即可通关。咒力没收后仍可用肉体攻击与防守；可要求一次再审，不要求特定终结或严格复现原著结果。' },
  kashimoDuel: { label: '新宿 · 雷神挑战', ally: 'kashimo', enemy: 'sukunaRaid', next: 'higurumaRaid', canon: true, raid: true,
    intro: '五条倒下后，鹿紫云独自迎战。里梅送来万留下的神武解；鹿紫云发动幻兽琥珀，宿傩完成受肉。此关从四臂宿傩迎战开始。',
    objective: '幻兽琥珀已不可逆发动，90秒内击败宿傩，超时肉体崩解（时长为游戏改编）。命中蓄积电荷后可放电；神武解雷击对鹿紫云无效。' },
  higurumaRaid: { label: '新宿 · 日车、虎杖对宿傩', ally: 'higuruma', enemy: 'sukunaRaid', next: 'yuta', canon: true, raid: true, allyOnly: true,
    intro: '日车与虎杖接续迎战宿傩。虎杖主动协战，日车可再审涩谷屠杀案；没收会优先拿走神武解，宿傩的御厨子仍可使用。',
    objective: '击败宿傩即可通关。再审没收神武解并获得处刑人之剑；虎杖协战，法槌与普通攻击同样能够获胜。' }
};
