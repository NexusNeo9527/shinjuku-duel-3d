# 原著参考场景优化

本轮 Blender 源文件：`art/canon-trial-arenas.blend`。保留用户原来的默认 Scene；四个新场景可通过 Blender 场景下拉框切换。重建脚本为 `tools/build_trial_arenas.py`，复用已有环境几何工具，不导入第三方模型或生成服务。

## 参考与改编边界

- 虎杖与日车剧场：漫画第163–165话；动画官方第55、56集。保留观众席、中央通道、舞台幕布，以及初见日车的浴缸。112张座椅独立破坏，中央战斗区留空。剧场尺寸、座位数量、木材和灯光为游戏美术改编。
- 诛伏赐死：第164话领域画面。黑色三叉轮廓审判者、白色面具、缝合闭眼（每眼三道）、两侧悬挂天平、两个圆形带曲栏站台和外围断头台。没有将领域改成普通法庭或新增必中伤害。场地半径、断头台数量和材料颜色为改编；领域从预加载的 GLB 实例化，并随审判状态显示、定位及隐藏。
- 鹿紫云对宿傩、日车共斗：第237–238、244–247话战场处于五条战后破坏的新宿。使用裸露楼板、残柱、断墙、弯折钢筋、散落混凝土和地面裂痕；两关各有不同的废墟分布。为移动和镜头保留中央空间，并非逐格复刻漫画坐标。

官方参考：[第55集](https://jujutsukaisen.jp/episodes/55.php)、[第56集](https://jujutsukaisen.jp/episodes/56.php)、[单行本19卷](https://www.s-manga.net/items/contents.html?jdcn=08X10000000020243200)。参考图只用于观察，没有打包进游戏。

## 游戏资源

- `public/models/culling-theater.glb`
- `public/models/shinjuku-lightning-ruins.glb`
- `public/models/shinjuku-trial-ruins.glb`
- `public/models/deadly-sentencing.glb`

静态装饰按材质合并，碰撞和可破坏物保留独立原点；剧场整张椅子作为一个可破坏物，避免部件漂浮。新模型接入已有场景加载器和启动预加载。此前真人领域、怀玉和涩谷 Blender 模型继续使用各自已有文件。

验证：剧情回归、四个 GLB 的有限顶点/单场景/原始 Cube 排除/材质与碰撞通道检查、Vite 构建，并在场景巡览页检查实际 WebGL 显示。浏览器截图保存在此目录。视觉资源在本地更新，未提交或发布。
