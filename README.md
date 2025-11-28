<div align="center">

```
 ██████╗██╗   ██╗██████╗ ███████╗██████╗ ██████╗ ███████╗ ██████╗██╗  ██╗
██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║  ██║█████╗  ██║     █████╔╝
██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██║  ██║██╔══╝  ██║     ██╔═██╗
╚██████╗   ██║   ██████╔╝███████╗██║  ██║██████╔╝███████╗╚██████╗██║  ██╗
 ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝
```

### 🌐 赛博朋克风格个人作品集 // CYBER_DECK_OS v9.2

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Integrated-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)

</div>

---

## 📡 项目简介

一个充满未来感的赛博朋克风格个人作品集网站,采用终端界面设计,集成 **Gemini AI** 智能对话功能。通过独特的视觉效果和交互体验,展示个人技能、项目和联系方式。

### ✨ 核心特性

- 🎨 **赛博朋克美学** - 霓虹色彩、扫描线效果、CRT 显示器风格
- 💬 **AI 智能终端** - 集成 Gemini AI,支持自然语言交互
- ⚡ **高性能构建** - 基于 Vite 的快速开发和构建体验
- 📱 **响应式设计** - 完美适配各种设备尺寸
- 🎯 **交互式命令行** - 模拟真实终端操作体验
- 🌈 **动态视觉效果** - 故障艺术、脉冲动画、扫描线等特效

---

## 🚀 快速开始

### 前置要求

- **Node.js** (推荐 v18 或更高版本)
- **pnpm** (推荐) 或 npm

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <your-repo-url>
   cd cyberdeck-portfolio
   ```

2. **安装依赖**

   ```bash
   pnpm install
   # 或使用 npm
   npm install
   ```

3. **配置 Gemini API**

   在项目根目录的 `.env.local` 文件中设置你的 Gemini API 密钥:

   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

   > 💡 获取 API 密钥: [Google AI Studio](https://ai.google.dev)

4. **启动开发服务器**

   ```bash
   pnpm dev
   # 或使用 npm
   npm run dev
   ```

5. **访问应用**

   打开浏览器访问: `http://localhost:5173`

---

## 🛠️ 技术栈

| 技术               | 用途         |
| ------------------ | ------------ |
| **React 19**       | UI 框架      |
| **TypeScript**     | 类型安全     |
| **Vite**           | 构建工具     |
| **Tailwind CSS**   | 样式框架     |
| **Gemini AI**      | AI 对话功能  |
| **JetBrains Mono** | 等宽字体     |
| **Orbitron**       | 赛博朋克字体 |

---

## 📦 项目结构

```
cyberdeck-portfolio/
├── components/          # React 组件
│   ├── CyberLogo.tsx   # Logo 组件
│   ├── Terminal.tsx    # 终端组件
│   └── ...
├── services/           # 服务层
│   └── gemini.ts       # Gemini AI 集成
├── data.ts             # 配置数据
├── types.ts            # TypeScript 类型定义
├── App.tsx             # 主应用组件
├── index.tsx           # 应用入口
├── index.html          # HTML 模板
└── vite.config.ts      # Vite 配置
```

---

## 🎮 终端命令

在终端界面中输入以下命令:

| 命令        | 功能              |
| ----------- | ----------------- |
| `help`      | 显示所有可用命令  |
| `about`     | 查看个人简介      |
| `projects`  | 列出项目列表      |
| `contact`   | 显示联系方式      |
| `ai [消息]` | 与 Gemini AI 对话 |
| `clear`     | 清空终端输出      |

---

## 🎨 自定义配置

### 修改个人信息

编辑 `data.ts` 文件来自定义你的个人信息:

```typescript
export const APP_DATA = {
  profile: {
    name: "你的名字",
    role: "你的职位",
    bio: "你的简介",
    // ...
  },
  socialLinks: [
    { name: "GitHub", url: "你的GitHub链接", icon: "GH" },
    // ...
  ],
  skills: [
    { name: "技能名称", level: 90, category: "分类" },
    // ...
  ],
  // ...
};
```

### 修改 AI 人设

在 `data.ts` 的 `ai.systemInstruction` 中自定义 AI 助手的人设和行为。

---

## 📝 可用脚本

```bash
# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

---

## 🚢 部署

### GitHub Pages

项目已配置 GitHub Actions 自动部署。推送到主分支即可自动部署到 GitHub Pages。

### 其他平台

构建生产版本后,将 `dist` 目录部署到任何静态网站托管服务:

```bash
pnpm build
# dist/ 目录包含所有静态文件
```

支持的平台: Vercel, Netlify, Cloudflare Pages 等。

---

## 🎯 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

> 💡 为获得最佳体验,建议使用最新版本的现代浏览器。

---

## 📄 开源协议

本项目采用 MIT 协议 - 详见 LICENSE 文件

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

---

<div align="center">

**SYSTEM*ID: 0xBBf // CONSTRUCTED_WITH_REACT*&\_TAILWIND**

Made with 💜 by [FUBUKI_BB](https://github.com/0xBB2b)

```
[SYSTEM_STATUS: ONLINE] // [UPTIME: 99.9%] // [NEURAL_NET: ACTIVE]
```

</div>
