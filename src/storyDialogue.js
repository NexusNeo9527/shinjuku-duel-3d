// Story-specific lines are tied to the fighters' canon roles in each stage.
// Technique names are preserved from the source; surrounding dialogue is
// adapted to the scene so borrowed-body Yuta never speaks as Gojo.
export const STORY_DIALOGUE = {
  gojo: { opening: "新宿的决战，开始吧。", clash: "领域对抗，还没结束。", lowHealth: "继续寻找突破口。", victory: "本场挑战完成，继续下一场。", moves: { blue: "术式顺转——苍。", red: "术式反转——赫。", purple: "虚式——茈。", void: "领域展开——无量空处。" } },
  sukuna: { opening: "让我看看你的术式，五条悟。", clash: "那就继续对抗。", lowHealth: "战斗还没结束。", victory: "本场挑战完成。", moves: { slash: "解。", shrine: "领域展开——伏魔御厨子。", mahoraga: "魔虚罗。" } },
  yujiShibuya: { opening: "我还得继续战斗。东堂，一起上！", lowHealth: "把大家托付给我的，带到最后。", ending: "真人逃走，虎杖追赶；羂索现身，以咒灵操术吸收真人。", victory: "我会带着大家托付给我的继续战斗。", moves: { yujiPunch: "打到他的灵魂。", divergentFist: "逕庭拳。", yujiBlackFlash: "黑闪！", todoSupport: "东堂！" } },
  mahito: { opening: "来吧，虎杖悠仁。", lowHealth: "只有一瞬的领域，就能抢在反应之前。", ending: "真人准备化为遍杀即灵体，再次迎战。", victory: "挑战失败。重新迎战真人，完成涩谷剧情。", moves: { soulTouch: "无为转变。", soulBlade: "改变肉体的形状。", soulIsomer: "多重魂·拔体。", mahitoDomain: "领域展开——自闭圆顿裹。" } },
  mahitoFinal: { opening: "这才是我灵魂真正的形状。", lowHealth: "那一下，咒力竟然迟到了……", ending: "这是挑战结果；原著中虎杖以黑闪击溃真人。", victory: "挑战失败。抓住逕庭拳制造的破绽。", moves: { soulBlade: "遍杀即灵体。" } },
  todoShibuya: { opening: "站起来，兄弟。我们还在战斗！" },
  todoInjured: { opening: "我的不义游戏，已经结束了。" },
  gojoTeen: {
    opening: "杰，带理子先走。我来对付这家伙。",
    lowHealth: "没有咒力……单凭身体就能做到这种速度？",
    ending: "倒下的五条，将全部意识集中在反转术式上。",
    victory: "高专初战结束。",
    moves: { blue: "术式顺转·苍。", blueMax: "最大输出·苍。", infinity: "无下限。" }
  },
  gojoAwakened: {
    opening: "在濒死的时候，我终于领悟了反转术式。",
    lowHealth: "现在，六眼看到的一切格外清晰。",
    ending: "甚尔临终提到他的儿子惠，五条记下了这件事。",
    victory: "再战结束，这一次我赢了。",
    moves: { blue: "苍。", red: "术式反转·赫。", purple: "虚式·茈。", awakenedHeal: "反转术式。", infinity: "无下限。" }
  },
  toji: {
    opening: "护送拖到现在，你已经疲惫了。",
    lowHealth: "先遮住他的视线，再从死角下手。",
    ending: "甚尔重创五条，追入薨星宫；理子遇害，夏油也败于甚尔。五条在濒死中领悟反转术式。",
    victory: "这场战斗，是我赢了。",
    moves: { tojiBlade: "刀刃突袭。", invertedSpear: "天逆鉾。", flyheads: "用蝇头遮住视线。" }
  },
  tojiRematch: {
    opening: "已经完成委托，却仍想击败眼前觉醒的五条。",
    lowHealth: "苍、赫、无下限……这些我都知道。",
    ending: "这是自由对战结果；原著再战由五条以虚式·茈取胜。",
    victory: "这场战斗，是我赢了。",
    moves: { tojiBlade: "贴身突袭。", invertedSpear: "天逆鉾。", chainSpear: "万里锁·天逆鉾。" }
  },
  yuta: {
    opening: "宿傩，我会把伏黑同学带回来。",
    lowHealth: "我还没有救回伏黑同学……不能倒下！",
    clash: "里香，帮我抓住他！",
    ending: "伏黑同学，我不会放弃。",
    victory: "这次，我会把大家都带回去。",
    moves: {
      katana: "咒力刀！",
      rika: "里香！",
      cursedSpeech: "狗卷学长的录音：「不许动」！",
      skyBreak: "天空操术·薄冰破！",
      jacobsLadder: "邪去侮的梯子！",
      authenticLove: "领域展开——真赝相爱！",
      yutaHeal: "反转术式！"
    }
  },
  yutaGojo: {
    opening: "对不起，五条老师。我得借用这副身体。",
    lowHealth: "六眼和无下限……我还没有完全驾驭。",
    clash: "我会用这副身体撑过这三分钟！",
    ending: "身体……动不了了。剩下的，拜托你们。",
    victory: "这次，我用这副身体赢下来了。",
    moves: {
      blue: "苍！",
      red: "赫！",
      purple: "虚式「茈」！",
      void: "领域展开——无量空处！",
      borrowedHeal: "反转术式！"
    }
  },
  sukunaStory1: {
    opening: "居然复制了我的术式，乙骨忧太。",
    lowHealth: "这种程度，还不足以取悦我。",
    clash: "有趣。继续挣扎吧。",
    ending: "到此为止了，乙骨忧太。",
    victory: "模仿得再像，也改变不了胜负。",
    moves: {
      slash: "解！",
      cleave: "捌！",
      cleaveRush: "捌！",
      wickerBasket: "彌虚葛籠！",
      sukunaHeal: "反转术式！"
    }
  },
  sukunaStory2: {
    opening: "换了五条的身体，乙骨忧太……有意思。",
    lowHealth: "五条的身体，你还是驾驭不了。",
    clash: "无量空处？你撑得住吗？",
    ending: "五条的身体，也救不了你。",
    victory: "这副身体，并没有改变胜负。",
    moves: {
      slash: "解！",
      cleave: "捌！",
      cleaveRush: "捌！",
      shrine: "领域展开——伏魔御厨子！",
      sukunaHeal: "反转术式！"
    }
  }
};

export const STORY_VICTORY_LINES = Object.fromEntries(
  Object.entries(STORY_DIALOGUE).map(([charId, lines]) => [charId, lines.victory])
);
