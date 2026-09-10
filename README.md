# FUBUKI_BB · MC-2D 探索个人主页

[0xbb.me](https://0xbb.me) 的个人主页源码。操控方块角色，从黄昏小镇出发，推门走进数据工厂，再沿星光和荧光海走到灯塔；也可以直接打开资料速览。

## 体验与操作

| 操作 | 方式 |
| --- | --- |
| 左右行走 | 按住 `A` / `D` 或 `←` / `→`，松开停止 |
| 快跑 | 键盘方向键配合 `Shift`；摆臂与迈腿更大，身体轻微起伏 |
| 交谈、查看项目、开门 | 靠近后按 `E`，或点击对象旁的按钮 |
| 关闭阅读 | 关闭按钮或 `Esc` |
| 切换语言 | 在主页点击 `EN / 中`；阅读弹窗里不显示语言按钮 |
| 触屏 | 长按屏幕左右按钮移动，点击交谈、查看或开门按钮 |
| 切换服装 | 灯塔寄语出现时显示按钮，在默认黑装与 A 黑裙之间切换 |

- 三个连续场景：黄昏小镇 → 地下数据工厂 → 星夜海岸。门需要主动开启，关闭时不能穿过。
- B 金发浅外套 NPC 讲述三页世界观；五台终端介绍实际技能，三颗项目星星通向项目详情。
- 灯塔寄语在电脑/横屏位于塔右侧、竖屏位于左侧，章节标题不消失；返程后寄语和换装按钮一起收起。
- 换装有局部光点动画，位置和语言不重置；阅读与换装期间暂停移动，恢复后需重新输入方向。
- **服装彩蛋**：穿着 A 黑裙首次主动和迎宾者交谈，先出现 1 秒感叹号，再打字显示“新服装真好看”；英文模式有对应文案。完整文字停留片刻后恢复交互，同一页面只触发一次，刷新后重置。
- 支持减少动态偏好，保留可直接阅读的简介、五项技能、三个项目和四个联系入口。
- 3D 加载失败或图形环境不可用时，资料速览仍可阅读和打开外链，不必恢复游戏。

## 本地开发

需要Bun、Node.js和本机Chrome。所有浏览器测试都使用Chrome无窗口实例，功能测试也不再启动ego应用；可通过`PORTFOLIO_CHROME_PATH`指定已有Chrome程序，不自动下载浏览器。

```bash
bun install --frozen-lockfile
bun run dev                 # 默认 http://localhost:3000
```

另开终端：

```bash
bun run build               # 生成 dist，静态交付测试会使用它
bun test                    # 单元测试 + 真实浏览器回归 + 发布性能门槛
./node_modules/.bin/tsc --noEmit
bun run preview             # 查看构建后的静态页面
```

只测纯逻辑和模型时，例如：

```bash
bun test ./portfolio/input.test.ts ./portfolio/room.test.ts ./portfolio/character.test.ts
bun test ./tests/portfolio-outfit-reaction.test.tsx ./tests/portfolio-appearance.test.tsx
```

浏览器自动化始终静默后台：`tests/headless-browser.ts`以`--headless=new`和新的临时资料目录启动Chrome，不激活应用、不切换到前台、不使用日常浏览器资料。测试结束（包括异常退出）后关闭实例并删除资料目录。

`tests/browser.ts`通过浏览器调试协议发送真实鼠标/键盘/触屏事件，读取实际页面、网络和截图。自动行走使用浏览器内部焦点模拟，避免桌面操作干扰；这不会抢系统焦点，也不修改网站的失焦停止逻辑。没有图形替身、虚拟时钟或前台操作回退。

无窗口测试结果会明确记录模式，不能直接当作真实桌面前台帧率或手机真机表现。Pi的Chrome DevTools也已设置为无窗口模式；ego的静默能力未确认，不在本项目的自动测试链路中启动。

浏览器回归默认访问 `http://127.0.0.1:3000/`，部分测试可通过 `PORTFOLIO_TEST_URL` 指定地址。静态交付与性能测试会自行启动、关闭本地预览端口 4189 / 4191；不要同时占用这些端口。设计预览测试需要开发服务，而不是发布目录。

## 代码结构

```text
App.tsx                       图形加载与故障阅读
components/portfolio/         导航、资料、对话、终端与彩蛋气泡
portfolio/state.ts            行走、阅读、换装、一次性彩蛋状态
portfolio/input.ts            键盘/触屏输入及释放处理
portfolio/character.ts         主角步态、快跑与接地
portfolio/avatar-models.ts     A 服装与 B NPC 的方块几何
portfolio/runtime.ts           渲染、镜头和世界到屏幕的位置换算
portfolio/scenes/              小镇、工厂房间、海面、星星和灯塔
portfolio/journey.ts           路线、门和交互对象的位置
portfolio/npc-reaction.ts      彩蛋的展示与打字时间
portfolio/appearance-effect.ts 换装光点效果
data.ts                       中英资料、技能、作品及外链
metadata.json                 页面描述、canonical 和分享信息
plugins/htmlPlugin.ts         构建时注入页面信息
public/                       选定的人设图、站点图和站点辅助文件
design-reference/             非发布的模型/场景对比与参考材料
tests/                        浏览器行为、交付和性能验证
artifacts/                    进度与发布验收证据
```

## 静态发布与素材边界

- React 19 + TypeScript + Three.js r184，Vite 6 单入口静态构建，不需要独立后端、账户或服务端存档。
- 部署目录为 `dist/`，`base` 为 `./`。浏览器需支持 ES modules、WebGL2 和原生 `dialog`；没有 WebGL2 时仍提供资料阅读。
- 三维人物、场景和特效由几何与程序化材质生成，不使用图片贴图；没有模型生成服务密钥或付费 API。
- 唯一的位图例外是用户确认的 `public/profile-full.png`：仅打开资料速览后按需加载，保持原比例，失败不影响文字阅读；原图约 6.1 MiB。
- 发布时明确输出 `profile-full.png`、`site-card.svg`、`robots.txt`、`sitemap.xml` 和 `THIRD_PARTY_NOTICES.txt`，不整体复制 `public/`。未选头像、设计参考、对比页面及验收截图不进入发布包。
- 页面字体使用本地/系统字体回退，不加载字体 CDN；React 和 Three.js 等代码打包为本地资源。

## 发布验收

最新记录见 [发布报告](./artifacts/release-report.md)。完整发布检查覆盖跨场景、门、双语、触屏、长文阅读、换装、彩蛋和图形失败。

性能检查在静态构建上记录 1440×900、页面可见、包含跨场景的完整 30 秒帧时间；门开启过程和慢帧都保留。门槛是 **95% 的帧间隔不超过 33.4 ms**，不是宣称所有设备稳定 60 FPS。每次测量的设备、浏览器、GPU、全部时间戳和结果保存在 `artifacts/release-performance.json`；不以多次运行中的最好一次代替完整记录。

手机视口和触屏模拟不代表手机真机性能已通过。构建仍有 Three.js 场景包超过 500 kB 的提醒；应依据真实测量定位问题，不通过删除慢帧或削减已确认画面来掩盖结果。

## 部署

[GitHub Actions](./.github/workflows/deploy.yml) 在推送 `main` 时执行冻结依赖安装、构建并将 `dist/` 发布到 GitHub Pages。其它静态托管也可使用同一目录；先验证目标地址的相对资源路径，再人工确认发布。

本地提交不等于已经推送或上线。

## 来源与许可

- 本仓库代码使用 [MIT](./LICENSE)。
- [React / React DOM](https://github.com/facebook/react) 与 [Three.js 及其 addons](https://github.com/mrdoob/three.js) 使用 MIT，完整许可声明随 `THIRD_PARTY_NOTICES.txt` 进入发布包；未新增外部引擎或动画依赖。
- 方块角色根据用户提供的设计参考由代码制作，不使用 Minecraft 官方模型或贴图，也不表示官方关联。
- 资料人设图、人物参考图不因代码的 MIT 许可而自动获得转载授权；使用这些图像需另行确认权利。
- 当前系统字体没有作为字体文件打包分发。
