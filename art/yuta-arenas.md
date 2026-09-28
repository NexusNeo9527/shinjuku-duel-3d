# 乙骨对战场景扩展

## 原著依据与改编

- 本体战参考漫画第 249–251 话：新宿废墟，以及真赝相爱的插刀、十字形构筑物和悬空结绳。
- 借用五条身体的再战参考第 261–263 话的后期战场：建筑残骸、断面与大面积破坏。地表焦痕、碎石环是为辨认战场阶段制作的美术改编，不代表逐格还原。
- 建筑位置、材质颜色、结绳曲线和道路宽度为本项目原创布局。没有从漫画提取贴图。
- 可读参考：[真赝相爱资料](https://jujutsu-kaisen.fandom.com/wiki/Authentic_Mutual_Love)、[第 250 话资料](https://jujutsu-kaisen.fandom.com/wiki/Chapter_250)、[第 262 话官方入口](https://www.viz.com/shonenjump/jujutsu-kaisen-chapter-262/chapter/43328)。官方付费正文未作为已完整核对的证据。

## 文件和重建

使用 `tools/build_yuta_arenas.py` 重建扩展版本；旧的 `build_story_assets.py` 是早期街区模型脚本。

```powershell
& 'D:\steam\steamapps\common\Blender\blender.exe' --background --python tools/build_yuta_arenas.py -- --render
```

- `public/models/story_yuta.glb`：废墟街区与领域布景，共用现有剧情入口。
- `public/models/story_borrowed.glb`：后期破坏战场。
- `art/yuta-expanded-arenas.blend`：可编辑源文件；`exterior` 和 `authenticLove` 集合可分别显示。
- `yuta-ruins-preview.png`、`yuta-domain-preview.png`、`borrowed-ruins-preview.png`：Blender 实际渲染。

坐标沿用 Blender Z 向上、导出 glTF Y 向上，1 单位为 1 米。可行走地面保持高度 0，保留角色在 `(0, ±15)` 的出生空间。

`arenaLayer` 指定外部废墟或领域布景，`arenaCollider` 标记独立建筑碰撞。展开真赝相爱时切换布景、雾色与碰撞；结束后恢复废墟与已经破坏的物件状态。刀与零碎石块为装饰，避免小物件阻碍走位。角色和技能伤害没有因本次场景扩展而修改。
