# 新宿剧情角色模型

## 可编辑源文件

- `shinjuku-story-characters-polished.blend`：游戏当前使用版本。打开后选择 `Shinjuku Story Character Atelier` 场景。
- `shinjuku-story-characters-refined.blend`：本轮优化前源文件，保留供回退与重新生成。
- `shinjuku-story-characters.blend`：细修前源文件，保留未覆盖。
- `lineup-polished.png`：当前 Blender 合照；`lineup-refined.png` 与 `*-face.png` 为上一版预览。
- `asset-report.json`：实际导出三角面、网格和文件大小。

四个角色分别为乙骨本体、里香、四臂宿傩、借用五条身体的乙骨。源文件中服装、头发、面部、纹样、武器为可编辑对象；四肢以层级节点驱动游戏动画。没有面部表情骨骼或完整蒙皮。

这是参考漫画特征制作的风格化游戏模型，面部、肌肉、衣褶仍有简化，并非逐格或写实复刻。两阶段宿傩共用完整四臂模型，没有逐场景还原断臂、伤口变化。

## 游戏资源

| 角色 | public/models 导出 | 三角面 |
| --- | --- | ---: |
| 乙骨本体 | yuta.glb | 31028 |
| 里香 | rika.glb | 37138 |
| 四臂宿傩 | sukuna_shinjuku.glb | 65140 |
| 乙骨·五条之身 | yuta_gojo.glb | 32244 |

`src/three/models.js` 加载以上文件，原五条/宿傩模式保留其原资源。模型预览使用同一加载器及关节动画，开发服务启动后访问 `/tools/story-model-preview.html`。

## 制作脚本

- `tools/polish_story_characters.py`：固定读取 refined 源文件，融合同一关节下的肩袖与前臂，重建裤腿，调整发束与材质，保存独立 polished 源文件、合照和游戏 GLB。可重复运行，不在上次结果上累积修改；会覆盖 polished 输出。
- `tools/build_story_characters.py`：在 Blender 中创建独立角色场景，保存基础源文件并导出 GLB。重新执行会覆盖同名基础源文件和游戏导出；手工编辑后请先另存。
- `tools/refine_story_faces.py`：以当前打开的基础源文件为输入，细修眼睛和发根，另存 refined 源文件，导出及渲染。只执行一次，重复执行会再次下移发根。
- `tools/render_story_review.py`：从当前打开的角色场景输出近景，不保存或覆盖 Blender 源文件。

本次使用 Blender 5.2.2 LTS。CLI 示例：

```powershell
& 'D:\steam\steamapps\common\Blender\blender.exe' -b 'D:\新宿决战\art\story-characters\shinjuku-story-characters.blend' -t 2 --python 'D:\新宿决战\tools\refine_story_faces.py'
```

## 参考图

仅作为造型观察参考，没有将第三方图片贴入模型或打包进 GLB：

- [乙骨与里香漫画画面](https://images.everyeye.it/img-notizie/jujutsu-kaisen-decisione-yuta-errore-devastante-v4-754833-1280x960.webp)
- [里香外形](https://yuruyurumedia.com/j-kaisen/wp-content/uploads/2023/07/E1C688DA-FA15-44B3-A42A-4A28F053126E-1024x666.jpg)
- [四臂宿傩](https://i.pinimg.com/originals/e3/9b/7f/e39b7f7be05d48ecb2181d42a2b1b1ee.jpg)
- [借用五条身体的乙骨](https://ovicio.com.br/wp-content/uploads/2024/05/20240525-yuta-gojo.jpg)

## 本地验证

运行 `npm run verify:story` 检查战斗规则与 GLB 根节点、关节、顶点边界；运行 `npm run build` 检查构建。另行在浏览器检查四个模型加载、四臂行走和实际战斗里香召唤。手机为浏览器窄屏检查，真机性能仍需用户测试。
