---
id: T-25
title: M3 完整双语与响应式阅读验证
depends_on: [T-14, T-9]
files: [/Users/bb/Projects/0xbb.me/components/portfolio/reading-acceptance.test.tsx]
refs: [portfolio/bilingual/AC-2, portfolio/bilingual/AC-4, portfolio/responsive-layout/AC-3]
parallel: false
verify: cd /Users/bb/Projects/0xbb.me && bun test ./components/portfolio/reading-acceptance.test.tsx
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
在 M3 用全量内容复核双语切换、故障阅读及三视口长正文，不将样板证据冒充完整验收。
## 2. 业务规则
- bilingual/C-2：当访客切换中文或英文时，系统应同步切换可见界面提示、场景名称、NPC 介绍、资料速览和故障说明；技术、项目、品牌名称和链接目标保持其原有身份与含义。
- bilingual/C-4：如果图形不可用，系统仍应允许切换中文与英文，故障说明和完整资料采用所选语言，链接仍可使用。
- responsive-layout/C-3：在任一指定视口下阅读 NPC 对话或资料速览期间，系统应允许读到全部正文，并能激活翻页、关闭和语言切换操作，不因正文长度而裁掉必要操作。
### bilingual/AC-2 双向全量切换 ← C-2
- 触发: 操作 切换中文并阅读三个 NPC 和资料速览，再切回英文。
- Given: 主页运行正常，全部内容可访问。
- When: 访客在两种语言下检查提示、场景名、介绍、技能、作品与联系方式。
- Then: 两种语言均覆盖完整内容，不出现未翻译的界面占位文字或丢失介绍；项目与技术名称可使用原名，外链目标不随语言变化。
### bilingual/AC-4 故障阅读仍可切换 ← C-4
- 触发: 操作 在图形不可用的主页上切换中文与英文。
- Given: 浏览器不支持所需图形能力，或必要图形资源加载报错，已显示资料。
- When: 访客切换语言并打开一个作品或联系入口。
- Then: 两种语言的故障说明与完整资料均可阅读，外链仍指向对应目标，不依赖游戏恢复。
### responsive-layout/AC-3 双语长内容可读 ← C-3
- 触发: 操作 在三种视口分别阅读中文和英文 NPC 对话与完整资料速览。
- Given: 介绍包含所有技能、作品和联系方式。
- When: 访客浏览全部正文并使用翻页、语言切换与关闭操作。
- Then: 所有正文可读，必要时可在阅读区域滚动；必要操作不被屏幕边缘裁切，两种语言均可完成阅读和关闭。
## 3. 涉及文件
- 新建 `/Users/bb/Projects/0xbb.me/components/portfolio/reading-acceptance.test.tsx`，只有整合回归测试，无生产修改权。
## 6. 函数清单
无新增生产函数；调用已交付公开组件、状态及实际三场景内容，不复制事实形成第二来源。
## 7. 协作关系
依赖完整旅程和主页；Bun + react-dom/server 校验全量公开输出，ego-browser 校验真实事件与布局。失败返回主 agent 归因，不能在本任务修改其它任务文件或把当前问题追加为隐蔽修复。
## 8. 验证方式
- 测试写入授权：M3 获授权后，仅新增或修改 `/Users/bb/Projects/0xbb.me/components/portfolio/reading-acceptance.test.tsx`；不得修改生产文件或任务字段。
- 独立验证命令：`cd /Users/bb/Projects/0xbb.me && bun test ./components/portfolio/reading-acceptance.test.tsx`。
- 公开验证入口：已交付的 Hud、Dialogue、Overview、getProfile/getCopy 和三场景公开介绍输出，以及网页 `/`；输入 en/zh、各对话段落、故障及三种指定视口，仅按业务规则和本区的完整阅读场景验证。
- 公开输出入口组合三个实际场景/全部页与 en/zh：界面词条、场景名、背景、六技能、三作品、四联系都完整，所有链接在两语言下一致；禁止以源码查找翻译字符串代替输出。
- ego-browser 在 1440×900、390×844、844×390 分别双语逐页读完三个 NPC 和完整速览，滚动到底并激活翻页、关闭、语言；全部按钮在屏幕内可达，无整页横向溢出。
- 在导师/策展人非首段切语言与改尺寸：人物位置、打开面板及语义段落保持；作品/源码链接分别对应实际项目。
- 禁用图形、阻断场景模块、阻断角色模块、运行上下文失效分别复核：故障说明和完整资料两语言均可读，作品与联系可用，不依赖恢复。
- 保留实际浏览器操作及目标地址证据；第三方服务失败不算本站地址错误；静态输出测试成功不能替代本任务浏览器验收。任何未测视口或故障变体均报告未覆盖。
