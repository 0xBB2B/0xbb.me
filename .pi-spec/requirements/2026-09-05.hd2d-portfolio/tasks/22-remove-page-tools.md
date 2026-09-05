---
id: T-22
title: M3 移除旧页面专属工具
depends_on: [T-9, T-15]
files: [/Users/bb/Projects/0xbb.me/hooks/useMediaQuery.ts, /Users/bb/Projects/0xbb.me/lib/scrollToAnchor.ts, /Users/bb/Projects/0xbb.me/page-tools-removal.test.ts]
refs: [portfolio/responsive-layout/AC-2]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./page-tools-removal.test.ts && bun run build
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 清除旧游戏设备限制 Hook 和旧 HUD 锚点滚动，不影响新主页触屏探索与阅读。
## 2. 业务规则
- C-2：在触屏操作期间，系统应提供可触达的左右行走按钮和交谈操作；在桌面操作期间，系统应提供 A/D 或左右方向键行走及 E 交谈的说明。
### AC-2 对应设备操作 ← C-2
- 触发: 操作 在桌面检查说明，在触屏模式使用左右与交谈控件。
- Given: 三种指定视口均可访问，手机视口使用触屏输入。
- When: 桌面访客根据说明操作，触屏访客通过屏幕按钮走到 NPC 旁并交谈。
- Then: 两类访客均可移动和交谈；触屏不出现要求改用桌面才能探索的占位说明。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/hooks/useMediaQuery.ts`、`/Users/bb/Projects/0xbb.me/lib/scrollToAnchor.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/page-tools-removal.test.ts`。
## 6. 函数清单
删除 useMediaQuery、handleAnchorClick 和文件内部专属辅助函数；无替代生产函数。
## 7. 协作关系
原调用者 App/GamePage 已由 T-9/T-15 替换或删除；新布局在各组件/CSS、输入在 portfolio/input 内完成，不引用这两个旧文件。
## 8. 验证方式
- 测试写入授权：M3 获授权后，仅新增或修改 `/Users/bb/Projects/0xbb.me/page-tools-removal.test.ts`；测试阶段不得删除生产文件或修改任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./page-tools-removal.test.ts && bun run build`。
- 公开文件交付目标：`/Users/bb/Projects/0xbb.me/hooks/useMediaQuery.ts`、`/Users/bb/Projects/0xbb.me/lib/scrollToAnchor.ts` 不存在；通过网页 `/` 的键盘说明、触屏控件和速览入口核对行为仍满足业务规则。
- 两个指定文件不存在，构建成功，新 UI 公开输出仍有键盘说明与触屏控件。
- ego-browser 在 1440×900 键盘、390×844 与 844×390 触屏操作向左/右移动及交谈均正常；点击速览不再依赖旧页面锚点或跳转游戏页。
- 若仍有新代码依赖旧工具，停止交主 agent 归因，不能将删除改成新增适配或跨文件修复。
