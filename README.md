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

这是一个基于 React、TypeScript、Vite 和 Tailwind CSS 构建的个人作品集网站。主页采用霓虹紫青配色、像素切角、故障文字和电玩 HUD 风格，并内置一个可玩的迷你打飞机游戏。

## 核心特性

- 赛博电玩视觉：霓虹配色、扫描线、动态网格和像素化界面。
- 迷你打飞机游戏：左右方向键移动，空格键发射子弹。
- 响应式布局：适配桌面端和移动端页面展示。
- 项目展示区：集中展示作品、技术栈、仓库和访问入口。
- bun 工作流：统一使用 bun 安装依赖、运行脚本和构建项目。

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
| Vite | 构建工具 |
| Tailwind CSS | 页面样式 |
| Canvas | 迷你游戏渲染 |
| JetBrains Mono | 等宽字体 |
| Orbitron | 科幻标题字体 |

## 项目结构

```text
cyberdeck-portfolio/
├── components/              # React 组件
│   ├── ArcadeShooter.tsx    # 迷你打飞机游戏
│   ├── CharacterVisual.tsx  # 角色视觉展示
│   ├── GlitchText.tsx       # 故障文字效果
│   └── ProjectCard.tsx      # 项目卡片
├── public/                  # 静态资源
├── data.ts                  # 页面数据配置
├── types.ts                 # TypeScript 类型定义
├── App.tsx                  # 主应用组件
├── index.tsx                # 应用入口
├── index.html               # HTML 模板
└── vite.config.ts           # Vite 配置
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
