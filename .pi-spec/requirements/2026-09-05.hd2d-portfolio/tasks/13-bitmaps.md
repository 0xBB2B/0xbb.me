---
id: T-13
title: M1 移除运行位图素材
depends_on: []
files: [/Users/bb/Projects/0xbb.me/public/profile.png, /Users/bb/Projects/0xbb.me/public/profile-cyber.png, /Users/bb/Projects/0xbb.me/public-assets.test.ts]
refs: [portfolio/site-entry/AC-5, portfolio/site-entry/AC-6]
parallel: true
verify: cd /Users/bb/Projects/0xbb.me && bun test ./public-assets.test.ts
status: failed
step: test
agent: wf_9d5062215c4b
commit: ""
note: "Test FAIL/blocked：验证方式未内联目标路径、授权测试文件和独立命令，尚未运行测试。AI-004：profile-cyber.png 为既有删除，不恢复制造 Red；profile.png 尚存在；不涉及 music.ogg。"
---
## 1. 目标
删除旧首页两张运行位图，确保样板不以文件改名或内嵌编码规避纯代码图形边界。
## 2. 业务规则
- C-5：系统应仅用程序化图形或纯矢量 SVG 交付主人公、NPC、背景、道具、特效、头像、图标及交互 UI，动画由代码驱动；成品不得包含 PNG、JPEG/JPG、WebP、GIF、BMP、AVIF、TIFF 等位图素材或位图精灵表。正常屏幕栅格化不视为位图素材，设计参考及测试截图不得进入发布产物。
- C-6：如果本站图形以内联数据、矢量文件或外部链接形式呈现，系统仍应仅使用程序化或纯矢量内容，不得嵌入或引用位图，也不得通过 Base64、修改扩展名或 SVG 容器绕过限制。
### AC-5 无位图的图形成品 ← C-5
- 触发: 命令 bun run build，并检查生成的图形产物和完整页面。
- Given: 构建成功，桌面和触屏均可访问全部场景、NPC 与阅读界面。
- When: 检查构建产物的实际图形格式，操作主人公、NPC、全部场景和交互 UI，查看头像、图标与页面图形引用。
- Then: 所有成品图形为程序化图形或纯矢量 SVG，行走及交互动画正常；位图文件与位图精灵表数量为 0，原始设计参考和测试截图没有进入发布产物。
### AC-6 不以编码或容器嵌入位图 ← C-6
- 触发: 操作 在浏览器中访问所有场景和阅读界面，检查收到的图形响应、SVG 内容、样式图形引用及内联图形数据。
- Given: 构建产物由静态服务提供，浏览器能记录本站资源请求和响应内容。
- When: 核对图形内容而非仅文件后缀，展开矢量或内联图形数据，检查本站图形的外部引用。
- Then: 不存在 Base64 位图、SVG 内嵌位图、被伪装格式的位图或外链位图；即使没有图片网络请求，内联内容也满足无位图要求。
## 3. 涉及文件
- 删除 `/Users/bb/Projects/0xbb.me/public/profile.png`、`/Users/bb/Projects/0xbb.me/public/profile-cyber.png`。
- 新建 `/Users/bb/Projects/0xbb.me/public-assets.test.ts`：静态资产测试放在 public 的父目录，避免测试进入发布产物。
## 6. 函数清单
无生产函数；测试通过公开发布文件结果验证所负责两张位图消失。
## 7. 协作关系
资料和页面引用分别由 T-1、T-9、T-11 所有者消除。profile-cyber.png 在规划前已经处于未提交删除，先由主 agent 核实归属后纳入任务快照，不归咎于本任务、不恢复或覆盖用户改动。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/public-assets.test.ts`；测试阶段不得删除、恢复或改写任何生产素材，不修改任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./public-assets.test.ts`。
- 公开文件交付目标：`/Users/bb/Projects/0xbb.me/public/profile.png`、`/Users/bb/Projects/0xbb.me/public/profile-cyber.png` 均应不存在；对应网站图形引用 `/profile.png`、`/profile-cyber.png` 应由样板集成检查确认不再请求。
- 初始事实（AI-004）：profile-cyber.png 在本任务前已删除，不得恢复它制造 Red；profile.png 尚存在，可据其尚未满足删除契约建立可信 Red。原始 profile-full.png 和 music.ogg 均不属于本任务，不得改动。
- 两个明确目标均不存在，无替代后缀或编码副本；文件移除测试不以其它任务尚未完成的页面引用清理作为自身 Red，样板集成检查按下述阶段执行。
- 本测试不放测试脚本、截图或位图夹具到 public；构建产物不得包含测试或非发布参考。
- 样板组合后构建及浏览器检查对应头像/人物均代码化，不请求这两个 URL；完整内容格式检查和全部场景 AC-5/6 由 T-24 执行。
