<div align="center">

```
███████╗██╗   ██╗██████╗ ██╗   ██╗██╗  ██╗██╗      ██████╗ ██████╗ ██████╗ ██████╗
██╔════╝██║   ██║██╔══██╗██║   ██║██║ ██╔╝██║      ██╔══██╗██╔══██╗██╔══██╗██╔══██╗
█████╗  ██║   ██║██████╔╝██║   ██║█████╔╝ ██║      ██████╔╝██████╔╝██████╔╝██████╔╝
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔═██╗ ██║      ██╔══██╗██╔══██╗ ██╔══╝ ██╔══██╗
██║     ╚██████╔╝██████╔╝╚██████╔╝██║  ██╗██║      ██████╔╝██████╔╝ ██║    ██║  ██║
╚═╝      ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═════╝  ╚═╝    ╚═╝  ╚═╝
                          // FUBUKI_BB · LV.999 PORTFOLIO
```

### Tactical HUD 风格个人作品集 · 独立 3D 节奏光剑页

[**▶ 在线访问 0xbb.me**](https://0xbb.me)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![three.js](https://img.shields.io/badge/three.js-r184-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org)
[![Bun](https://img.shields.io/badge/Bun-runtime-FBF0DF?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-9b7bff?style=for-the-badge)](./LICENSE)

</div>

---

## 项目简介

`0xbb.me` 是 **FUBUKI_BB** 的个人作品集站点。视觉走 **Tactical HUD**（军用抬头显示 / 驾驶舱遥测）路线：石墨黑底 `#0B0E12`、冰蓝 `#8FD3FF` 主色、琥珀 `#FFB454` 仅用于 LV.999 警示；48px 网格底纹、角括号取景框、四格 telemetry 数字条、缓慢扫描光带。首页 `/` 单屏紧凑呈现档案 / 状态 / 技能 / 项目；`/game/` 是独立页面，承载基于 three.js 的 **3D 双手节奏光剑** 小游戏（保留自有霓虹视觉），BGM 走 `public/music.ogg` 静态资源、切击 / 失误 SFX 由 Web Audio API 实时合成。

## 核心特性

- **Tactical HUD 视觉**：Chakra Petch 标题 + IBM Plex Mono 数据 + IBM Plex Sans 正文；冰蓝单主色、网格底纹、取景框角标、扫描光带。
- **紧凑单屏首页**：HERO + telemetry 面板、四格统计条、技能矩阵、项目部署一屏到底，无入站动画阻塞。
- **独立游戏页 `/game/`**：Vite 多页构建，three.js 只进游戏页 chunk，首页 bundle 零 3D 依赖。
- **3D 节奏光剑**：three.js 渲染的双轨光剑游戏，全键盘驱动，命中粒子 / LV.999 全连特效一应俱全。
- **混合音频管线**：BGM 加载 `public/music.ogg` 经 Web Audio AudioBufferSource 播放并附 fade-in/out；切击 / 失误 SFX 仍用 OscillatorNode 实时合成（chiptune 风格）。
- **纯函数判定核心**：判定窗口、连击、命中率、谱面生成全部由 `bun:test` 单测覆盖（PERFECT / GOOD / MISS）。
- **响应式布局**：桌面端 / 移动端均已适配，游戏页在移动端自动展示占位卡片。
- **bun 工作流**：依赖、脚本、测试、构建、CI 部署全程 bun。

## 节奏光剑玩法

| 手 | 按键 | 光剑 |
| --- | --- | --- |
| 左手 | `W` / `A` / `S` / `D` | 紫剑 |
| 右手 | `I` / `J` / `K` / `L` | 青剑 |

按键方向必须匹配方块上的箭头方向（W↑ / A← / S↓ / D→，右手同理）。判定分为 **PERFECT / GOOD / MISS**，全连达成即触发 LV.999 特效。

## 快速开始

```bash
bun install      # 安装依赖
bun run dev      # 启动开发服务器，访问 http://localhost:3000
bun run build    # 构建生产版本到 dist/
bun run preview  # 本地预览生产构建
bun test         # 运行游戏内核单元测试
```

> 仅依赖 [bun](https://bun.sh)，无需额外安装 Node.js 或其它包管理器。

## 项目结构

```text
0xbb.me/
├── components/
│   └── beat-saber/
│       ├── BeatSaberGame.tsx           # 3D 双手节奏光剑主组件
│       ├── BeatSaberPlaceholder.tsx    # 移动端 / 不支持环境的占位
│       ├── sceneAssets.ts              # three.js 场景资产工厂（方块 / 光剑 / 环境）
│       └── sceneAssets.test.ts         # 飞行公式纯函数测试
├── game/                               # 游戏页入口 + 与渲染无关的纯函数游戏内核
│   ├── index.html / main.tsx           # /game/ 独立页面入口
│   ├── types.ts                        # Note / BeatChart / Judgement 类型
│   ├── judge.ts / judge.test.ts        # 切击判定与连击计算
│   ├── scoring.ts / scoring.test.ts    # 分数 / 命中率 / 等级
│   ├── chart.ts / chart.test.ts        # 基于 BGM_BPM 与片段时长生成的默认谱面
│   └── chiptune.ts                     # BGM 文件加载播放器 + 切击/失误 SFX 合成
├── hooks/
│   └── useMediaQuery.ts                # 响应式断点 Hook
├── lib/
│   └── scrollToAnchor.ts               # 站内锚点平滑滚动（不污染 URL hash）
├── plugins/
│   └── htmlPlugin.ts                   # 按页面注入 metadata.json 到 <head> 的 Vite 插件
├── public/                             # 静态资源（profile.png / music.ogg / robots.txt / sitemap.xml ...）
├── App.tsx                             # 首页组件
├── data.ts                             # 个人资料 / 技能 / 项目数据
├── types.ts                            # 站点 TypeScript 类型
├── index.html                          # 首页模板（Tailwind CDN + Chakra Petch / IBM Plex）
├── index.tsx / index.css               # 首页入口 + HUD 主题样式（两页共用）
├── metadata.json                       # 站点元数据（被 htmlPlugin 注入到 <head>）
├── favicon.svg                         # 站点 favicon
├── vite.config.ts                      # Vite 配置
└── .github/workflows/deploy.yml        # GitHub Pages 自动部署
```

## 技术栈

| 层 | 技术 |
| --- | --- |
| UI 框架 | React 19 + TypeScript 5.8 |
| 构建 | Vite 6 多页（`/` + `/game/`），自定义 `htmlPlugin` 按页注入 metadata |
| 样式 | Tailwind CSS（CDN）；首页 Chakra Petch / IBM Plex Mono / IBM Plex Sans，游戏页 Orbitron / JetBrains Mono / Press Start 2P |
| 3D | three.js r184 |
| 音频 | Web Audio API：BGM 解码 `public/music.ogg`；SFX 实时合成 |
| 测试 | `bun:test` |
| 运行时 / 包管理 | bun |
| 部署 | GitHub Actions → GitHub Pages |

## 测试

游戏内核的判定、分数、谱面、合成器全部以纯函数方式实现，使用 `bun:test`：

```bash
bun test                       # 跑全部单元测试
bun test game/                 # 仅跑游戏内核
bun test components/beat-saber # 仅跑 three.js 场景纯函数
```

## 自定义配置

编辑 [`data.ts`](./data.ts) 即可改写个人资料、社交链接、技能矩阵和项目列表：

```typescript
export const APP_DATA = {
  profile: {
    name: "YOUR_HANDLE",
    role: "Your Role",
    status: "SYSTEM STATUS: ONLINE",
    location: "CITY",
    stats: { contributions: "♾️", uptime: "99.9%" },
    bio: "一段自我介绍……",
    avatar: "/profile.png",
    fullImage: "/profile-cyber.png",
    footer: "SYSTEM_ID: ...",
    copyright: "YOUR_HANDLE. ALL RIGHTS RESERVED.",
  },
  socialLinks: [
    { name: "GitHub", url: "https://github.com/...", icon: "GH" },
  ],
  skills: [
    { name: "Go (Golang)", level: 90, category: "Backend" }, // category: Frontend | Backend | DevOps | Tools
  ],
  projects: [
    {
      id: "1",
      title: "Project",
      description: "...",
      tech: ["React", "TypeScript"],
      status: "ONLINE",          // ONLINE | OFFLINE | DEVELOPMENT
      repo: "https://github.com/...",
      link: "https://...",
    },
  ],
};
```

站点 SEO / OG 元数据维护在 [`metadata.json`](./metadata.json)，构建时由 `plugins/htmlPlugin.ts` 注入到每个页面的 `<head>`（游戏页标题与 canonical 自动切换为 `/game/`）。

## 部署

`main` 分支推送即触发 [`deploy.yml`](./.github/workflows/deploy.yml)：bun 安装依赖 → `bun run build` → 上传 `dist/` → 发布到 GitHub Pages。生产构建产物为纯静态资源，同样可托管在 Vercel、Netlify、Cloudflare Pages 等平台。

## 开源协议

本项目采用 [MIT](./LICENSE) 协议。
