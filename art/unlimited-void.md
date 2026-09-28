# 无量空处空间模型

## 交付

- `unlimited-void.blend`：可编辑 Blender 场景，保留原场景。
- `../public/models/unlimited-void.glb`：游戏使用的 9 个网格批次。
- `unlimited-void-preview.png`：Blender 渲染预览。
- `unlimited-void-game.png`：本地游戏中五条悟释放领域的截图。
- `../tools/build_unlimited_void.py`：在已打开的 Blender 窗口内执行的生成脚本。

## 视觉与游戏适配

参考无量空处的黑暗宇宙、黑洞与远处星光意象，制作暗色中心、白蓝紫光环、星点及放射状信息光线。形态参考说明见 [Unlimited Void](https://jujutsu-kaisen.fandom.com/wiki/Unlimited_Void)。这是程序化游戏模型，未逐帧复刻原作镜头。

模型以半径 100 为基准，运行时按领域半径缩放；光环位于施术者背后，朝向在释放时固定。保留场地地面与既有碰撞，避免改变战斗规则。光线目前为静态几何，展开和收束通过整体缩放表现。

五条悟与乙骨·五条之身的 `void` 领域共用模型。启动加载页预载资源；加载失败时保留原有领域球体效果。领域消失、切换到其他领域和重新开局时隐藏模型。

## 验证

- 本地浏览器：两名角色释放成功，9 个网格加载且可见。
- 领域结束、切换伏魔御厨子、重置战斗后，无量空处模型均正确隐藏。
- 浏览器检查未发现警告或错误。
- `npm run verify:story`、`npm run build`、`git diff --check` 通过。

截图使用调试入口补满领域能量并冻结战斗，以便检查模型；不代表自然战斗流程的完整回放。
