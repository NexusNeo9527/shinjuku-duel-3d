# 甚尔动画风格精修 v6

本轮仅修改 `toji`、`tojiRematch`，沿用 v5 的动画头部和原有 163 骨骼。

- 耳朵从椭球改为有耳廓、耳甲凹陷的连续曲面。
- 收窄下颌后侧，调整鼻尖侧面轮廓。
- 上衣下摆收进腰线；上衣、裤装补充受力褶线。
- 裤腿增加斜向褶皱和脚踝收束；褶线按服装附近顶点的权重绑定。
- 运行时材质在脸颊外侧混合底色，减轻官方参考图投射边界。

## 文件

- `art/toji-anime-v6/toji-anime-v6.blend`：可导出 PBR 源文件。
- `art/toji-anime-v6/toji-anime-workshop.blend`：Blender 三渲二预览工程。
- `art/toji-anime-v6/toji.glb`、`tojiRematch.glb`：游戏资产，与 `public/models/` 同名文件同步。
- `tools/toji-v6-preview.html`：实际生产加载器的 v5/v6 对照、视角与姿态检查。
- 旧版完整保留在 `art/toji-anime-rebuild/`。

## 重建

使用 Blender 打开 `art/toji-anime-rebuild/toji-anime-rebuilt.blend`，执行 `tools/refine_toji_anime_v6.py`。脚本导出两个 GLB，再调用 `tools/preview_toji_rebuild.py` 的三渲二转换并保存独立工程。

## 验证与限制

`node tools/verify-fighters.mjs`、`node tools/verify-hidden-inventory.mjs` 和 `npm run build` 通过。浏览器检查了弯肘、行走及多角度显示。Node 测试仅读取嵌入 PNG 的尺寸；实际纹理显示以浏览器截图为准。

当前仍是改进中的游戏原型，不是官方模型或官方动画同等品质。五官使用官方立绘原图进行 UV 投射，近看分辨率有限，也没有完整的可变表情系统。服装形体、发型和侧脸仍有还原空间。原图来源：https://jujutsukaisen.jp/images/chara_category6/chara_detail12_2nd.png 。

本轮随 v0.2.12 交付；提交、远程推送与部署状态分别核验，不以本地构建代替线上验证。
