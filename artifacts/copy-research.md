# 文案扩写来源与边界

## 本轮表达方式
- NPC为世界原住民，署名“NPC · 迎宾者”，三页世界观讲小镇、工厂和星海/灯塔，不讲FUBUKI_BB履历；职业与地点只属于主角资料。
- 既有个人事实保持：FUBUKI_BB、全栈工程师/系统架构师/AI Agent开发者、Tokyo/Shanghai及已确认的工程方向。
- 技能短简介保留在场景终端；完整说明以用户随后明确补充的个人实践为主要依据，不再写技术定义。AI Agent两段关联实际项目，其余技能三段写做过的系统、业务价值与设计取向；速览展示同一份说明。
- 三个项目说明各扩为三段，分别解释出发点、实际机制与希望解决的问题。
- 文艺表达是本轮撰写的叙述，不用网络文章替代个人履历，不声称客户数量、交易规模、奖项、熟练等级或未经确认的集成经历。
- 灯塔题记来自用户给定含义，显示在灯塔旁，不是左上角场景标题，也不是弹窗。

## 用户确认的个人实践（当前技能文案的主要依据）
- AI Agent已有bb-spec与pi-subagent-cluster实际项目，简洁关联，不泛讲概念。
- Golang为最拿手语言，从零设计了许多系统，包括海外游戏发行SDK框架和网页积分商城。
- Docker/k8s为基础组件，所有开发和部署基于这套框架。
- 海外游戏发行SDK帮助国内开发商出海，快速接入各国登录与支付系统，减少研发开发成本。
- 支付实践包括SDK接入多国支付渠道、网页积分商城的在线积分活动与支付，不虚构未给出的机构名称、金额、覆盖数量或成绩。

## 已读取的第一手资料
- [Go：Effective Go](https://go.dev/doc/effective_go) — 接口、goroutine与channel等语言设计和并发组织。文案强调清晰边界、错误处理与可维护性，不承诺并发自动加速。
- [Docker：What is Docker?](https://docs.docker.com/get-started/docker-overview/) — 镜像、容器与交付环境。
- [Kubernetes：Overview](https://kubernetes.io/docs/concepts/overview/) — 期望状态、容器工作负载、发布与恢复。用于技术领域说明，不当作个人项目规模证明。
- [OpenAI：Agents SDK](https://platform.openai.com/docs/guides/agents) — 工具、状态、执行记录、评估及人工审核。
- [Steamworks API Overview](https://partner.steamgames.com/doc/sdk/api) — 初始化、异步回调、生命周期与接口版本等SDK基础。仅作为通用集成设计参考，文案没有声称本站作者交付了Steam或任何特定发行商SDK。
- [Stripe：Idempotent requests](https://docs.stripe.com/api/idempotent_requests) — 安全重试和重复操作识别。
- [Stripe：Webhooks](https://docs.stripe.com/webhooks) — 事件通知与验证。仅用于通用支付工程说明，不声称有Stripe客户或交易成绩。
- [BB-Spec官方README](https://github.com/0xBB2B/bb-spec/blob/main/README.md) — 规范→计划→隔离测试/实现/审查→评审/交付；文件化交接、追踪、续接与对抗性验证。
- [Pi Subagent Cluster官方README](https://github.com/0xBB2B/pi-subagent-cluster/blob/main/README.md) — 任务图、隔离Pi子进程、只读审核、重试/升级、管理界面与人工决策。
- 0xbb.me的介绍依据当前仓库实际功能：三景、门交互、五终端、三项目星星、双语/速览、图形失败阅读及灯塔收尾。

## 不采用的来源
搜索结果里出现过其他作者的subagent项目，没有把它们的能力归到pi-subagent-cluster。Epic文档的正文抓取未成功，未作为能力声明依据。项目详情以随后读取的本项目官方README为准。

## 人设图确认
用户已确认将public/profile-full.png加入资料速览：桌面左图右文，手机竖屏上图下文，保持原比例、不裁切。原文件约6.1MB，只有打开速览后才请求，解码异步；图片失败不阻断阅读。本轮未压缩、重绘或替换用户原图，未把它用于三维角色。

## 功能与测试约束
- EN/中只在没有弹窗的主页显示；对话、技能/项目详情、资料速览、故障资料打开时均不显示语言按钮。关闭回主页后选语言，再重新打开阅读；NPC重读从第一页开始。
- 故障资料自动打开，但允许关闭回到主页选语言；故障说明与资料速览入口保留，不要求恢复图形。
- 长文区域可滚动，关闭和NPC翻页保留可达；项目访问/源码及联系链接目标未改变。
- 海浪近岸相位朝岸方向推进；项目光晕整体在水面远端之上，远端之后不再出现裸露地面色带。
