# Spec 索引

> 每条一行。读者先扫此页判断相关性，再打开具体文件。

## plaque

- [plaque-hint](plaque/plaque-hint.md) — 整体视角下铭牌边框的呼吸微光，以及鼠标悬停时变亮与手形光标
- [plaque-text](plaque/plaque-text.md) — 展示台正面铭牌的三行文字内容及随语言切换的规则

## profile

- [language](profile/language.md) — 初始语言按浏览器语言判定，只能在资料视角右上角切换，切换后全站文字同步

## scene

- [ambient-motion](scene/ambient-motion.md) — 微缩模型里一直循环播放的环境动效及其节奏参数
- [diorama-layout](scene/diorama-layout.md) — 雨夜便利店微缩模型包含的物件、摆放关系、画风，以及整体视角的镜头操作
- [quality-tier](scene/quality-tier.md) — 画质分高低两档，按设备与实测帧率自动选择与降档，并规定帧率标准

## site

- [favicon](site/favicon.md) — 网站图标为按 profile.jpg 头像缩成 32×32 格的圆形像素画 SVG
- [loading-shell](site/loading-shell.md) — 脚本下载前就可显示的雨夜风格加载页、「先看资料」入口与退出时机
- [profile-images](site/profile-images.md) — 三张头像图片永久保留在仓库并随网站发布，搜索与分享元信息引用的图片必须真实存在
- [scene-failure](site/scene-failure.md) — 三维场景加载或运行失败时，移除加载页并直接进入无 3D 的资料视角
- [static-profile-html](site/static-profile-html.md) — 构建产物不执行脚本即可读到的个人信息，以及搜索、分享元信息与站点地图

## story

- [enter-story-view](story/enter-story-view.md) — 点击铭牌或键盘隐藏按钮后，从整体视角进入资料视角的过程、时长、输入屏蔽与落点
- [exit-story-view](story/exit-story-view.md) — 资料视角下按 Esc 或点左上角「返回全景」按钮，镜头动画退回并回到整体视角
- [scroll-camera](story/scroll-camera.md) — 资料视角下一次滚动翻一段：镜头约 1 秒动画移到下一停靠点，动画期间不再响应滚动，以及各停靠点的取景
- [story-sections](story/story-sections.md) — 资料视角下 3 段资料的内容、中英文文案、排版、进度点、滚动提示与语言开关
