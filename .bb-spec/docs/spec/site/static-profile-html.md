---
name: static-profile-html
description: 首页与独立资料页的搜索、分享元信息，站点地图，以及首页不藏看不见的资料文字
---

# 搜索与分享信息

## 目的
搜索引擎和分享预览要能读到站主是谁：首页负责元信息，个人资料正文由独立资料页 `/profile/` 用可见的静态文字提供。

## 逻辑
- 首页构建产物 `index.html` 的 `<head>` 输出以下元信息：
  - `<title>`：`FUBUKI_BB — Engineering, AI Workflows & Exploration`；
  - `description`、`keywords`、`author`、`theme-color`；
  - `canonical`：`https://0xbb.me`；
  - Open Graph 与 Twitter 卡片（大图卡片），分享图为 `https://0xbb.me/profile.jpg`；
  - 两段 JSON-LD：`Person`（名字、网址、头像、社交主页、职位、邮箱、描述）和 `WebSite`。
- `description` 与 JSON-LD 描述用一句话介绍站主，并提到雨夜便利店微缩模型；不出现旧站点的「可玩主页」「漫步」「灯塔」等说法。
- 首页正文里不放隐藏的资料文字：没有 `hidden`、`display:none` 或移到屏幕外的个人资料段落。首页上能被爬虫顺着找到资料的入口，是加载页里指向 `./profile/` 的「先看资料」链接。
- 个人资料正文（名字、职位、所在地、简介第一段、方向、四个链接）以可见的静态文字写在 `dist/profile/index.html` 里。
- `sitemap.xml` 列出两个地址：`https://0xbb.me/` 和 `https://0xbb.me/profile/`；`robots.txt` 允许全部抓取并指向该站点地图。
- 构建产物中不引用外部域名的脚本或样式表。

## 约束
- 首页 `<title>` 与上文完全一致。
- 首页 `og:image` 与 `twitter:image` 均为 `https://0xbb.me/profile.jpg`。
- 首页存在 `Person` 与 `WebSite` 两段合法 JSON-LD。
- 首页和独立资料页的构建产物中不出现 "playable"、"walk"、"lighthouse"、「灯塔」等旧站点描述。
- 首页 `index.html` 中不含简介第一段英文正文，也没有带 `hidden` 属性或被样式隐藏的个人资料段落。
- 首页包含 `href="./profile/"` 的链接。
- 禁用脚本打开 `dist/profile/index.html`，文本中能找到 `FUBUKI_BB`、`Full Stack Engineer`、简介第一段英文全文、四个链接地址。
- `sitemap.xml` 恰好含两个 `<loc>`：`https://0xbb.me/` 与 `https://0xbb.me/profile/`。
- 首页与独立资料页中没有指向外部域名的 `<script src>` 或样式表链接。

## 例子
- 搜索引擎爬虫抓取 `https://0xbb.me/`，读到标题「FUBUKI_BB — Engineering, AI Workflows & Exploration」和描述，顺着「Read the profile first」链接抓到 `/profile/`，在那里读到职位、简介和 GitHub 链接。
- 有人把首页链接分享到社交平台，预览卡片显示 `profile.jpg` 头像。

## 验收
- [ ] 首页 `<title>`、`canonical`、`og:image`、`twitter:image` 与约束一致。
- [ ] 首页存在 `Person` 与 `WebSite` 两段合法 JSON-LD。
- [ ] `dist/index.html` 与 `dist/profile/index.html` 中搜索不到 "playable"、"walk"、"lighthouse"、「灯塔」。
- [ ] `dist/index.html` 中不含简介第一段英文正文，且含 `href="./profile/"`。
- [ ] 解析 `dist/profile/index.html` 纯文本，包含名字、职位、简介第一段英文、四个链接地址。
- [ ] `sitemap.xml` 恰好两个 `<loc>`：首页与 `/profile/`。
- [ ] 两个页面都没有外部域名的脚本或样式表引用。
