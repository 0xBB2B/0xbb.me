---
id: T-1
title: M1 双语资料与词条
depends_on: []
files: [/Users/bb/Projects/0xbb.me/data.ts, /Users/bb/Projects/0xbb.me/portfolio/copy.ts, /Users/bb/Projects/0xbb.me/data.test.ts, /Users/bb/Projects/0xbb.me/portfolio/copy.test.ts]
refs: [portfolio/profile-overview/AC-1, portfolio/profile-overview/AC-2, portfolio/profile-overview/AC-3]
parallel: true
verify: cd /Users/bb/Projects/0xbb.me && bun test ./data.test.ts ./portfolio/copy.test.ts
status: todo
step: test
agent: ""
commit: ""
note: ""
---
## 1. 目标
为样板与后续场景提供无图形依赖的完整中英资料和界面词条，不虚构个人事实。
## 2. 业务规则
- C-1：系统应介绍 FUBUKI_BB 是全栈工程师、系统架构师与 AI 探索者，地点为 Tokyo、Shanghai，工作方向包括 AI 工作流、可扩展后端、游戏 SDK 生态与交易平台，不添加未经确认的雇主、客户、奖项或成绩。
- C-2：系统应展示 6 项技能及其等级：AI 999、Harness Engineering 99、Context Engineering 99、Prompt Engineering 99、Go (Golang) 90、Docker / K8s 85；等级不得改写为百分比熟练度。
- C-3：系统应展示 3 个 ONLINE 作品及下方作品表中对应的介绍、访问与源码入口；站点自身作品介绍应描述 HD-2D 探索主页。
### AC-1 个人事实 ← C-1
- 触发: 操作 打开资料速览并阅读简介。
- Given: 访客首次进入主页，未操作主人公。
- When: 访客查看简介，并与 NPC 的背景介绍比较。
- Then: 主人姓名、职业、地点和工作方向符合约束，两处内容表达相同事实，不出现未经确认的个人成果或雇佣关系。
### AC-2 六项技能 ← C-2
- 触发: 操作 打开资料速览的技能内容。
- Given: 资料速览可访问。
- When: 访客逐项查看技能及等级。
- Then: 展示列出的 6 项技能与对应等级，数值没有被转换为百分比或删改。
### AC-3 三个作品与链接 ← C-3
- 触发: 操作 阅读作品列表并逐一激活访问与源码入口。
- Given: 资料速览可访问，浏览器允许正常外链导航。
- When: 访客检查 3 个作品的名称、状态、描述及链接目标。
- Then: 3 个作品均为 ONLINE，介绍要点和链接与作品表一致；浏览器导航到对应地址，不以第三方服务的实时可用性作为本站承诺。
| 作品 | 介绍要点 | 访问入口 | 源码入口 |
|---|---|---|---|
| 0xbb.me | 可操控角色、NPC 介绍、三场景的 HD-2D 个人主页 | https://0xbb.me | https://github.com/0xBB2B/0xbb.me |
| bb-spec | 将模糊需求推进到审查交付的规范驱动流程，支持追踪、续接与对抗性验证 | https://github.com/0xBB2B/bb-spec | https://github.com/0xBB2B/bb-spec |
| pi-subagent-cluster | 分解任务并在隔离工作进程中执行，以审查驱动重试和层级升级 | https://pi.dev/packages/@0xbb2b/pi-subagent-cluster | https://github.com/0xBB2B/pi-subagent-cluster |
联系目标：GitHub https://github.com/0xBB2b；LinkedIn https://www.linkedin.com/in/0xbb2b；Juejin https://juejin.cn/user/1037558235795032；Email mailto:bb@yorha.xyz。
界面中英覆盖移动、交谈、翻页、关闭、语言、速览、加载、故障及场景名；名称与链接身份不随语言改变。去掉资料中的位图和旧光剑介绍，不添加新履历。
## 3. 涉及文件
- 修改 `/Users/bb/Projects/0xbb.me/data.ts`：双语事实；删除旧图形引用与旧站点作品介绍。
- 新建 `/Users/bb/Projects/0xbb.me/portfolio/copy.ts`：双语界面词条。
- 新建 `/Users/bb/Projects/0xbb.me/data.test.ts`、`/Users/bb/Projects/0xbb.me/portfolio/copy.test.ts`：公开内容接口测试。
## 6. 函数清单
- data.ts：getProfile，按语言取得简介、技能、作品和社交资料；声明公开资料类型。
- portfolio/copy.ts：getCopy，取得该语言的界面文本。
## 7. 协作关系
不依赖 Three.js 或浏览器；供 town、后续场景与 React UI 消费。现有 Bun 测试即可，无新增依赖；T-8/T-25 验证浏览器阅读与导航，不将数据测试当作界面验收。
## 8. 验证方式
- 公开 getProfile 入口分别输入 en、zh：逐项核对职业、两地点、四工作方向、六等级、三个 ONLINE 项目的介绍与六个链接、四个联系方式；双语事实一致且无新增雇佣成果。
- 公开 getCopy 入口分别输入 en、zh：所有约定界面语义均有非空对应文本，不出现占位内容；技术与项目名无需翻译。
- 不加载图形模块仍能取得全部资料；返回的图形引用不得含位图、旧光剑地址或旧游戏描述。
- M1 完整资料可先读，但三个场景 NPC 全部覆盖只在 T-14/T-25 验证，不能据本任务宣称全站完成。
