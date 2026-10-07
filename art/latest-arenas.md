# 真人领域与怀玉／涩谷场景重制

移动端优化与模型开销对比见 `docs/latest-arena-mobile-optimization.md`。重新导出 GLB 后运行 `node tools/optimize-latest-arenas.js` 应用法线压缩和精确顶点去重；移动端碎石批次由渲染器加载时建立。

源文件：`art/latest-arenas.blend`，内含五个独立 Scene；默认打开真人领域。生成脚本：`tools/build_latest_arenas.py`。原有 Blender 文件保留。

| 场景 | 新设计 | 游戏模型 |
| --- | --- | --- |
| 自闭圆顿裹 | 66 组带拇指、指节、掌纹的手掌与手臂，三层环绕、顶部倒悬，黑色封闭空间与紫色地面纹路 | mahito-domain.glb |
| 怀玉初战 | 瓦顶山门、木构校舍、石板庭院、石灯与林带 | hidden-inventory.glb |
| 怀玉再战 | 盘星教外部庭院、入口台阶、门窗壁柱、花池、紫的破坏痕迹 | hidden-inventory-rematch.glb |
| 涩谷共斗 | 路口斑马线、店铺招牌、格栅立面、站口、路灯与碎石 | shibuya-clash.glb |
| 涩谷最终战 | 较低的残楼、冲击区、放射裂纹、倒塌楼板与更多碎石 | shibuya-final.glb |

这是沿用项目题材的风格化游戏场景设计，不是逐镜头复原。全部使用自建几何，无外部付费资产。静态装饰按材质合并，建筑碰撞与可破坏物保持独立；可破坏物的原点位于其实际中心。

游戏加载入口在 `src/three/models.js`，四个战场和领域均纳入启动预加载。加载战场失败时保留原程序布景作为回退。领域使用新 GLB 替换线框球，仍由原 `soulDomainUntil` 控制 0.2 秒显示，没有改动伤害、剧情或技能时长。

巡览：启动开发服务器后访问 `/tools/arena-preview.html`，下拉选择四个新战场或真人领域。

验证：五份实际 GLB 通过 GLTFLoader 解析、独立碰撞体和中央出生／战斗通道检查、碎石原点检查；怀玉、涩谷及原剧情测试通过，Vite 构建通过。Blender 五张预览和浏览器内领域、高专、涩谷场景均检查。尚未进行移动设备硬件帧率测量。
