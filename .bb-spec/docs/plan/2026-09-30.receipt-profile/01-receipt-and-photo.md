---
name: 01-receipt-and-photo
description: 新建小票组件、全身照相片组件与语言开关组件，补齐小票文案、链接显示文字和压缩版全身照图片
---
# 小票与全身照相片组件

## 目标
项目里有一个可复用的 `Receipt` 组件和 `PhotoPrint` 组件，资料视角、独立资料页、三维失败三处都用它们显示同一张小票和同一张全身照相片。

## 业务规则（来源：spec receipt、full-photo）
- 小票：米白纸条（底色 `#f5f1e6`、字色 `#1d2233`），上下锯齿边，正文等宽字体，简介段用正文字体。自上而下 10 项：
  1. `RAINY NIGHT · 24H`；
  2. 圆形头像 `./profile.jpg`（按钮，右下角相机小图标）；
  3. 提示行：中「[ 点头像 · 打印全身照 ]」/ 英 `[ TAP PHOTO · PRINT FULL SHOT ]`；
  4. 名字 `FUBUKI_BB`（`<h1 tabIndex={-1}>`）+ 三行职位；
  5. 虚线；「所在地 ···· Tokyo · Shanghai」（英 `Based in`）；
  6. 虚线；`02 · ABOUT`、标题（中「雨夜里还亮着的店」/ 英 `Still open on a rainy night`）、简介第一段；
  7. 虚线；小标签「方向」/ `FOCUS`，四个方向各一行、行尾 `×1`；
  8. 虚线；小标签「链接」/ `LINKS`，四行「名称 ···· 链接文字」；
  9. 虚线；加粗「一起出发 →」/ `Let's get going →`；
  10. 条形码图案 + `0XBB.ME · THANK YOU`。
- 链接（名称 / 链接文字 / 地址）：GitHub / `github.com/0xBB2b` / `https://github.com/0xBB2b`；LinkedIn / `in/0xbb2b` / `https://www.linkedin.com/in/0xbb2b`；Juejin / `juejin.cn` / `https://juejin.cn/user/1037558235795032`；Email / `bb@yorha.xyz` / `mailto:bb@yorha.xyz`。外部链接 `target="_blank" rel="noopener"`。
- 头像加载失败显示字母「F」。
- 版式：宽 ≤ 420px；视口宽高比 ≥ 1 时靠右、右边距 7vw、逆时针歪约 0.6°；< 1 时水平居中不歪。出现动画：从上方掉下、回弹，约 0.6 秒（0.5～0.7）。
- 全身照相片（`PhotoPrint`）：
  - 遮罩 `rgba(4,6,16,.72)` 淡入约 0.25 秒；相片从上方掉到中央、歪约 2.2°、回弹，约 0.55 秒；
  - 白边相纸，底边左 `FUBUKI_BB`、右 `0xBB MART PHOTO · L`；两上角黄色半透明胶带；
  - 右下角橙色日期戳 = 访客当天日期，格式 `'YY M D`（2026-09-30 → `'26 9 30`）；
  - 右上角 ✕；底部小字 中「点空白处或按 Esc 关闭」/ 英 `Tap outside or press Esc to close`；
  - `role="dialog"`、`aria-modal="true"`；打开后焦点到 ✕；✕ / 点遮罩 / Esc 关闭；关闭后焦点回头像按钮；打开时按 Esc 只关相片，事件不再传给外层；
  - 图片 `./profile-full-print.jpg`（900px 宽、≤ 200KB）；首次打开才请求；加载中显示显影效果和 中「显影中…」/ 英 `DEVELOPING…`；失败显示 中「照片没能打印出来」/ 英 `The photo didn't print` + 按钮「再打印一次」/ `Print again`，点击重新请求；
  - 替代文字：中「FUBUKI_BB 的全身像」/ 英 `Full-length portrait of FUBUKI_BB`。
- 页面上不出现技能详情和项目介绍文字。

## 涉及文件
- 新建 `components/Receipt.tsx`、`components/Receipt.css`
- 新建 `components/PhotoPrint.tsx`、`components/PhotoPrint.css`
- 新建 `components/LanguageToggle.tsx`（从 `components/StorySections.tsx` 的 `LanguageToggle` 原样移出；本 plan 不删 StorySections，05 统一删除）
- 修改 `copy.ts`（新增小票与相片文案键）
- 修改 `data.ts`（`socialLinks` 每项加 `label` 显示文字）
- 新建 `public/profile-full-print.jpg`

## 成品定义
图片生成命令（在仓库根执行一次，产物提交进仓库；原图 1696×2528，按宽度缩到 900）：
```bash
sips --resampleWidth 900 -s format jpeg -s formatOptions 82 public/profile-full.png --out public/profile-full-print.jpg
```
执行后确认宽 900、文件 ≤ 200KB；超了把 `formatOptions` 每次降 5 重试。

## 函数清单
### components/Receipt.tsx
| 函数名 | 职责 |
|---|---|
| `Receipt` | 渲染小票 10 项内容；接收当前语言和「点头像」回调；头像按钮带 `aria-haspopup="dialog"` |
| `ReceiptAvatar` | 圆形头像 + 相机图标；图片出错时换成「F」 |
| `ReceiptRow` | 「名称 ···· 值」一行（所在地、方向、链接共用） |
### components/PhotoPrint.tsx
| 函数名 | 职责 |
|---|---|
| `PhotoPrint` | 全身照相片对话框：遮罩、相纸、胶带、日期戳、关闭按钮；管理加载中 / 失败 / 成功三种状态；处理 Esc 并阻止传给外层；打开时聚焦 ✕，关闭时通知调用方 |
| `formatPrintDate` | 把日期格式化成 `'YY M D` |
### components/LanguageToggle.tsx
| 函数名 | 职责 |
|---|---|
| `LanguageToggle` | 「EN / 中」两个按钮，当前语言 `aria-pressed="true"` |
### copy.ts
| 函数名 | 职责 |
|---|---|
| `COPY`（修改） | 中英各加：`receiptStore`、`tapPhotoHint`、`focusLabel`、`linksLabel`、`letsGo`、`receiptThanks`、`developing`、`photoFailed`、`printAgain`、`closePhoto`、`dismissHint`、`fullAlt`、`photoCaption` |

## 协作关系
`Receipt` 不持有相片状态，只调用传入的「点头像」回调；调用方（05 的 `ReceiptView`、02 的 `ProfilePage`）持有「相片是否打开」并渲染 `PhotoPrint`，关闭时把焦点还给头像按钮（通过 ref）。两者都从 `copy.ts` / `data.ts` 取文案。

## 验证方式
- 测试入口：`renderToStaticMarkup(createElement(Receipt, props))`、`renderToStaticMarkup(createElement(PhotoPrint, props))`、`formatPrintDate`（从 `components/PhotoPrint` 导出）；浏览器行为用 `tests/browser.ts` 在 02 的独立页上验证（见 02）。
- 测试输入：`language` 为 `zh` / `en`；`formatPrintDate(new Date(2026, 8, 30))`。
- 预期结果：
  - [ ] 小票 HTML 中 10 项文案按上表顺序出现（中英各一次），简介只含第一段。
  - [ ] 四个链接的名称、链接文字、`href` 正确；外部链接带 `target="_blank"` 与 `rel="noopener"`。
  - [ ] 名字元素是 `<h1 tabindex="-1">FUBUKI_BB</h1>`。
  - [ ] 头像按钮带 `aria-haspopup="dialog"`。
  - [ ] `PhotoPrint` 打开时 HTML 含 `role="dialog"`、`aria-modal="true"`、`FUBUKI_BB`、`0xBB MART PHOTO · L`、关闭提示文字、`./profile-full-print.jpg`。
  - [ ] `formatPrintDate(2026-09-30)` 返回 `'26 9 30`。
  - [ ] `public/profile-full-print.jpg` 宽 900 像素、≤ 200KB；`public/profile.jpg`、`profile.png`、`profile-full.png` 的 SHA-256 不变（沿用 `tests/public-images.test.ts`）。
  - [ ] HTML 中不含技能详情与项目介绍文字。
