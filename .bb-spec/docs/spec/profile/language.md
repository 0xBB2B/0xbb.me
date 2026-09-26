---
name: language
description: 初始语言按浏览器语言判定，中控屏与简介卡片可切换，切换后全站文字同步
---

# 语言

## 目的
不在车外加按钮的前提下，让中文和英文访客都看到母语内容，并能手动切换。

## 逻辑
- 支持两种语言：中文（`zh`）和英文（`en`）。
- 初始语言：读取浏览器首选语言 `navigator.language`，以 `zh` 开头（不区分大小写）即为中文，否则为英文。
- 切换入口只有两处：中控屏上的「EN / 中」、简介卡片上的「EN / 中」。整体视角的画面上没有语言按钮。
- 切换后以下内容同时换成新语言：
  - 铭牌文字；
  - 中控屏内容；
  - 简介卡片内容；
  - 加载页文字；
  - `<html lang>` 属性：中文为 `zh-CN`，英文为 `en`。
- 语言选择只在本次访问内有效，不写入 `localStorage`、Cookie 或地址栏；刷新页面后重新按浏览器语言判定。
- 名字 `FUBUKI_BB`、所在地 `Tokyo · Shanghai`、链接名称（GitHub、LinkedIn、Juejin、Email）两种语言写法相同。

## 约束
- `navigator.language` 以 `zh` 开头时初始为中文，其余为英文。
- 切换后铭牌、中控屏、简介卡片、加载页、`<html lang>` 同步更新，无需刷新。
- `<html lang>`：中文 `zh-CN`，英文 `en`。
- 整体视角下画面中没有语言切换控件。
- 语言选择不持久化，刷新后回到按浏览器语言判定的结果。

## 例子
- `navigator.language` 为 `zh-TW` 的访客：打开页面即为中文，`<html lang="zh-CN">`。
- `navigator.language` 为 `ja-JP` 的访客：打开页面为英文。进车后点「中」，中控屏立即变中文；退出后铭牌也是中文。刷新页面后又回到英文。

## 验收
- [ ] `navigator.language = "zh-CN"` 时初始语言为中文。
- [ ] `navigator.language = "ZH-tw"` 时初始语言为中文。
- [ ] `navigator.language = "ja-JP"` 时初始语言为英文。
- [ ] 中控屏切换语言后，铭牌、中控屏、`<html lang>` 同时更新。
- [ ] 简介卡片切换语言后，卡片内容与 `<html lang>` 同时更新。
- [ ] 切换后 `localStorage`、Cookie、地址栏均无语言记录；刷新后语言回到初始判定。
- [ ] 整体视角下 DOM 中没有可见的语言切换控件。
