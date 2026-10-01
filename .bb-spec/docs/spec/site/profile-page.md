---
name: profile-page
description: 不带三维的独立资料页 /profile/：静态可读、语言切换、返回 3D 的链接与页面元信息
---

# 独立资料页

## 目的
网速慢或电脑慢的访客不用等三维场景，点一下就能打开一个很快的页面，看到同一张小票。

## 逻辑
- 地址：`/profile/`，构建产物为 `dist/profile/index.html`。
- 页面背景：深蓝径向渐变，上面叠一层斜向雨丝纹理；小票水平居中显示在页面上；视口宽高比 ≥ 1 时小票和资料视角里一样逆时针歪约 0.6°，宽高比 < 1 时不歪。
- 页面不加载三维代码：不引用 three.js 及三维场景的代码文件，不创建 WebGL。
- 不执行脚本时：
  - 小票的全部文字（英文）和四个链接已写在 HTML 里，可读、可点；
  - 头像显示为普通图片。
- 脚本执行后：
  - 按浏览器首选语言显示：`navigator.language` 以 `zh` 开头（不区分大小写）为中文，否则英文；
  - 右上角固定「EN / 中」语言开关，当前语言的按钮带 `aria-pressed="true"`；切换后小票、全身照相片文字和 `<html lang>`（中文 `zh-CN`、英文 `en`）同时更新；语言不写入 `localStorage`、Cookie 或地址栏；
  - 头像可点击，弹出全身照相片。
- 左上角固定一个链接：中文「← 去看 3D 雨夜街角」，英文 `← See the 3D rainy corner`，指向首页 `../`。
- 小票出现时同样有从上方掉下来的动画。
- `<head>`：
  - `<title>`：`FUBUKI_BB — Profile`；
  - `canonical`：`https://0xbb.me/profile/`；
  - `description` 与首页相同；`og:image`、`twitter:image` 为 `https://0xbb.me/profile.jpg`；
  - 网站图标与首页相同。
- 页面引用的脚本、样式都来自本站，不引用外部域名的脚本或样式表。

## 约束
- `dist/profile/index.html` 存在；禁用脚本打开时，页面文本包含 `FUBUKI_BB`、`Full Stack Engineer`、简介第一段英文全文和四个链接地址。
- 页面加载过程中，没有请求 three.js 或三维场景代码文件，页面上没有 `<canvas>`。
- `navigator.language = "zh-CN"` 时显示中文，`"en-US"` 时显示英文。
- 语言开关切换后，小票文字与 `<html lang>` 同步更新，刷新后回到按浏览器语言判定的结果。
- 左上角链接文字正确，`href` 指向首页。
- `<title>`、`canonical`、`og:image`、`twitter:image` 与上文一致。
- 页面中没有指向外部域名的 `<script src>` 或样式表链接。

## 例子
一位网速很慢的中文访客在加载页点了「先看资料」：浏览器打开 `https://0xbb.me/profile/`，不到一秒就看到深蓝雨夜背景上掉下一张中文小票。他点头像看了全身照，读完后点左上角「← 去看 3D 雨夜街角」，回到首页等三维场景加载。搜索引擎抓取这个地址时，不执行脚本也读到了英文的名字、职位、简介和 GitHub 链接。

## 验收
- [ ] 构建后 `dist/profile/index.html` 存在，纯文本包含名字、职位、简介第一段英文和四个链接地址。
- [ ] 打开 `/profile/` 时网络请求中没有三维代码文件，DOM 中没有 `<canvas>`。
- [ ] `zh-CN` 浏览器显示中文小票，`en-US` 显示英文。
- [ ] 点语言开关后小票与 `<html lang>` 更新；`localStorage`、Cookie、地址栏无语言记录。
- [ ] 左上角链接文字（中英文）与 `href` 正确。
- [ ] `<title>` 为 `FUBUKI_BB — Profile`，`canonical` 为 `https://0xbb.me/profile/`，分享图为 `https://0xbb.me/profile.jpg`。
- [ ] 点头像弹出全身照相片。
- [ ] 页面没有外部域名的脚本或样式表引用。
