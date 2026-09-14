# 角色模型

`shinjuku-fighters.blend` 保存三名角色的可编辑建模场景，`fighters-preview.png0001.png` 为 Blender 实际渲染。

这套模型为本项目制作的风格化分段角色：五条悟白发蓝眼和深色高领制服、黑发红眼宿傩与面部咒纹、魔虚罗八握轮与退魔之剑。不是写实雕刻或原作官方资产。

外观参考用户指定的 `dist/assets` 图片：五条悟以 `gojo-void.png` 为主，结合 `gojo-win.jpg` 和 `gojo-murasaki.png` 的发束与眼睛；宿傩以 `sukuna-domain.png` 的黑发、深色高领和分叉咒纹为主。`domain-clash.png` 中宿傩服装不同，本版没有混搭该服装。此目录没有魔虚罗参考图，他仍沿用第一版设计。图片用于观察建模，没有直接贴到角色表面。

在 Blender 里执行 `tools/build_fighters.py` 可重新生成源文件并导出 `public/models/{gojo,sukuna,mahoraga}.glb`。脚本使用独立场景，保留其他场景。GLB 只导出当前角色，材质内嵌，不依赖外部贴图。

关节使用 Empty 层级进行分段运动，游戏通过 `src/three/models.js` 驱动待机、行走、法轮旋转。模型使用 Y 轴向上、面向 +Z、脚底落地的游戏坐标；人形高度 1.85，魔虚罗含法轮高度为其 1.45 倍。加载失败保留原始角色。

验证：`node tools/verify-fighters.mjs`，`npm run build`。
