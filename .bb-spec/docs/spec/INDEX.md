# Spec 索引

> 每条一行。读者先扫此页判断相关性，再打开具体文件。

## cabin

- [car-hover-hint](cabin/car-hover-hint.md) — 整体视角下鼠标悬停在保时捷上时的光标与车身轮廓提示
- [driver-look](cabin/driver-look.md) — 驾驶位视角下拖动转头的角度范围与缩放限制
- [enter-driver-view](cabin/enter-driver-view.md) — 点击保时捷后从整体视角进入驾驶位视角的过程、时长、输入屏蔽与最终镜头
- [exit-driver-view](cabin/exit-driver-view.md) — 从驾驶位视角退回整体视角的三种方式、过程与视角恢复

## plaque

- [plaque-text](plaque/plaque-text.md) — 展示台正面铭牌的三行文字内容及随语言切换的规则

## profile

- [cabin-displays](profile/cabin-displays.md) — 驾驶位中控屏与仪表盘显示的个人资料内容、呈现方式与可见性
- [language](profile/language.md) — 初始语言按浏览器语言判定，中控屏与简介卡片可切换，切换后全站文字同步
- [profile-card](profile/profile-card.md) — 不依赖三维画面的网页版简介卡片：内容、弹出时机与能否关闭

## scene

- [ambient-motion](scene/ambient-motion.md) — 微缩模型里一直循环播放的环境动效及其节奏参数
- [diorama-layout](scene/diorama-layout.md) — 雨夜便利店微缩模型包含的物件、摆放关系、画风，以及整体视角的镜头操作
- [quality-tier](scene/quality-tier.md) — 画质分高低两档，按设备与实测帧率自动选择与降档，并规定帧率标准

## site

- [favicon](site/favicon.md) — 网站图标为红色 911 侧身剪影 SVG
- [loading-shell](site/loading-shell.md) — 脚本下载前就可显示的雨夜风格加载页、「先看资料」入口与退出时机
- [static-profile-html](site/static-profile-html.md) — 构建产物不执行脚本即可读到的个人信息，以及搜索、分享元信息与站点地图
