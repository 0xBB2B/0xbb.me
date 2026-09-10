---
id: T-52
title: 公开图片与静态构建确认
depends_on: [T-51]
files: [public/profile.png, public/profile.jpg, vite.config.ts, public-assets.test.ts, tests/portfolio-release.test.ts, tests/public-images.test.ts, README.md, artifacts/game-progress.md, artifacts/release-report.md, artifacts/residue-audit.md]
refs: [portfolio/site-entry/AC-3, portfolio/site-entry/AC-5, portfolio/site-entry/AC-6]
parallel: false
verify: bun install --frozen-lockfile && bun run build && bun test ./public-assets.test.ts ./tests/portfolio-release.test.ts ./tests/public-images.test.ts ./tests/portrait-asset.test.ts ./tests/current-docs.test.ts && ./node_modules/.bin/tsc --noEmit --noUnusedLocals --noUnusedParameters
status: done
agent: ""
commit: ""
note: "USER-098；三张图片以固定URL公开，无窗口实际解码通过；9项相关测试、严格类型检查通过。待提交Git快照在临时独立目录冻结安装/构建成功，图片原字节一致；Actions配置采用Ubuntu+Bun构建并上传dist。本轮本地提交，不推送/上线，未触发远程Actions。"
---
## 行为
- profile-full.png、profile.png、profile.jpg原字节进入dist，根目录部署可直接访问同名URL，子目录部署使用对应前缀。
- 资料速览继续使用profile-full.png；公开URL不等于将另外两张图片添加到资料UI或三维模型。
- 图形容器检查仍拒绝未授权位图、模型贴图及伪装图片，三张公开图按精确路径与SHA256核对。
- Actions执行冻结依赖安装和bun run build，上传dist并交给GitHub Pages部署。编译不需要开发服务器、浏览器测试或后端。
- main推送触发工作流，GitHub Pages来源需设置为GitHub Actions；本轮只本地验证和提交，不触发远程流水线。

## 验证
- 发布图片存在/字节一致的断言在修改构建配置前失败，配置后通过。
- HTTP根路径/子目录路径共6个图片URL返回200及正确图片类型，原字节一致，无窗口浏览器实际解码通过。
- 本地冻结安装、构建、相关测试和严格类型检查通过。
- Git快照干净构建用于确认没有依赖本机未跟踪文件；这不是GitHub托管runner的实际运行记录。
