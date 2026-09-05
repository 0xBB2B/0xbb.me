---
id: T-10
title: M1 静态主页入口与模板
depends_on: [T-9]
files: [/Users/bb/Projects/0xbb.me/vite.config.ts, /Users/bb/Projects/0xbb.me/index.html, /Users/bb/Projects/0xbb.me/entry.test.ts]
refs: [portfolio/site-entry/AC-1, portfolio/site-entry/AC-3, portfolio/responsive-layout/AC-2]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./entry.test.ts
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
将根页作为静态探索入口，移除游戏构建分支与旧模板专属 CDN 配置，桌面及触屏均可用。
## 2. 业务规则
- site-entry/C-1：当访客打开 / 时，系统应默认加载探索世界，显示个人身份和操作引导，并提供无需行走即可进入的资料速览入口。
- site-entry/C-3：系统应通过命令 bun run build 生成可静态托管的页面与资源；访客浏览主页、交谈、切换语言和打开速览不需要账号、服务端存档或独立后端应用。
- responsive-layout/C-2：在触屏操作期间，系统应提供可触达的左右行走按钮和交谈操作；在桌面操作期间，系统应提供 A/D 或左右方向键行走及 E 交谈的说明。
### site-entry/AC-1 默认探索入口 ← C-1
- 触发: 请求 GET / 并在浏览器打开该页面。
- Given: 网站构建结果已由静态服务提供，图形条件正常。
- When: 访客首次打开根地址。
- Then: 默认体验是探索世界，有个人身份、操作引导和可直接进入的资料速览，不需要先打开独立游戏页。
### site-entry/AC-3 纯静态构建 ← C-3
- 触发: 命令 bun run build，并通过静态服务打开构建结果。
- Given: 已安装项目约定依赖，构建环境可用。
- When: 执行构建，再仅用静态服务访问主页、NPC 对话、语言切换和资料速览。
- Then: 构建退出码为 0；上述功能无需独立后端应用、登录或服务端存档即可使用。
### responsive-layout/AC-2 对应设备操作 ← C-2
- 触发: 操作 在桌面检查说明，在触屏模式使用左右与交谈控件。
- Given: 三种指定视口均可访问，手机视口使用触屏输入。
- When: 桌面访客根据说明操作，触屏访客通过屏幕按钮走到 NPC 旁并交谈。
- Then: 两类访客均可移动和交谈；触屏不出现要求改用桌面才能探索的占位说明。
## 3. 涉及文件
- 修改 `/Users/bb/Projects/0xbb.me/vite.config.ts`、`/Users/bb/Projects/0xbb.me/index.html`。
- 新建 `/Users/bb/Projects/0xbb.me/entry.test.ts`：构建结果静态入口验证。
## 4. 成品定义
vite.config.ts 完整配置：
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { htmlPlugin } from './plugins/htmlPlugin';
import path from 'path';
export default defineConfig({
  base: './',
  server: { port: 3000, host: '0.0.0.0' },
  plugins: [react(), htmlPlugin()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```
index.html 完整模板：
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index, follow" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```
## 6. 函数清单
- 配置与模板均无新增函数；复用现有 htmlPlugin。
## 7. 协作关系
App 由原 index.tsx 挂载；T-11 负责注入元数据；既有纯静态平台不改。T-15 拥有旧 game 源入口删除。本任务仅移除构建分支，不宣称已完成源码清理。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/entry.test.ts`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun run build && bun test ./entry.test.ts`。
- 公开验证目标：构建交付的 `dist/index.html`、它实际引用的资源和静态网页 `/`，不是配置源码；通过键盘与触屏操作验证入口，不把读取模板或配置片段当作运行结果。
- 执行 build 后读取真实 dist/index.html 及其引用模块：引用存在、根页入口唯一、无 game 构建页面；不根据配置源码字符串推断结果。
- 仅静态服务运行 dist，用 ego-browser 请求 /：身份、世界、操作引导与速览可用；无登录和服务端状态请求。
- 1440×900 键盘按说明行走交谈，390×844/844×390 触屏长按左右并交谈，均非占位。
- M1 整体行为、故障和画面还需浏览器实证；T-11～T-13 完成后再检查样板无位图；M3 T-24 重跑完整三景构建验收。
