# 小票资料代替三段资料视角 实施计划
## 阶段 1：小票组件
- [01-receipt-and-photo](01-receipt-and-photo.md) — 小票、全身照相片、语言开关组件，文案与压缩版全身照
## 阶段 2：页面入口
- [02-profile-page](02-profile-page.md) — 独立资料页 /profile/：双入口构建、预渲染、元信息、站点地图 [依赖: 01-receipt-and-photo]
- [03-home-shell](03-home-shell.md) — 加载页「先看资料」改链接，删除首页隐藏资料与 readFirst [依赖: 02-profile-page]
## 阶段 3：资料视角
- [04-receipt-view](04-receipt-view.md) — 资料视角外层换成小票，删除三段资料组件 [依赖: 01-receipt-and-photo, 03-home-shell]
- [05-story-pose-and-pause](05-story-pose-and-pause.md) — 单一资料镜头位，小票出现后暂停三维、退出恢复 [依赖: 04-receipt-view]
## 阶段 4：文档
- [06-readme](06-readme.md) — README 同步到小票与独立资料页 [依赖: 05-story-pose-and-pause]
