---
id: T-32
title: M3 全站发布验证与说明
depends_on: [T-31, T-46, T-47]
files: [README.md, vite.config.ts, public/THIRD_PARTY_NOTICES.txt, tests/browser.ts, tests/portfolio-release.test.ts, tests/portfolio-performance.test.ts, artifacts/release-report.md, artifacts/release-performance.json]
refs: [portfolio/graphics-runtime/AC-4, portfolio/site-entry/AC-3, portfolio/site-entry/AC-4, portfolio/site-entry/AC-5, portfolio/site-entry/AC-6, portfolio/bilingual/AC-2, portfolio/bilingual/AC-4, portfolio/responsive-layout/AC-1, portfolio/responsive-layout/AC-2, portfolio/responsive-layout/AC-3, portfolio/responsive-layout/AC-4, portfolio/world/AC-1, portfolio/world/AC-3, portfolio/player/AC-12, portfolio/profile-overview/AC-6]
parallel: false
verify: bun run build && bun test && ./node_modules/.bin/tsc --noEmit
status: done
agent: ""
commit: ""
note: "完整无窗口验收206 pass / 0 fail，9017断言、41文件，build/tsc通过。30秒三景P95 16.7ms，通过33.4ms门槛；所有历史尝试保留。当前Chrome MCP已确认headless，自动测试不再调用ego或激活窗口。手机真机/有窗口人工性能未测，不自动提交/发布。"
---
## 当前验收基线
- 黄昏小镇、地下数据工厂、星夜海岸三景连续，门主动开启且关闭阻挡，能原路返回。
- B为迎宾NPC，世界观三页；五项技能、三个项目、四个联系入口完整中英阅读。
- 黑装/A两款主角，Shift快跑和较轻身体起伏；换装按钮与灯塔寄语同范围，不显示右侧名字，带局部特效。
- 穿A服装主动与迎宾者交谈触发一次彩蛋：1秒感叹号、打字赞美、文字停留后解锁；每次刷新重置，期间不可重复交谈。
- 灯塔标题持续显示，题记横屏塔右/竖屏塔左；技能速览最多三列。
- 语言只在主页选择，阅读弹窗内没有语言按钮；关闭后可换语言重读。
- 图形失败时仍能读完整资料；正在换装或彩蛋期间故障也不能挡住故障阅读。

## 素材与交付
- 只构建首页；/game/不能启动或请求旧游戏，旧实现与音乐均不存在。
- 三维人物、场景和特效用几何/程序材质，不加载模型图片纹理、编码位图或SVG包裹位图。
- 唯一位图例外是用户确认的profile-full.png，只在打开资料速览后加载，原比例，失败不阻断文字；其它头像/参考/截图/对比页不入dist。
- README说明MC-2D实际功能、当前操作、静态命令、浏览器测试前提、素材许可和发布风险，不描述旧节奏游戏；完整MIT声明随THIRD_PARTY_NOTICES.txt进入dist，不把代码许可扩大到用户图像。
- 运行时不得带浏览器测试全局变量、计时观察器、调试UI或密钥。
- 冻结安装、构建、全量测试与类型检查；实际测试生产构建而非只检查开发服务。

## 性能门槛
- 在记录设备型号、OS、浏览器版本及GPU的桌面环境中，以1440×900保持页面可见，连续记录至少30秒，包含跨场景。
- 最近顺位法P95≤33.4ms；完整记录所有帧，不剔除慢帧、门动画或取多次最好成绩。
- 使用独立临时资料目录的无窗口Chrome，记录headless模式及焦点模拟条件；控制轮询每250ms一次，不改变页面尺寸、系统刷新率或虚拟时间。普通功能测试同样静默无窗口，不调用ego应用。
- 原始帧与每次结果保存在artifacts/release-performance.json；任何未满足门槛的尝试保留，不覆盖隐藏。
- 手机视口/触屏模拟不是手机真机性能证据；没有真机数据必须报告未验证。
- 不为通过数字擅自削减用户已确认画面；性能超标先说明证据和下一步，不宣布发布门槛通过。

## 权限与收尾
- USER-081允许提交当前成果并继续收尾；当前快照提交fc824b2，不自动推送/上线。
- 不新增依赖，不修改不相关代码；图片压缩或重绘另行确认。
- 仅保留必要的最终文字报告和原始性能证据，其它临时截图、日志和自启服务清理。
