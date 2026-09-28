---
name: profile-images
description: 三张头像图片永久保留在仓库并随网站发布，搜索与分享元信息引用的图片必须真实存在
---

# 头像图片

## 目的
站主的三张头像图片是长期资产，任何改版都不能删除或改动它们；网页的搜索与分享信息里引用的图片地址必须都能打开。

## 逻辑
- `public/` 下永久保留三张图片，内容逐字节不变（按 SHA-256 校验）：

| 文件 | SHA-256 |
|---|---|
| `profile.jpg` | `c28ed9a1e2296e6b667212bd3758323b496791982f25b4e663d84ebbb2422543` |
| `profile.png` | `3bbaa161ddf6141706341ab661ba3da59230e8a87b932e1eefdd6f2bd132e2d8` |
| `profile-full.png` | `93112c75b439d72949250c21da06d5a6ff86be5e7211ed1ee09eb17575747a8f` |

- 构建时三张图片都原样复制到 `dist/` 根目录，发布后可通过 `https://0xbb.me/profile.jpg`、`/profile.png`、`/profile-full.png` 打开。
- 网页 `<head>` 里所有引用图片的元信息（`og:image`、`twitter:image`、结构化数据里的 `image`）都指向 `https://0xbb.me/profile.jpg`；每一个被引用的图片文件都必须存在于 `dist/` 中。

## 约束
- `public/` 下三张图片存在，SHA-256 与上表一致。
- `dist/` 下三张图片存在，且与 `public/` 中对应文件逐字节相同。
- `og:image`、`twitter:image`、结构化数据 `image` 均为 `https://0xbb.me/profile.jpg`。
- `dist/index.html` 中出现的每个 `https://0xbb.me/<文件>` 图片地址，对应文件都在 `dist/` 中存在。

## 例子
有人在别的网站上贴了 `https://0xbb.me/profile-full.png` 这个地址：改版上线后这个地址仍然能打开同一张图。把主页链接分享到社交平台，预览卡片显示 `profile.jpg`。

## 验收
- [ ] `public/profile.jpg`、`public/profile.png`、`public/profile-full.png` 存在且 SHA-256 与上表一致。
- [ ] 构建后 `dist/` 中三张图片存在，且与 `public/` 逐字节相同。
- [ ] `dist/index.html` 的 `og:image`、`twitter:image`、结构化数据 `image` 都是 `https://0xbb.me/profile.jpg`。
- [ ] `dist/index.html` 引用的每个站内图片地址在 `dist/` 中都有对应文件。
