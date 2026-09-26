// Story-specific lines are tied to the fighters' canon roles in each stage.
// Technique names are preserved from the source; surrounding dialogue is
// adapted to the scene so borrowed-body Yuta never speaks as Gojo.
export const STORY_DIALOGUE = {
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
    ending: "我会带着这份力量继续战斗。",
    victory: "老师，我会继续战斗下去。",
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
