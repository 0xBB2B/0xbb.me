---
name: favicon
description: 网站图标为按 profile.jpg 头像缩成 32×32 格的圆形像素画 SVG
---

# 网站图标

## 目的
浏览器标签页上的图标就是站主头像的简化版，一眼能和资料里的头像对上。

## 逻辑
- 网站图标是一个 SVG 文件，画面为 `public/profile.jpg` 头像的脸部区域（银发、蓝眼、尖耳）缩成 32×32 格的像素画：
  - `viewBox` 为 `0 0 32 32`，每一格是一个 1×1 的色块，用 `shape-rendering="crispEdges"` 保持像素边缘清晰；
  - 颜色压缩到不超过 16 种；
  - 只保留以画布中心为圆心、直径 32 格的圆形区域，圆外透明。
- 图标只由矢量色块组成，不嵌入位图，不含文字。
- `index.html` 通过 `<link rel="icon" type="image/svg+xml">` 引用该文件。

## 约束
- 图标文件为 SVG，`index.html` 用 `type="image/svg+xml"` 引用。
- `viewBox` 为 `0 0 32 32`，根元素带 `shape-rendering="crispEdges"`。
- 填充色种类在 2 到 16 种之间，其中至少一种是蓝色（蓝通道比红通道高 40 以上），至少一种是接近白色的银色（三个通道都不低于 200）。
- 四个角的格子（如 `(0,0)`、`(31,0)`、`(0,31)`、`(31,31)`）不被任何色块覆盖。
- 不含 `<text>`、`<image>`、`<foreignObject>` 元素，也不含 `data:image` 位图。
- 构建产物中包含该图标文件，引用路径可访问。

## 例子
访客打开 0xbb.me，浏览器标签页左侧显示一个圆形小头像：银白头发、一只蓝眼睛，放大能看出是像素画风格，和小票上的头像是同一个人。

## 验收
- [ ] `index.html` 含 `<link rel="icon" type="image/svg+xml">` 且指向存在的 SVG 文件。
- [ ] SVG 的 `viewBox` 为 `0 0 32 32`，带 `shape-rendering="crispEdges"`。
- [ ] 填充色 2～16 种，含蓝色与银白色。
- [ ] 四个角的格子透明。
- [ ] SVG 中没有 `<text>`、`<image>`、`<foreignObject>`，也没有 `data:image`。
- [ ] `dist/` 中包含该图标文件。
