# rainy-konbini 实施计划
## 阶段 1：清场
- [01-legacy-removal](01-legacy-removal.md) — 删除 MC-2D 旧站点代码、专属测试与旧图片，改造仍有用的测试
## 阶段 2：内容与站点外壳
- [02-content-and-language](02-content-and-language.md) — 精简资料数据、集中中英文文案、初始语言判定 [依赖: 01-legacy-removal]
- [03-profile-ui](03-profile-ui.md) — 共享资料组件、简介卡片、中控屏网页内容 [依赖: 02-content-and-language]
- [04-site-shell](04-site-shell.md) — 静态加载页与英文简介、元信息、站点地图、网站图标 [依赖: 03-profile-ui]
## 阶段 3：三维场景
- [05-diorama-renderer](05-diorama-renderer.md) — 渲染管线、材质工具、布局常量、画质两档 [依赖: 01-legacy-removal]
- [06-diorama-world](06-diorama-world.md) — 展示台、铭牌、地面、便利店、街道设施 [依赖: 05-diorama-renderer]
- [07-weather-and-ambient](07-weather-and-ambient.md) — 雨、水花、湿地面倒影、环境动效节奏 [依赖: 05-diorama-renderer]
## 阶段 4：内容与铭牌返工
- [08-plaque-and-copy](08-plaque-and-copy.md) — 文案改为资料视角所需内容，铭牌第三行改为所在地，边框呼吸微光 [依赖: 06-diorama-world]
- [09-story-sections](09-story-sections.md) — 3 段资料组件、静态输出改用资料段、删除旧组件 [依赖: 08-plaque-and-copy]
## 阶段 5：车与镜头逻辑
- [10-car-exterior](10-car-exterior.md) — 按原型搭保时捷实心外观与双闪 [依赖: 05-diorama-renderer]
- [11-story-camera](11-story-camera.md) — 停靠点、滚动到镜头换算、回拉区、吸附、取景偏移、视角状态机 [依赖: 05-diorama-renderer]
## 阶段 6：总装与发布
- [12-world-and-interaction](12-world-and-interaction.md) — 场景总装、画质降档串联、整体视角镜头、铭牌悬停点击、资料视角镜头驱动 [依赖: 08-plaque-and-copy, 10-car-exterior, 11-story-camera]
- [13-app-shell](13-app-shell.md) — 应用外壳、滚动吸附与回拉退出、先看资料、失败降级、语言串联、端到端验收 [依赖: 09-story-sections, 12-world-and-interaction]
- [14-docs-and-release](14-docs-and-release.md) — README、发布检查与帧率测试 [依赖: 13-app-shell]
