// Chapters 127–132 / anime 44–46. Damage, cooldowns and input windows are game tuning.
const move = (id, label, type, extra = {}) => ({ id, label, type, color: "#ff867e", cooldown: 2, ...extra });
export const SHIBUYA_CHARACTERS = {
  yujiShibuya: { name: "虎杖悠仁 · 涩谷", color: "#ff867e", aura: "#dc514e", hp: 100, speed: 9, grounded: true, combos: [], abilities: [
    move("yujiPunch", "咒力连拳", "melee", { damage: 9, range: 3.4, cooldown: .65, physical: true, desc: "近身攻击，虎杖能够打击真人的灵魂" }),
    move("divergentFist", "逕庭拳", "melee", { damage: 4, range: 3.4, cooldown: 3, physical: true, desc: "先打肉体，再以延迟咒力制造破绽；命中开启黑闪机会" }),
    move("yujiBlackFlash", "黑闪 · 抓住破绽", "melee", { damage: 30, range: 3.6, cooldown: 4, physical: true, desc: "逕庭拳延迟命中后2秒内近身发动；输入窗口为游戏改编" }),
    move("todoSupport", "东堂 · 支援", "support", { cooldown: 9, physical: true, desc: "共斗时拍手换位；最终战仅剩一次佯装拍手，不发生交换" }),
    move("yujiGuard", "体术防守", "guard", { cooldown: 5, physical: true, desc: "短暂防守；涩谷时期虎杖没有领域和反转术式" })
  ] },
  mahito: { name: "真人", color: "#b5a3d8", aura: "#776589", hp: 100, speed: 8, grounded: true, combos: [], abilities: [
    move("soulTouch", "无为转变 · 接触", "melee", { damage: 12, range: 3.2, cooldown: 1.3, color: "#b5a3d8", desc: "触及灵魂；虎杖体内宿傩使真人无法随意改造他" }),
    move("soulBlade", "肉体变形 · 刃", "melee", { damage: 14, range: 5, cooldown: 2.4, physical: true, color: "#b5a3d8" }),
    move("soulIsomer", "多重魂 · 拔体", "orb", { damage: 15, power: 1, speed: 22, radius: 1.1, life: 2, knock: 4, cooldown: 5, color: "#b5a3d8" }),
    move("mahitoDomain", "自闭圆顿裹", "soulDomain", { cooldown: 35, desc: "必中无为转变，无需触碰；触及宿傩灵魂会遭反击。涩谷剧情采用0.2秒展开", color: "#b5a3d8" }),
    move("mahitoGuard", "灵魂维持", "guard", { cooldown: 6, color: "#b5a3d8" })
  ] },
  mahitoFinal: { name: "真人 · 遍杀即灵体", color: "#b5a3d8", aura: "#776589", hp: 100, speed: 8.4, grounded: true, combos: [], abilities: [
    move("soulBlade", "肘刃斩击", "melee", { damage: 13, range: 4.3, cooldown: 1, physical: true, color: "#b5a3d8" }),
    move("soulHeavy", "强化肉体 · 重击", "melee", { damage: 18, range: 3.4, cooldown: 2.2, physical: true, color: "#b5a3d8" }),
    move("soulRush", "贴身追击", "melee", { damage: 12, range: 4, cooldown: 2.8, physical: true, color: "#b5a3d8" }),
    move("mahitoGuard", "硬化防守", "guard", { cooldown: 6, physical: true, color: "#b5a3d8" })
  ] },
  todoShibuya: { name: "东堂葵", color: "#e6c780", aura: "#bd994d", hp: 100, speed: 8, grounded: true, abilities: [] }
};
SHIBUYA_CHARACTERS.todoInjured = { ...SHIBUYA_CHARACTERS.todoShibuya, name: "东堂葵 · 左手损伤" };
for (const [id, character] of Object.entries(SHIBUYA_CHARACTERS)) {
  character.id = id;
  character.height = 1.85;
  character.dash = { speed: 26, duration: .2, cooldown: 1.1, invuln: .25 };
}
export const SHIBUYA_STAGES = {
  shibuyaClash: { label: "涩谷 · 东堂共斗", ally: "yujiShibuya", enemy: "mahito", next: "shibuyaFinal", canon: true, shibuya: true, sceneIntro: "东堂赶到，帮助虎杖重振；两人与真人战至涩谷地面废墟。",
    intro: "钉崎遭真人重创，虎杖陷入绝望。东堂与新田赶到，帮助虎杖重新站起来。两人与真人的战斗来到涩谷地面废墟。",
    objective: "使用咒力连拳与逕庭拳攻击真人的灵魂，配合东堂支援；击败真人即可通关。" },
  shibuyaFinal: { label: "涩谷 · 遍杀即灵体", ally: "yujiShibuya", enemy: "mahitoFinal", canon: true, shibuya: true, sceneIntro: "东堂已失去左手。真人化为遍杀即灵体，虎杖继续迎战。",
    intro: "真人展开0.2秒自闭圆顿裹，东堂失去左手；随后真人化为遍杀即灵体。虎杖继续迎战，东堂仍等待最后的佯攻时机。",
    objective: "击败遍杀即灵体即可通关；逕庭拳与黑闪能创造优势，东堂可佯装拍手一次。" }
};
export const fighterSigil = id => id === 'kashimo' ? '鹿' : id.startsWith('higuruma') ? '日' : id.startsWith("yuji") ? "虎" : id.startsWith("mahito") ? "真" : id.startsWith("todo") ? "东" : id.startsWith("yuta") ? "乙" : id.startsWith("gojo") ? "五" : id.startsWith("toji") ? "甚" : "宿";
