---
id: T-50
title: 提交后复查旧代码、旧逻辑与临时材料
depends_on: [T-49]
files: [.gitignore, .pi-spec/.cache/t33-*, portfolio/models/player-voxel.ts, portfolio/models/player-voxel-black.ts, portfolio/models/player-voxel.test.ts, tests/model-fingerprint.ts, portfolio/copy.ts, components/portfolio/Hud.tsx, components/portfolio/WorldViewport.css, tests/character-toggle.test.ts, tests/legacy-removal.test.ts, package.json, bun.lock, README.md, artifacts/residue-audit.md, artifacts/game-progress.md, artifacts/release-report.md]
refs: [portfolio/player/AC-1, portfolio/site-entry/AC-5]
parallel: false
verify: bun run build && bun test ./portfolio/models/player-voxel.test.ts ./portfolio/character.test.ts ./portfolio/jump.test.ts ./portfolio/input.test.ts ./tests/legacy-removal.test.ts ./tests/portfolio-reading.test.ts ./tests/character-toggle.test.ts ./tests/portfolio-jump.test.ts ./tests/portfolio-appearance.test.tsx ./tests/portfolio-content.test.ts ./tests/portfolio-branding.test.tsx ./tests/portfolio-release.test.ts ./tests/portfolio-delivery.test.ts ./public-assets.test.ts && ./node_modules/.bin/tsc --noEmit --noUnusedLocals --noUnusedParameters
status: done
agent: ""
commit: ""
note: "USER-095/096。先提交59929d2，再清理42个旧对比缓存、旧临时首页HTML、预览提示及无引用文案/函数；黑装世界几何/法线/颜色/阴影属性指纹检查一致。82项相关测试通过，严格类型/未使用声明与冻结安装/构建通过。用户旧头像待确认，活动服务和索引不动。未再次提交/推送。"
---
## 边界
- 清理明确过时或无引用的代码与临时材料，不按文件年龄删除正式功能或验收证据。
- 黑装世界空间网格/法线/颜色/索引及阴影/材质属性按1e-6量化的SHA256为d33563e29c04ed6338dee1ef202df5847efd0f8bb81643d43c4e086550262793。
- 删除UI_COPY无人使用的重复章节字段、greeterPages别名、角色造型预览文案/样式；正式章节与操作说明保持。
- 包名称为mc2d-portfolio，锁文件只同步名称，没有依赖版本改动。
- 42个t33旧截图/源码快照/差异文件移除，原3000服务在写入的日志/PID不动；CodeGraph索引仍使用并忽略Git跟踪。
- 两张未发布、未跟踪的public旧头像是用户原文件，待明确确认后才能删；OneDrive原图和正式人设图不动。
- 全程无窗口验证，清理自己的临时草稿/清单/日志和dist，不推送或上线。
