# 无量空处空间模型

## 交付

- `unlimited-void.blend`：可编辑 Blender 场景，保留原场景。
- `../public/models/unlimited-void.glb`：游戏使用的 9 个网格批次。
- `unlimited-void-preview.png`：Blender 渲染预览。
- `unlimited-void-game.png`：本地游戏中五条悟释放领域的截图。
- `../tools/build_unlimited_void.py`：在已打开的 Blender 窗口内执行的生成脚本。

## 视觉与游戏适配

参考无量空处的黑暗宇宙、黑洞与远处星光意象，制作暗色中心、白蓝紫光环、星点及放射状信息光线。形态参考说明见 [Unlimited Void](https://jujutsu-kaisen.fandom.com/wiki/Unlimited_Void)。这是程序化游戏模型，未逐帧复刻原作镜头。

模型以半径 100 为基准，运行时将星空扩展到半径 160；光环朝向在释放时固定。无量空处内隐藏地面和街景，暂停街景建筑碰撞。光线目前为静态几何；星空不会在展开和结束时缩穿角色。

## 封闭领域规则

无量空处与真赝相爱采用半径 80 的封闭空间，展开时收纳本场角色及召唤物，移动、冲刺、升空和击退不能突破边界。领域消失或对撞失败后，恢复展开前的位置和外部碰撞。新召唤物也会受结界限制。

这是针对当前小型竞技场的适配：全场收纳、80 的数值与返回原位置属于游戏规则，不是原作固定尺寸或传送规则。原作的封闭结界与内部空间参考 [领域展开](https://jujutsu-kaisen.fandom.com/wiki/Domain_Expansion)；[伏魔御厨子](https://jujutsu-kaisen.fandom.com/wiki/Malevolent_Shrine)仍保留开放领域与逃生路线，未改成封闭空间。

五条悟与乙骨·五条之身的 `void` 领域共用模型。启动加载页预载资源；加载失败时保留原有领域球体效果。领域消失、切换到其他领域和重新开局时隐藏模型。

## 验证

- 本地浏览器：两名角色释放成功，9 个网格加载且可见。
- 领域结束、切换伏魔御厨子、重置战斗后，无量空处模型均正确隐藏。
- 浏览器检查未发现警告或错误。
- `npm run verify:story`、`npm run build`、`git diff --check` 通过。
- 本地 `tools/verify-closed-domains.mjs` 检查三位施术者、边界冲刺、结束返回、召唤物与开放领域区别。
- 浏览器验证街景隐藏、边界约束、结束恢复；`unlimited-void-enclosed.png` 为新版空间截图。

截图使用调试入口补满领域能量并冻结战斗，以便检查模型；不代表自然战斗流程的完整回放。
