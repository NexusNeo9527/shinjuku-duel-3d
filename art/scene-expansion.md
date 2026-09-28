# 新宿场景扩展

## 场景与参考

| 场景 | 保留的题材特征 | 本次扩展 |
| --- | --- | --- |
| 开战街区 | 新宿商业街、高楼、路口，局部损坏 | 外围环路、三层远景街区，保持较完整的建筑轮廓 |
| 乙骨对战 | 新宿废墟，楼板与建筑残骸 | 中度破坏的外围楼群、裸露钢筋、低矮碎石 |
| 借用身体再战 | 同一战区后期的大面积破坏 | 更低的建筑残段、焦痕和碎石，保留现有中心破坏区 |
| 真赝相爱 | 插刀、十字构筑物、结绳 | 原有领域以外增加 64 座远景十字构筑物与地面延伸 |

参考入口：

- [漫画第 223 话官方入口](https://shonenjumpplus.com/episode/11990162089556620380)：开战阶段。
- [漫画第 250 话官方入口](https://www.viz.com/shonenjump/jujutsu-kaisen-chapter-250/chapter/41657)：乙骨领域阶段。
- [新宿地点资料](https://jujutsu-kaisen.fandom.com/wiki/Shinjuku)、[新宿决战篇资料](https://jujutsu-kaisen.fandom.com/wiki/Shinjuku_Showdown_Arc)：战场逐步破坏的二手资料。
- [真赝相爱的外观描述](https://www.animeexplained.com/explained/jujutsu-kaisen-yuta-okkotsus-cursed-technique-explained/)：十字构筑物、刀与结绳的二手资料；原有模型依据另见 `yuta-arenas.md`。

官方页面作为章节索引，未完整读取付费漫画正文。建筑坐标、道路结构、颜色、数量和尺度均为游戏改编，不代表漫画逐格复原或现实新宿测绘。

## 实现

- 活动边界从 92×92 扩大到 144×144 单位，面积约为原来的 2.45 倍。角色尺寸、速度、出生点和技能数值保持原设定。
- `src/three/arenaDistrict.js` 为加载后的 GLB 添加外围布景，地面覆盖 440×440 单位；不缩放原有建筑、刀或角色。
- 外围视觉建筑位于可活动边界之外，环路可通行。开战街区的 8 个主体建筑加入碰撞筛选；乙骨两场继续使用各自原有的 56 个建筑碰撞体。
- 新增布景使用实例化绘制：开战 7 批、乙骨 12 批（其中 2 批为领域）、后期战场 11 批。远景不投射动态阴影；不会为每扇窗创建单独的绘制调用。这里是新增布景的批次数，不是全场景性能指标。
- 真赝相爱的远景随领域开启和结束切换，外围街区不会留在领域内。无量空处的封闭空间、伏魔御厨子的开放领域及技能范围继续使用现有规则。
- `tools/arena-preview.html` 使用实际加载入口，提供三段外部场景、真赝相爱以及全景/地面视角。运行 `npm run dev -- --host 127.0.0.1` 后访问 `/tools/arena-preview.html`。

## 验证

- `npm run verify:story`、`node tools/verify-closed-domains.mjs`、`node tools/verify-domain-breaks.mjs`。
- 使用 GLTFLoader 加载三份实际 GLB，验证建筑碰撞、沿 x=64 的新增外围道路行走、扩大后的四边限制、从地图边缘进入领域后返回原位、领域碰撞隔离和实例矩阵有效性。
- 浏览器检查四个场景的实际画面与地面视角；手机尺寸下检查预览页布局。未进行手机硬件帧率验收。
- `npm run build`、`git diff --check`。
