<div align="center">

```
 ██████╗██╗   ██╗██████╗ ███████╗██████╗ ██████╗ ███████╗ ██████╗██╗  ██╗
██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║  ██║█████╗  ██║     █████╔╝
██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██║  ██║██╔══╝  ██║     ██╔═██╗
╚██████╗   ██║   ██████╔╝███████╗██║  ██║██████╔╝███████╗╚██████╗██║  ██╗
 ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝
```

### 赛博电玩风格个人作品集

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

</div>

---

## 项目简介

这是一个基于 React、TypeScript、Vite、Tailwind CSS 和 three.js 构建的个人作品集网站。整体风格参考《崩坏：星穹铁道》「阿哈时刻 — 银狼 LV.999」官方短片：紫罗兰 + 品红粉 + 像素青配色、像素故障文字、终端 HUD，并内置一个 3D 双手节奏光剑小游戏。

## 核心特性

- 银狼紫粉视觉：霓虹紫罗兰 + 品红粉 + 像素青配色、扫描线、动态像素网格、CRT 失真。
- 3D 节奏光剑：three.js 渲染的双轨光剑游戏，左手 `W A S D` / 右手 `↑ ← ↓ →`，方向需匹配方块箭头。
- Web Audio Chiptune：实时合成 8-bit BGM 与切击 / 失误 SFX，零外部音频资产、零版权风险。
- 纯函数判定核心：判定窗口、连击、命中率全部由 `bun:test` 单测覆盖（PERFECT/GOOD/MISS）。
- 响应式布局：适配桌面端和移动端页面展示。
- bun 工作流：统一使用 bun 安装依赖、运行脚本、跑测试和构建项目。

## 快速开始

### 前置要求

- Node.js 18 或更高版本
- bun

### 安装依赖

```bash
bun install
```

### 启动开发服务器

```bash
bun run dev
```

访问 `http://localhost:3000` 查看页面。

### 构建生产版本

```bash
bun run build
```

### 预览生产构建

```bash
bun run preview
```

## 技术栈

| 技术 | 用途 |
| --- | --- |
| React 19 | UI 框架 |
| TypeScript | 类型安全 |
| Vite 6 | 构建工具 |
| Tailwind CSS | 页面样式 |
| three.js | 节奏光剑 3D 渲染 |
| Web Audio API | 实时合成 chiptune BGM 与 SFX |
| bun:test | 判定 / 谱面 / 分数核心单元测试 |
| JetBrains Mono | 等宽字体 |
| Orbitron | 科幻标题字体 |

## 项目结构

```text
cyberdeck-portfolio/
├── components/                         # React 组件
│   ├── beat-saber/
│   │   ├── BeatSaberGame.tsx           # 3D 双手节奏光剑主组件
│   │   ├── sceneAssets.ts              # three.js 场景资产工厂（方块/光剑/环境）
│   │   └── sceneAssets.test.ts         # 飞行公式纯函数测试
│   ├── CharacterVisual.tsx             # 角色视觉展示
│   ├── GlitchText.tsx                  # 故障文字效果
│   └── ProjectCard.tsx                 # 项目卡片
├── game/                               # 与渲染无关的纯函数游戏内核
│   ├── types.ts                        # Note / BeatChart / Judgement 类型
│   ├── judge.ts / judge.test.ts        # 切击判定与连击计算
│   ├── scoring.ts / scoring.test.ts    # 分数 / 命中率 / 统计
│   ├── chiptune.ts / chiptune.test.ts  # Web Audio 合成器与曲目数据
│   └── chart.ts / chart.test.ts        # 基于 BGM 拍点的默认谱面
├── public/                             # 静态资源
├── data.ts                             # 页面数据配置
├── types.ts                            # 站点 TypeScript 类型
├── App.tsx                             # 主应用组件
├── index.tsx                           # 应用入口
├── index.html                          # HTML 模板（含 Tailwind CDN 配置）
└── vite.config.ts                      # Vite 配置
```

## 测试

判定 / 分数 / 谱面相关核心逻辑使用 bun 内置 test runner：

```bash
bun test            # 跑全部单元测试
bun test game/      # 仅跑游戏内核
```

## 自定义配置

编辑 `data.ts` 可以修改个人信息、社交链接、技能列表和项目列表。

```typescript
export const APP_DATA = {
  profile: {
    name: "你的名字",
    role: "你的职位",
    bio: "你的简介",
  },
  socialLinks: [
    { name: "GitHub", url: "你的 GitHub 链接", icon: "GH" },
  ],
  skills: [
    { name: "技能名称", level: 90, category: "Backend" },
  ],
};
```

## 部署

项目已配置 GitHub Pages 部署流程。生产构建产物位于 `dist/`，也可以部署到 Vercel、Netlify、Cloudflare Pages 等静态托管平台。

## 开源协议

本项目采用 MIT 协议，详见 `LICENSE` 文件。
