---
id: T-12
title: M1 原始设计参考迁出发布目录
depends_on: []
files: [/Users/bb/Projects/0xbb.me/public/profile-full.png, /Users/bb/Projects/0xbb.me/design-reference/profile-full.png, /Users/bb/Projects/0xbb.me/design-reference/reference.test.ts]
refs: [portfolio/site-entry/AC-5]
parallel: true
verify: cd /Users/bb/Projects/0xbb.me && bun test ./design-reference/reference.test.ts
status: doing
step: test
agent: wf_dd5536b4712c
commit: ""
note: ""
---
## 1. 目标
将原始人物设定图逐字节迁至非发布参考目录，不删除或覆盖原始内容。
## 2. 业务规则
- C-5：系统应仅用程序化图形或纯矢量 SVG 交付主人公、NPC、背景、道具、特效、头像、图标及交互 UI，动画由代码驱动；成品不得包含 PNG、JPEG/JPG、WebP、GIF、BMP、AVIF、TIFF 等位图素材或位图精灵表。正常屏幕栅格化不视为位图素材，设计参考及测试截图不得进入发布产物。
### AC-5 无位图的图形成品 ← C-5
- 触发: 命令 bun run build，并检查生成的图形产物和完整页面。
- Given: 构建成功，桌面和触屏均可访问全部场景、NPC 与阅读界面。
- When: 检查构建产物的实际图形格式，操作主人公、NPC、全部场景和交互 UI，查看头像、图标与页面图形引用。
- Then: 所有成品图形为程序化图形或纯矢量 SVG，行走及交互动画正常；位图文件与位图精灵表数量为 0，原始设计参考和测试截图没有进入发布产物。
授权边界：public/profile-full.png 为 1696×2528 RGB PNG，仅供设计参考，不导入应用、不改图、不覆盖已有不同内容的目标。
## 3. 涉及文件
- 迁移 `/Users/bb/Projects/0xbb.me/public/profile-full.png` → 新建 `/Users/bb/Projects/0xbb.me/design-reference/profile-full.png`，两个路径均归本任务。
- 新建 `/Users/bb/Projects/0xbb.me/design-reference/reference.test.ts`。
## 6. 函数清单
无生产函数；测试保存执行前原图摘要并验证迁移后的同一字节内容。
## 7. 协作关系
T-3 只读取设计参考，不能作为成品素材；Vite 默认不会复制仓库根下未引用的 design-reference。禁止为迁移改变 Vite publicDir 或引入复制插件。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/design-reference/reference.test.ts`；测试阶段不得移动、改写或删除原图，不修改任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./design-reference/reference.test.ts`。
- 公开文件交付目标：源 `/Users/bb/Projects/0xbb.me/public/profile-full.png` 迁至 `/Users/bb/Projects/0xbb.me/design-reference/profile-full.png`。允许读取源图作为 Given 输入，记录执行前 SHA-256、1696×2528、RGB PNG 以验证字节保真；不得重新编码、覆盖不同目标或创建运行位图。
- 文件迁移公开结果：原 public 路径不在，目标原图存在；与执行前原图 SHA-256、尺寸、RGB 格式完全一致，不以重新编码替代无损迁移。
- 若目标已有不同文件或源缺失，停止报告，不覆盖、不造图；测试应明确失败而非跳过。
- M1 build 完成后检查真实构建内容无该图摘要/位图内容与引用，浏览器角色和头像不请求原图；全量 AC-5 由 T-24 覆盖。
