# Spec 索引

> 每条一行。读者先扫此页判断相关性，再打开具体文件。

## plaque

- [plaque-hint](plaque/plaque-hint.md) — 整体视角下铭牌边框的呼吸微光，以及鼠标悬停时变亮与手形光标
- [plaque-text](plaque/plaque-text.md) — 展示台正面铭牌的三行文字内容及随语言切换的规则

## profile

- [full-photo](profile/full-photo.md) — 点小票头像弹出一张贴着胶带的全身照相片，含加载中、失败重试与关闭规则
- [language](profile/language.md) — 初始语言按浏览器语言判定，在资料视角和独立资料页右上角切换，切换后全站文字同步
- [receipt](profile/receipt.md) — 小票的内容、中英文案、链接、版式与贴上来的动画，资料视角、独立资料页和三维失败时共用

## scene

- [ambient-motion](scene/ambient-motion.md) — 微缩模型里一直循环播放的环境动效及其节奏参数
- [car-license-plate](scene/car-license-plate.md) — 保时捷前后各一块日本车牌的文字、样式、尺寸和安装位置
- [diorama-layout](scene/diorama-layout.md) — 雨夜便利店微缩模型包含的物件、摆放关系、画风，以及整体视角的镜头操作
- [neighbor-building](scene/neighbor-building.md) — 便利店左侧两层旧楼的外观：外墙材质、一楼已打烊的喫茶店、二楼住家、屋顶物件与物件数量上限
- [quality-tier](scene/quality-tier.md) — 画质分高低两档，按设备与实测帧率自动选择与降档，并规定帧率标准与帧率上限

## site

- [favicon](site/favicon.md) — 网站图标为按 profile.jpg 头像缩成 32×32 格的圆形像素画 SVG
- [loading-shell](site/loading-shell.md) — 脚本下载前就可显示的雨夜风格加载页、通往独立资料页的「先看资料」链接与退出时机
- [profile-page](site/profile-page.md) — 不带三维的独立资料页 /profile/：静态可读、语言切换、返回 3D 的链接与页面元信息
- [profile-images](site/profile-images.md) — 三张头像图片永久保留在仓库并随网站发布，搜索与分享元信息引用的图片必须真实存在
- [scene-failure](site/scene-failure.md) — 三维场景加载或运行失败时，移除加载页，在深蓝背景上直接显示小票和失败提示
- [static-profile-html](site/static-profile-html.md) — 首页与独立资料页的搜索、分享元信息，站点地图，以及首页不藏看不见的资料文字

## story

- [enter-story-view](story/enter-story-view.md) — 点击铭牌或键盘隐藏按钮后，镜头推到店门口、小票贴上来，进入资料视角的过程、时长、输入屏蔽与落点
- [exit-story-view](story/exit-story-view.md) — 资料视角下按 Esc 或点左上角「返回全景」按钮，小票淡出、三维恢复，镜头退回整体视角
- [story-pause](story/story-pause.md) — 资料视角下小票贴好后三维画面停止刷新并变暗成静止背景，退出时恢复且动画时间不跳变
