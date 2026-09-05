---
id: T-11
title: M1 页面身份及纯矢量分享引用
depends_on: []
files: [/Users/bb/Projects/0xbb.me/metadata.json, /Users/bb/Projects/0xbb.me/plugins/htmlPlugin.ts, /Users/bb/Projects/0xbb.me/plugins/htmlPlugin.test.ts]
refs: [portfolio/site-entry/AC-2, portfolio/site-entry/AC-6]
parallel: true
verify: cd /Users/bb/Projects/0xbb.me && bun test ./plugins/htmlPlugin.test.ts
status: doing
step: test
agent: wf_e71166872bcb
commit: ""
note: ""
---
## 1. 目标
使页面标题、说明与结构化身份指向探索个人主页，移除游戏元数据分支和位图分享引用。
## 2. 业务规则
- C-2：系统应使用包含 FUBUKI_BB 的个人主页标题及与工程、AI 工作流和探索个人主页相符的页面说明，不以节奏光剑游戏作为站点身份或介绍。
- C-6：如果本站图形以内联数据、矢量文件或外部链接形式呈现，系统仍应仅使用程序化或纯矢量内容，不得嵌入或引用位图，也不得通过 Base64、修改扩展名或 SVG 容器绕过限制。
### AC-2 页面身份 ← C-2
- 触发: 操作 查看根页面标题与页面说明。
- Given: 根页面已加载。
- When: 访客查看浏览器标题与对外提供的页面描述。
- Then: 标题包含 FUBUKI_BB，说明与工程、AI 工作流和探索个人主页相符，不把本站描述为节奏光剑游戏。
### AC-6 不以编码或容器嵌入位图 ← C-6
- 触发: 操作 在浏览器中访问所有场景和阅读界面，检查收到的图形响应、SVG 内容、样式图形引用及内联图形数据。
- Given: 构建产物由静态服务提供，浏览器能记录本站资源请求和响应内容。
- When: 核对图形内容而非仅文件后缀，展开矢量或内联图形数据，检查本站图形的外部引用。
- Then: 不存在 Base64 位图、SVG 内嵌位图、被伪装格式的位图或外链位图；即使没有图片网络请求，内联内容也满足无位图要求。
## 3. 涉及文件
- 修改 `/Users/bb/Projects/0xbb.me/metadata.json`、`/Users/bb/Projects/0xbb.me/plugins/htmlPlugin.ts`。
- 新建 `/Users/bb/Projects/0xbb.me/plugins/htmlPlugin.test.ts`。
## 4. 成品定义
metadata.json 完整成品：
```json
{
  "name": "FUBUKI_BB",
  "description": "Explore FUBUKI_BB's HD-2D portfolio: full-stack engineering, system architecture and AI workflows, introduced through a playable world and NPC conversations.",
  "keywords": ["FUBUKI_BB", "Full Stack Engineer", "System Architect", "AI workflows", "HD-2D Portfolio", "Go", "Docker", "Tokyo", "Shanghai"],
  "author": {
    "name": "FUBUKI_BB",
    "email": "bb@yorha.xyz",
    "github": "https://github.com/0xBB2b",
    "role": "Full Stack Engineer & AI Explorer"
  },
  "siteUrl": "https://0xbb.me",
  "social": {
    "github": "https://github.com/0xBB2b",
    "linkedin": "https://www.linkedin.com/in/0xbb2b",
    "email": "mailto:bb@yorha.xyz"
  },
  "image": "/favicon.svg",
  "locale": "en_US",
  "themeColor": "#8fd3ff"
}
```
## 6. 函数清单
- htmlPlugin.ts：htmlPlugin，注入单主页标题、描述、canonical、社交卡片和个人/网站结构化数据，不提供游戏路径特例；删除未经事实支持的雇佣关系声明。
## 7. 协作关系
沿用现有 favicon.svg 作为纯矢量图形引用，测试须核验实际内容而不是假设扩展名足够；不修改 favicon 或新增图形依赖。T-10 负责模板，T-24 对完整构建验收。
## 8. 验证方式
- 测试写入授权：仅新增或修改 `/Users/bb/Projects/0xbb.me/plugins/htmlPlugin.test.ts`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./plugins/htmlPlugin.test.ts`。
- 公开验证入口：`plugins/htmlPlugin.ts` 导出的 htmlPlugin 所提供的 HTML 转换钩子及其输出标签/JSON-LD；输入根页面、`/game/` 转换上下文及元数据读取失败，按下列预期观察页面身份和实际图形引用，不读取实现来决定预期。
- 公开 Vite 插件 HTML 转换入口处理根页面：解析实际输出标签/JSON-LD，标题含 FUBUKI_BB，描述涵盖工程、AI 工作流和探索主页；网站身份无 CyberDeck/RHYTHM_BLADE，无虚构雇佣声明。
- 输入 /game/ 转换上下文不产生游戏标题、游戏 canonical 或游戏引导；单主页 canonical 正确。
- 展开所有输出 image 引用：实际 SVG 为纯矢量，无位图外链、内嵌 image 或编码位图；旧 profile.png 引用消失。
- 元数据读取失败沿现有错误处理可报告错误，不生成游戏身份或位图兜底。完整浏览器网络/内联内容由 T-24 复核。
