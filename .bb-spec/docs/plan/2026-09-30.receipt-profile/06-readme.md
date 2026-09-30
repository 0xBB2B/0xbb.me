---
name: 06-readme
description: README 改为描述小票资料、独立资料页与三维暂停，删除三段资料与隐藏英文资料的说法
---
# README 同步

## 目标
README 描述的是现在的网站：点铭牌看小票；加载慢时去 `/profile/`；资料视角下三维暂停。

## 业务规则（来源：spec receipt、profile-page、loading-shell、story-pause、static-profile-html）
- 点铭牌后，镜头推到店门口，三维画面暂停并变暗，一张便利店小票从上方掉下来；点小票上的头像弹出全身照相片；按 Esc 或「返回全景」退出。
- 加载页的「先看资料」是链接，打开不带三维的独立资料页 `/profile/`，页面上是同一张小票。
- 三维失败时，原页面直接显示小票，并提示「3D 场景无法加载」。
- 首页不再内置隐藏的英文资料；搜索引擎通过 `/profile/` 读到资料正文，`sitemap.xml` 列出两个地址。
- README 不得出现过渡式写法（`tests/current-docs.test.ts` 会检查）。

## 涉及文件
- 修改 `README.md`：
  - 第 3 行「镜头就会分三段移动…」这句简介；
  - 「资料视角」操作说明表，删掉滚动翻段、`PageDown` 等说法；
  - 「三段资料依次是…」这一段；
  - 第 42–44 行，关于「先看资料」按钮和隐藏英文资料的说明；
  - 目录表里 `components/` 的说明：改为加载页、三维画面容器、小票、全身照相片、资料视角外层、独立资料页、键盘用的「查看资料」按钮；
  - 新增一行：`profile/`、`profile.tsx` 是独立资料页的入口。

## 函数清单
无代码。

## 协作关系
依赖 01–05 全部完成，README 描述的是最终行为。

## 验证方式
- 测试入口：`bun test tests/current-docs.test.ts`；人工核对 README 与现状一致。
- 预期结果：
  - [ ] README 不含「三段」「翻一段」「进度点」「SCROLL」「不依赖脚本的英文资料」。
  - [ ] README 提到小票、全身照相片、`/profile/`、资料视角下三维暂停。
  - [ ] `tests/current-docs.test.ts` 通过。
