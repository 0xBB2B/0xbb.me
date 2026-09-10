# 任务记录索引

当前产品行为以[现行规范](../../../spec/INDEX.md)为准。以下链接记录各任务执行时的范围和结果；历史正文不是额外的当前实现要求。任务状态以各文件frontmatter为准。

## 人物与可玩入口
- [T-27 可操控城镇](27-playable-town.md)
- [T-28 NPC与双语阅读](28-npc-reading.md)
- [T-29 静态样板与故障阅读](29-static-sample.md)
- [T-35 黑装人物尺寸与表情](35-single-black-player.md)
- [T-36 靴子细节](36-remove-boot-charms.md)

## 世界与资料
- [T-30 三景旅程与内容入口](30-three-scene-journey.md)
- [T-37 工坊与海岸](37-neon-coast.md)
- [T-38 数据工厂与荧光海](38-data-factory-glowing-sea.md)
- [T-39 工厂房门](39-enter-data-room.md)
- [T-40 房间与海岸画面](40-room-coast-polish.md)
- [T-41 阅读与灯塔题记](41-reading-horizon-lighthouse.md)
- [T-42 NPC与世界观](42-resident-lore-design.md)
- [T-43 人设图、技能实践与章节排版](43-persona-practice-chapters.md)

## 动作与交互
- [T-44 MC-2D标识、快跑与服装](44-mc2d-characters-polish.md)
- [T-45 快跑身体起伏](45-gentler-running-bob.md)
- [T-46 一次性服装彩蛋](46-outfit-npc-reaction.md)
- [T-49 空格跳跃与起跳姿势](49-desktop-jump.md)

## 验证与工作区
- [T-31 发布源码范围](31-remove-rhythm-game.md)
- [T-32 本地发布检查](32-release-verification.md)
- [T-47 静态合批与无窗口验证](47-static-batches-silent-validation.md)
- [T-48 设计资源与图标检查](48-clean-design-and-favicon.md)
- [T-50 代码与临时材料审计](50-residue-audit.md)
- [T-51 现行文档与注释一致性](51-current-documentation.md)

## 执行规则
- 每项任务明确文件范围、验收条件、验证命令和结果，任务说明不超过200行。
- 有依赖的改动串行执行；并行任务写入范围不重叠。
- 验证针对实际行为，不使用空实现或人为破坏功能制造失败。
- 测试通过不代表已推送、上线或完成未执行的人工检查。
