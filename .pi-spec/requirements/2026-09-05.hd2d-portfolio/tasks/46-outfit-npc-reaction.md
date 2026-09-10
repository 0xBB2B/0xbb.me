---
id: T-46
title: 服装切换文案与一次性NPC彩蛋
depends_on: [T-45]
files: [App.tsx, portfolio/state.ts, portfolio/runtime.ts, portfolio/copy.ts, portfolio/npc-reaction.ts, components/portfolio/Hud.tsx, components/portfolio/NpcReaction.tsx, components/portfolio/NpcReaction.css, tests/portfolio-outfit-reaction.test.tsx, tests/portfolio-outfit-journey.test.ts]
refs: [portfolio/npc-dialogue/AC-8, portfolio/player/AC-11, portfolio/bilingual/AC-2]
parallel: false
verify: bun test ./tests/portfolio-outfit-reaction.test.tsx ./tests/portfolio-outfit-journey.test.ts && ./node_modules/.bin/tsc --noEmit && bun run build
status: done
agent: ""
commit: ""
note: "USER-082/083；最终感叹号1秒。状态/组件和真实中英往返、刷新及触屏检查通过，静态4173再次通过；全量200项功能测试通过，唯一失败为独立发布性能门槛。后续修改未再次提交或发布。"
---
## 业务规则
- 按钮显示“切换服装 / Switch outfit”，右侧仍无名字。
- 穿A服装、在迎宾者范围内主动交谈，且该页面尚未触发时，播放一次反应。
- 1秒感叹号 → 约1.2秒逐字显示赞美 → 完整文字停留约1.2秒 → 恢复交谈。
- 气泡沿用真实NPC头顶的世界到屏幕定位，不是固定角落通知或正式阅读弹窗。
- 反应期间暂停人物、隐藏普通交谈按钮，并在状态层拒绝交谈/换装/其它阅读重入；完整结束后再次交谈才打开世界观。
- 普通黑装交谈、范围外输入不消耗彩蛋；切换回黑装再换A不重置标志；刷新创建新会话可再次触发，无持久化存储。
- 时钟使用真实经过时间，不因移动物理时间步长上限把1秒拖长；只在文字变化时更新UI。
- 中英按相同进度显示；辅助阅读仅宣布惊讶和完整句子，不逐字重复朗读。
- 减少动态偏好禁用感叹号弹动；图形故障取消反应并保持完整资料可读。

## 验证
- 初始Red针对现有openDialogue：穿A仍直接打开世界观，符合可观察失败，而非缺失模块。
- 状态测试覆盖首次触发/锁定/结束/再次交谈/刷新/黑装/范围外/故障取消。
- 组件测试覆盖0.99秒仍惊讶、1秒进入打字、部分文本、完整中英文本。
- 真实浏览器从起点走到灯塔换装，再返回NPC；中英各一次，第二次经过真实刷新，手机使用真实触屏点击。
- 记录全部文本阶段、1秒间隔、完整停留、可见范围及锁定状态；不注入角色位置或彩蛋完成标志。
