// Generated original illustrations; chapter references and art direction are
// recorded in docs/hidden-inventory-canon.md. All assets ship with the game.
export const HIDDEN_INVENTORY_ART = {
  opening: {
    file: "hidden-inventory-opening.png", kicker: "HIDDEN INVENTORY · 01",
    title: "高专初战", alt: "高专林地中，戴圆墨镜的少年五条以苍迎战手持天逆鉾的甚尔",
    text: "护送星浆体归来，五条因疲惫而解除术式。甚尔从背后突袭；夏油带理子先走，五条独自留下迎战。",
    button: "进入高专初战"
  },
  awakening: {
    file: "hidden-inventory-awakening.png", kicker: "HIDDEN INVENTORY · 02",
    title: "反转术式 · 觉醒", alt: "少年五条露出六眼，在林间日光中领悟反转术式",
    text: "五条重伤倒地；理子遇害，夏油也败于甚尔。濒死时，五条将全部意识集中在反转术式上，终于领悟，并赶到盘星教所在地再战。",
    button: "进入觉醒再战"
  },
  purple: {
    file: "hidden-inventory-purple.png", kicker: "HIDDEN INVENTORY · FINALE",
    title: "虚式 · 茈", alt: "盘星教外庭，觉醒五条施放茈，迎向甚尔的万里锁与天逆鉾",
    text: "甚尔准备以万里锁与天逆鉾应对无下限，却未料到隐藏的虚式。茈贯穿甚尔，再战落幕；临终时，他向五条提到了惠。",
    button: "查看剧情结局"
  }
};

export const HIDDEN_INVENTORY_IMAGE_FILES = Object.values(HIDDEN_INVENTORY_ART).map(art => art.file);
