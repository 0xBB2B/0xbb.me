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
- [08-car-and-cabin](08-car-and-cabin.md) — 保时捷外观、前铰链驾驶门、驾驶位内饰与锚点 [依赖: 05-diorama-renderer]
## 阶段 4：交互
- [09-camera-and-interaction](09-camera-and-interaction.md) — 视角状态机、进出车镜头、转头、悬停点击、中控屏叠加、场景总装 [依赖: 03-profile-ui, 06-diorama-world, 07-weather-and-ambient, 08-car-and-cabin]
## 阶段 5：组装与发布
- [10-app-shell](10-app-shell.md) — 应用外壳、加载与失败处理、语言串联、端到端验收 [依赖: 04-site-shell, 09-camera-and-interaction]
- [11-docs-and-release](11-docs-and-release.md) — README、发布检查与帧率测试 [依赖: 10-app-shell]
