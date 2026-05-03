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

### 银狼「阿哈时刻」赛博电玩风格个人作品集

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

`0xbb.me` 是 **FUBUKI_BB** 的个人作品集站点。视觉灵感取自《崩坏：星穹铁道》「阿哈时刻 — 银狼 LV.999」官方短片：紫罗兰 / 品红粉 / 像素青三色配色、CRT 扫描线、像素故障字、终端 HUD。页面内嵌一款基于 three.js 的 **3D 双手节奏光剑** 小游戏，所有 BGM 与 SFX 由 Web Audio API 实时合成，零外部音频依赖。

## 核心特性

- **银狼紫粉视觉**：霓虹紫罗兰 + 品红粉 + 像素青配色，配合扫描线、动态像素网格、CRT 失真。
- **3D 节奏光剑**：three.js 渲染的双轨光剑游戏，全键盘驱动，命中粒子 / LV.999 全连特效一应俱全。
- **Web Audio Chiptune**：实时合成 8-bit BGM 与切击 / 失误 SFX，零音频资产、零版权风险。
- **纯函数判定核心**：判定窗口、连击、命中率、谱面生成全部由 `bun:test` 单测覆盖（PERFECT / GOOD / MISS）。
- **响应式布局**：桌面端 / 移动端均已适配，移动端自动展示游戏占位卡片。
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
│   ├── beat-saber/
│   │   ├── BeatSaberGame.tsx           # 3D 双手节奏光剑主组件
│   │   ├── BeatSaberPlaceholder.tsx    # 移动端 / 不支持环境的占位
│   │   ├── sceneAssets.ts              # three.js 场景资产工厂（方块 / 光剑 / 环境）
│   │   └── sceneAssets.test.ts         # 飞行公式纯函数测试
│   ├── CharacterVisual.tsx             # 角色视觉展示
│   ├── CyberLogo.tsx                   # 站点 logo
│   ├── GlitchText.tsx                  # 故障文字效果
│   └── ProjectCard.tsx                 # 项目卡片
├── game/                               # 与渲染无关的纯函数游戏内核
│   ├── types.ts                        # Note / BeatChart / Judgement 类型
│   ├── judge.ts / judge.test.ts        # 切击判定与连击计算
│   ├── scoring.ts / scoring.test.ts    # 分数 / 命中率 / 等级
│   ├── chart.ts / chart.test.ts        # 基于 BGM 拍点的默认谱面
│   └── chiptune.ts / chiptune.test.ts  # Web Audio 合成器与曲目数据
├── hooks/
│   └── useMediaQuery.ts                # 响应式断点 Hook
├── plugins/
│   └── htmlPlugin.ts                   # 注入 metadata.json 到 index.html 的 Vite 插件
├── public/                             # 静态资源（profile.png / robots.txt / sitemap.xml ...）
├── App.tsx                             # 主应用组件
├── data.ts                             # 个人资料 / 技能 / 项目数据
├── types.ts                            # 站点 TypeScript 类型
├── index.html                          # HTML 模板（Tailwind CDN + Orbitron / JetBrains Mono）
├── index.tsx / index.css               # 应用入口
├── metadata.json                       # 站点元数据（被 htmlPlugin 注入到 <head>）
├── favicon.svg                         # 站点 favicon
├── vite.config.ts                      # Vite 配置
└── .github/workflows/deploy.yml        # GitHub Pages 自动部署
```

## 技术栈

| 层 | 技术 |
| --- | --- |
| UI 框架 | React 19 + TypeScript 5.8 |
| 构建 | Vite 6（自定义 `htmlPlugin` 注入 metadata） |
| 样式 | Tailwind CSS（CDN）、Orbitron、JetBrains Mono |
| 3D | three.js r184 |
| 音频 | Web Audio API 实时合成 chiptune |
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

站点 SEO / OG 元数据维护在 [`metadata.json`](./metadata.json)，构建时由 `plugins/htmlPlugin.ts` 注入到 `<head>`。

## 部署

`main` 分支推送即触发 [`deploy.yml`](./.github/workflows/deploy.yml)：bun 安装依赖 → `bun run build` → 上传 `dist/` → 发布到 GitHub Pages。生产构建产物为纯静态资源，同样可托管在 Vercel、Netlify、Cloudflare Pages 等平台。

## 开源协议

本项目采用 [MIT](./LICENSE) 协议。视觉灵感来自《崩坏：星穹铁道》银狼角色相关二创，仅作个人作品集展示用途，与米哈游 / HoYoverse 无任何官方关联。
