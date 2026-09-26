---
name: static-profile-html
description: 构建产物不执行脚本即可读到的个人信息，以及搜索、分享元信息与站点地图
---

# 静态个人信息与搜索信息

## 目的
个人资料在三维画面和中控屏里，搜索引擎和分享预览读不到。所以构建产物里必须直接带上纯文字资料和元信息。

## 逻辑
- 构建产物 `index.html` 在不执行任何脚本时，就包含简介卡片的完整文字内容（英文版）：
  - 名字 `FUBUKI_BB`；
  - 三个职位；
  - 所在地；
  - 四个方向；
  - 简介第一段；
  - 四个链接（`<a href>` 形式）。
  这段内容平时隐藏，由简介卡片使用。
- `<head>` 输出以下元信息：
  - `<title>`：`FUBUKI_BB — Engineering, AI Workflows & Exploration`；
  - `description`、`keywords`、`author`、`theme-color`；
  - `canonical`：`https://0xbb.me`；
  - Open Graph 与 Twitter 卡片（大图卡片），分享图为 `https://0xbb.me/profile.jpg`；
  - 两段 JSON-LD：`Person`（名字、网址、头像、社交主页、职位、邮箱、描述）和 `WebSite`。
- `description` 与 JSON-LD 描述用一句话介绍站主，并提到雨夜便利店微缩模型；不出现旧站点的「可玩主页」「漫步」「灯塔」等说法。
- `sitemap.xml` 只列出 `https://0xbb.me/` 一个地址；`robots.txt` 允许全部抓取并指向该站点地图。
- 构建产物中不引用外部域名的脚本或样式表。

## 约束
- 禁用脚本时，`index.html` 的文本中能找到 `FUBUKI_BB`、`Full Stack Engineer`、简介第一段英文全文、四个链接地址。
- `<title>` 与上文完全一致。
- `og:image` 与 `twitter:image` 均为 `https://0xbb.me/profile.jpg`。
- 存在 `Person` 与 `WebSite` 两段 JSON-LD。
- 构建产物 `index.html`（含元信息）中不出现 "playable"、"walk"、"lighthouse"、「灯塔」等旧站点描述。
- `sitemap.xml` 只含一个 `<loc>`：`https://0xbb.me/`。
- `index.html` 中没有指向外部域名的 `<script src>` 或样式表链接。

## 例子
- 搜索引擎爬虫抓取 `https://0xbb.me/`，不执行脚本，读到标题「FUBUKI_BB — Engineering, AI Workflows & Exploration」、描述，以及正文里的职位、简介和 GitHub 链接。
- 有人把链接分享到社交平台，预览卡片显示 `profile.jpg` 头像。

## 验收
- [ ] 解析 `dist/index.html` 纯文本，包含名字、职位、简介第一段英文、四个链接地址。
- [ ] `<title>`、`canonical`、`og:image`、`twitter:image` 与约束一致。
- [ ] 存在 `Person` 与 `WebSite` 两段合法 JSON-LD。
- [ ] `dist/index.html` 中搜索不到 "playable"、"walk"、"lighthouse"、「灯塔」。
- [ ] `sitemap.xml` 只有一个 `<loc>https://0xbb.me/</loc>`。
- [ ] `dist/index.html` 没有外部域名的脚本或样式表引用。
