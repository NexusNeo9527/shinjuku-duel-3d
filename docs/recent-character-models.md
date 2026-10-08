# 新加入角色的 Blender 模型

本轮覆盖 8 位人物的 15 个时期／状态版本。当前修订源文件为 `art/recent-characters/canon-recent-cast-cel.blend`，首版保存在 `canon-recent-cast.blend`。构建入口为 `tools/build_recent_characters.py`，修订入口为 `tools/refine_recent_characters.py`，导出文件为 `public/models/<角色 ID>.glb`。既有 Blender 场景保留。没有修改战斗数值或发布线上版本。

## 参照与改编边界

- [官方懐玉・玉折角色设定](https://jujutsukaisen.jp/character/category6.php)：少年五条与甚尔的服装、头发、眼镜和轮廓参照。
- [官方角色设定](https://jujutsukaisen.jp/character/index_1st.php)：虎杖、真人、东堂的身份与基本外形参照。
- [集英社原作第 27 卷](https://www.shueisha.co.jp/books/items/contents.html?isbn=978-4-08-884115-1&mode=1)：鹿紫云发动术式与宿傩完成受肉的时期依据；新宿细节对应原作 237–247 话。
- [集英社原作第 26 卷](https://books.shueisha.co.jp/items/contents.html?isbn=978-4-08-883884-7)：新宿时期原作参照。
- [官方第 55 集介绍](https://jujutsukaisen.jp/episodes/55.php)：日车的律师身份与死灭回游阶段。

这些页面没有提供完整的原作多视图。模型是自主制作的风格化游戏重建，并非逐面复刻；漫画未明确给出颜色的晚期形态，采用与现有游戏协调的配色。几何细分、伤口数量、布料褶皱、前臂装甲和电流表现属于视觉改编，不能当作原作新增设定。幻兽琥珀当前只制作面部电流与额眼的状态层，完整身体电气化仍可继续细化。

| 模型 | 本轮制作重点 |
|---|---|
| gojoTeen / gojoAwakened | 白色尖簇与不齐刘海、高专深色立领、圆墨镜；觉醒版去眼镜并保留破损、血痕 |
| toji / tojiRematch | 宽肩、紧身黑短袖、浅色宽裤、嘴角疤、紫色收纳咒灵；天逆鉾／短刀切换，复战版千里锁 |
| yujiShibuya / yujiCulling / yujiRaid | 粉色短发、暗色鬓角、红帽领、面部伤痕；早期版本不带新宿的红色前臂造型 |
| mahito / mahitoFinal | 常态灰蓝长发与逐针缝线、拼接衣；遍杀即灵体改为无眼面甲、胸甲分节、肘刃和尾部 |
| todoShibuya / todoInjured | 裸露胸腹、宽肩手臂、束发与脸疤；受伤版左腕缺手并包扎，不自动补回手掌 |
| kashimo | 双侧发髻、青色刘海、眼下电纹、无袖浅色衣与束腰；额眼只在术式发动后显示 |
| higuruma / higurumaCulling | 成年脸部、眼袋、黑西装驳领、衬衫领带、法槌；处刑人之剑独立开关，回游版赤脚 |
| sukunaRaid | 四臂独立关节、四眼与不对称面部、腹口牙列、黑色纹样、浅色裤与神武解 |

## 游戏接入与验证

`loadGltf` 加载上述真实 GLB，保持动画空节点命名；新模型保留自己制作的手、断腕和前臂几何。启动预加载包含全部新模型。日车的法槌／处刑人之剑以及宿傩的神武解继续由战斗状态控制。导出以关节／材质合批，不把需要独立开关的武器合并进手臂。

`node tools/verify-fighters.mjs` 检查真实 Blender 资产来源、落地、尺寸、运动、断腕、武器切换与四臂关节。`npm run verify:story` 和 `npm run build` 检查剧情与构建。浏览器审阅入口为 `/tools/recent-model-preview.html`。

2026-10-08 本地检查：15 个新 GLB 均通过来源、落地、运动与装备检查；怀玉、涩谷和综合剧情验证通过，生产构建通过，差异空白检查通过。Blender 正面／侧面与渲染图检查后修正了裤腰断层、肌肉接缝和遍杀即灵体的人形头部残留。浏览器启动完成 68 项预加载，鹿紫云对完全受肉宿傩实战画面加载成功，该次控制台无 error／warn。此轮未验证真实手机性能或逐一完整通关；未提交、推送或部署。整体效果仍为风格化角色，而非原作级精细雕刻。

## 用户否定首版后的三渲二修订

用户明确选择接近官方动画的三渲二。使用 Blender MCP 操作当前工程、Context7 与本地 Three.js r169 着色器源码核对运行时材质，并用浏览器 MCP 检查真正的 GLB。img2threejs 的参考分析、局部特征和多角度复核方法用于本轮诊断。Image Blaster 的生成器未启用，没有调用外部付费生成服务。

实际改动：15 个版本缩小头部，修正成年比例；人形裤装重建为连续轮廓，去掉细分导致的珠状膝盖和交叉假褶皱；五条与甚尔重做定向发簇；五条改为左上胸单枚金扣及斜门襟；甚尔补短袖、束腰垂带、脚踝，并根据侧面截图补连续后脑发层。游戏新增三段明暗和细轮廓，保留原有伤害发光、装备开关、关节与断腕。Blender 源工程使用 EEVEE Shader to RGB 预览材质；GLB 先以基础色材质导出，由游戏应用 cel shader。不要直接从三渲二预览节点导出 GLB 而忽略这一顺序。

运行顺序：在仍有 `recent` 模块和 `recent.c.roots` 的作者会话中载入修订脚本，逐个 `refine(id)` 与 `recent.export_one(id)`；汇总 `recent.REPORT`，最后 `source_toon()` 保存独立工程。重新打开工程后需重新绑定模块及材质引用，不能假定 Python 模块随 .blend 保存。源网格仍为按语义关节装配的动画结构，尚未升级到连续蒙皮拓扑。

复核截图在 `art/recent-characters/debug/`；Blender 总览为 `cel-lineup.png`。15 个模型回归、怀玉、涩谷、综合剧情与生产构建通过；运行时着色器正常显示。正面和近景复核五条与甚尔、侧面复核甚尔，修复了短袖穿插和后脑露缝；额外复核四臂宿傩攻击姿态。脸部独特性、发束自然度和衣服动态仍低于官方动画美术水准，不能宣称最终相似度验收通过。

实战材质复制必须保留 `onBeforeCompile` 与 `customProgramCacheKey`；新增 `cloneCharacterMaterial`，避免审阅页的分段明暗在战斗受击材质隔离时丢失。15 个模型增加真实 Three.js toon 源码注入与材质闪光隔离回归。游戏重新完成预加载，并以少年五条／甚尔进入练习场，截图为 `debug/game-cel-practice.jpg`；该次新页面控制台无 error／warn。

`debug/character-sculpt-spec.json` 是技能产生的未采用模板，严格验证失败；`.img2threejs/state.json` 保留未完成状态。它们不是本轮实际建模规范或成功证明。完整 img2threejs 重建流水线未通过，本轮仅采用参考诊断与复核方法；技术回归通过不能替代用户的视觉验收。
