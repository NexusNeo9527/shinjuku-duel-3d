# 其他角色连续蒙皮精修

本轮覆盖甚尔以外的 13 个新增版本：少年/觉醒五条、涩谷/回游/新宿虎杖、真人/遍杀即灵体、东堂/断腕东堂、鹿紫云、新宿/回游日车、四臂宿傩。

## 已实现

- 上下臂、大小腿改为跨越肘膝的连续曲面，关节附近混合权重。普通角色 11 根骨骼，四臂宿傩 15 根；保留运行时关节命名。
- 区分脸部轮廓、眼型和发束；日车采用较长脸型与窄眼，虎杖较圆眼型，真人保留异色眼与缝合特征。头部仍是程序化风格化建模。
- 衣领、翻领、领带及拼接衣片沿躯干表面重新贴合，修正平面衣片的穿插。
- 保留断腕东堂、四臂宿傩、武器和变身层。甚尔两个 GLB 的 SHA256 与本轮开始前一致。
- 按材质合并蒙皮网格。资产增加了几何和蒙皮数据，尚未进行实机性能验收。

## 文件与复现

- `tools/polish_other_cast.py` 从 `art/recent-characters/canon-recent-cast-cel.blend` 生成新版 GLB 和 `art/cast-polish/other-cast-polished.blend`。
- `tools/preview_other_cast.py` 从上述导出源生成 `other-cast-workshop.blend`，提供三段色阶预览；它的材质用于 Blender 预览，游戏仍使用现有 cel 渲染器。
- `tools/cast-polish-preview.html` 使用生产加载器对照本轮前后模型，可切换动作、视角和脸部特写。
- `art/cast-polish/before/` 保留本轮旧版对照。13 个新版已复制到 `public/models/`。

## 验证与边界

`node tools/verify-fighters.mjs` 增加混合权重顶点实际变形检查；16/16 验证套件、生产构建通过。浏览器检查了衣领、防御肘部、行走膝部、断腕与四臂等。所有模型均已在 Blender 合集渲染中检查。

这是减少分段感、改善辨识度的一轮修改，尚未达到官方动画角色的脸部拓扑、头发层次及表情精度；没有新增完整手指或表情骨骼。官方动画角色资料与既有时期约束见 `docs/recent-character-models.md`。
