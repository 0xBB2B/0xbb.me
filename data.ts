export type Language = 'en' | 'zh';
export type LocalizedText = Record<Language, string>;

export type Skill = {
  id: string;
  name: string;
  title: LocalizedText;
  summary: LocalizedText;
  detail: LocalizedText;
};

export const APP_DATA = {
  profile: {
    name: 'FUBUKI_BB',
    roles: {
      en: ['Full Stack Engineer', 'System Architect', 'AI Agent Developer'],
      zh: ['全栈工程师', '系统架构师', 'AI Agent开发者'],
    } satisfies Record<Language, string[]>,
    location: ['Tokyo', 'Shanghai'],
    bio: {
      en: 'Behind every interface is a small promise: that someone can find their way, finish their work, or begin something new. This corner of the web brings together full-stack engineering, system architecture, and an ongoing exploration of AI workflows.\n\nThink of it as a walk rather than a checklist. There are ideas to read, systems to look inside, and a few projects shining over the water. Take the route at your own pace; the quick overview is here whenever you would rather sit down with the words.',
      zh: '每一个界面背后，都藏着一个朴素的约定：让人找到方向，把事情做好，或是开始一段新的尝试。这里记录着全栈工程、系统架构，以及对 AI 工作流的持续探索。\n\n比起一张匆匆划过的清单，更希望这是一段可以慢慢走的路。沿途有值得读一读的想法，有能够走进去的系统，也有几颗留在海面上方的作品星星。你可以随意停留；如果更喜欢文字，资料速览始终在这里。',
    } satisfies LocalizedText,
    directions: [
      { id: 'ai-workflows', en: 'AI Workflows', zh: 'AI 工作流' },
      { id: 'scalable-backends', en: 'Scalable Backends', zh: '可扩展后端' },
      { id: 'game-sdk-ecosystems', en: 'Game SDK Ecosystems', zh: '游戏 SDK 生态' },
      { id: 'payment-platforms', en: 'Payment Platforms', zh: '支付平台' },
    ],
  },
  socialLinks: [
    { name: 'GitHub', url: 'https://github.com/0xBB2b' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/0xbb2b' },
    { name: 'Juejin', url: 'https://juejin.cn/user/1037558235795032' },
    { name: 'Email', url: 'mailto:bb@yorha.xyz' },
  ],
  skills: [
    {
      id: 'ai-agent', name: 'AI Agent', title: { en: 'AI Agent', zh: 'AI 智能体' },
      summary: { en: 'Built into bb-spec and pi-subagent-cluster.', zh: '把 Agent 开发落成 bb-spec 与多智能体协作工具。' },
      detail: {
        en: 'I build AI Agent tools that turn complex engineering requests into work that can be followed, reviewed, and continued. bb-spec and pi-subagent-cluster are the clearest examples: one connects requirements to implementation and review; the other coordinates isolated workers, review feedback, and retries.\n\nRather than leave that work as an idea, I have made it into tools people can inspect and use. Their project pages tell the fuller story—about making collaboration more deliberate, and giving every next step a place to begin.',
        zh: '我把 AI Agent 开发做成了可以实际使用的工具。bb-spec 把需求、计划、实现与审查连接起来；pi-subagent-cluster 负责组织独立工作进程，让拆解、协作、审核与重试形成完整流程。\n\n比起停留在概念里，我更希望这些想法能够真正参与工程工作。两个项目都已经放在作品区，可以直接查看具体能力和实现：让协作有依据，也让每一步都有可以继续的起点。',
      },
    },
    {
      id: 'golang', name: 'Golang', title: { en: 'Golang', zh: 'Golang' },
      summary: { en: 'My strongest language: SDKs and points-store systems.', zh: '最拿手的语言：从零设计 SDK 框架与积分商城。' },
      detail: {
        en: 'Golang is my strongest language. I have used it to design many systems from scratch, including an SDK framework for overseas game publishing and a web-based points store. It is the language I reach for when an idea needs the structure of a complete system.\n\nMy work goes beyond an isolated endpoint: I turn business requirements into service boundaries, interfaces, data flows, and an implementation that can be developed and delivered as a whole. Both the publishing framework and the points store grew from that kind of ground-up design.\n\nWhat I value is the path from a blank page to something dependable. Clear code and thoughtful boundaries make it easier to keep building when the business changes, and easier for the next person to follow the reasoning behind the system.',
        zh: 'Golang 是我最拿手的语言。我用它从零设计过许多系统，其中包括面向海外游戏发行的 SDK 框架，以及网页积分商城系统。它是我把一个业务想法逐步搭成完整系统时，最熟悉、也最愿意依靠的工具。\n\n我做的不只是某一个接口，而是从业务需求出发，梳理服务边界、接口组织与数据流转，再把它们落实成能够开发、交付和继续演进的系统。发行框架与积分商城，都是这类从零建设的实践。\n\n从一张白纸走到可以使用的产品，中间有许多不显眼的选择。我希望这些选择最终落在清楚的代码与架构里：业务变化时还接得住，后来的人也看得懂它为什么这样生长。',
      },
    },
    {
      id: 'docker-k8s', name: 'Docker/k8s', title: { en: 'Docker/k8s', zh: 'Docker/k8s' },
      summary: { en: 'The foundation of all my development and deployment.', zh: '所有开发与部署，都建立在 Docker 和 k8s 的基础之上。' },
      detail: {
        en: 'Docker and Kubernetes are foundational components in my work: all of my development and deployment are built on this container-based setup. They are not tools reserved for the final release, but part of the everyday way I organize a project.\n\nI use that shared foundation to connect development environments, service packaging, and deployment. The application and the environment around it are considered together, so the route from writing code to running it does not have to be invented again for every system.\n\nFor me, infrastructure is the quiet part of delivery. It gives the systems above it somewhere consistent to stand, and lets more attention stay with the work those systems are meant to do.',
        zh: 'Docker 和 Kubernetes 是我工作中的基础组件，所有开发和部署都基于这套容器化框架展开。它们不是等到上线前才拿出来使用的工具，而是从项目开始就参与日常开发的一部分。\n\n我以这套基础连接开发环境、服务打包与部署流程，把应用和它所依赖的运行环境一起考虑。无论是在建设发行 SDK 框架，还是搭建积分商城，代码从写下到运行的路径，都建立在共同的底座上。\n\n基础设施对我而言，是交付里安静却不能缺席的部分。把它安排好，上面的系统才有稳定的立足之处，研发也能把更多精力留给真正需要解决的业务问题。',
      },
    },
    {
      id: 'game-publishing-sdk', name: 'Game Publishing SDK', title: { en: 'Game Publishing SDK', zh: '游戏发行 SDK' },
      summary: { en: 'Helping Chinese game studios reach global platforms.', zh: '帮助国内游戏出海，快速接入多国登录与支付系统。' },
      detail: {
        en: 'I have designed an overseas game-publishing SDK framework to help Chinese developers bring their games to international markets. It supports quicker integration with login and payment systems across different countries, reducing the integration work that each development team has to repeat.\n\nThe framework sits between a game and the services around its release. My work is to give those integrations a shared structure, so country-specific requirements do not all have to be carried separately inside the game itself.\n\nThe practical value is lower development cost and a shorter path to connecting the services a release needs. I want the bridge to do its job quietly, leaving the team with more room to build the game they set out to make.',
        zh: '我设计过面向海外游戏发行的 SDK 框架，帮助国内开发商把游戏带到海外，更快接入各个国家的登录与支付系统，减少研发团队在重复接入上投入的开发成本。\n\n这套框架站在游戏与发行所需服务之间，把不同接入需求放进共同的组织方式里。我的工作，是为这些差异搭起可以复用的桥，而不是让每一个游戏项目都从头面对一遍相同的连接问题。\n\n它的价值最终要回到研发的日常：少一些重复建设，更快把发行所需的服务接起来，也让团队有更多余地专注于游戏本身。桥应当可靠，而过桥的人，应该能够继续望向更远的地方。',
      },
    },
    {
      id: 'payment-platforms', name: 'Payment Platforms', title: { en: 'Payment Platforms', zh: '支付平台' },
      summary: { en: 'Multi-country payments, points stores and online events.', zh: '多国支付渠道、网页积分商城与在线积分活动的实际接入。' },
      detail: {
        en: 'My payment-platform work spans several concrete contexts, including integrating payment channels from multiple countries into the game-publishing SDK, and building payment-related functionality for a web-based points store and its online points campaigns.\n\nThese are not separate technology demonstrations. They connect payment capabilities to the business around them: the services a game needs for an overseas release, or the activities and payment flows that make a points store usable. I work on how those pieces meet inside a complete system.\n\nWhat matters is that the capability reaches the actual product. Whether the setting is a game release or an online activity, I want the technical work to support a clear experience rather than become another obstacle between an idea and the people using it.',
        zh: '我做过的支付平台工作，覆盖的不只是单一场景：包括在游戏发行 SDK 中接入多个国家的支付渠道，也包括网页积分商城里的在线积分活动、支付等相关功能。\n\n这些能力不是孤立的技术演示，而是和具体业务连接在一起：游戏出海需要哪些支付服务，积分商城的活动与支付流程如何落进一个完整系统，都是实际建设中需要一起考虑的问题。\n\n我更在意的是，接入最终有没有成为产品真正可用的一部分。无论是一次海外发行，还是一场线上积分活动，技术都应该托住清楚的体验，而不是在人和想法之间，再增加一道需要跨过的门槛。',
      },
    },
  ] satisfies Skill[],
  projects: [
    {
      id: '0xbb.me', title: '0xbb.me', status: 'ONLINE',
      description: {
        en: 'An MC-2D portfolio that asks you to take a walk rather than skim a wall of cards. The route begins in a dusk town, continues through an underground data factory, and ends at a lighthouse beside a bioluminescent sea.\n\nA resident greeter shares the stories of this world. Five working terminals open onto engineering fields; three stars hold the projects. Doors open only when you choose, and the quick overview offers the same material without requiring the journey.\n\nThe world is built with Three.js geometry and procedural materials, with English and Chinese reading and a profile that remains available when graphics fail. At the end, the road stops—not as a limit to what comes next, but as a small invitation to pause before setting out again.',
        zh: '这是一座邀请你走一走的 MC-2D 个人主页，而不只是一排等待被略过的卡片。旅程从黄昏小镇开始，穿过地下数据工厂，最终停在蓝色荧光海边的一座灯塔旁。\n\n原住民迎宾者讲述世界里的故事，五台终端展开工程领域，三颗星星承载作品。门要亲手打开，脚步也由你决定；不想行走时，资料速览提供同样的内容，阅读不必以完成旅程为前提。\n\n世界由 Three.js 几何与程序化材质构成，支持中英阅读，图形不可用时资料仍然可见。最后，路面在灯塔旁收住——不是为远方画上句号，而是留一个可以停下、也可以再次出发的地方。',
      } satisfies LocalizedText,
      repo: 'https://github.com/0xBB2B/0xbb.me', link: 'https://0xbb.me',
    },
    {
      id: 'bb-spec', title: 'bb-spec', status: 'ONLINE',
      description: {
        en: 'A spec-driven process that carries fuzzy requirements toward reviewed delivery. Before code starts to grow, BB-Spec asks a quieter question: what exactly are we promising to build, and how will we know the promise was kept?\n\nIts main path connects specification, planning, isolated Test → Implementation → Review, further review, and delivery. Rules, plans, and progress are written to files, so the handoff is something another session or another agent can read rather than a memory that disappears with a conversation.\n\nTraceability, continuation, and adversarial verification give the process its shape. The intention is not to make development ceremonial; it is to leave a clear trail from an early idea to the reasons a finished change deserves to be trusted.',
        zh: 'BB-Spec 是一条从模糊需求走向审查交付的规范驱动流程。在代码开始生长之前，它先问一个更安静、也更重要的问题：我们究竟承诺做什么，又该如何确认这份承诺真的被兑现？\n\n主线连接规范、计划、隔离的测试 → 实现 → 审查、进一步评审与交付。规则、计划和进度落在文件里，让下一次会话、另一个智能体都能接着读，而不必依赖一段随对话消散的记忆。\n\n可追踪、可续接与对抗性验证，构成了这条路的骨架。它希望增加的不是仪式，而是依据：从最初的想法到最后的改动，每一步都留下为什么值得相信的答案。',
      } satisfies LocalizedText,
      repo: 'https://github.com/0xBB2B/bb-spec', link: 'https://github.com/0xBB2B/bb-spec',
    },
    {
      id: 'pi-subagent-cluster', title: 'pi-subagent-cluster', status: 'ONLINE',
      description: {
        en: 'A Pi extension for turning a large coding request into a task graph, then giving each piece a focused place to run. Isolated Pi worker processes make the work easier to separate; review keeps separate work connected to a shared definition of done.\n\nRead-only reviewers check the stated acceptance criteria. A task can retry with feedback or move to a higher worker tier, while the dashboard exposes progress, attempts, outputs, and resource usage. Decisions that still need a person return to the main conversation rather than being quietly guessed.\n\nParallel work is only useful when the pieces can find their way back together. This project treats orchestration as a form of care: clear responsibilities, visible evidence, bounded retries, and a person who can pause, inspect, and choose the next step.',
        zh: 'Pi Subagent Cluster 是一个把大型编码请求拆成任务图、再为每一部分安排独立执行空间的 Pi 扩展。隔离的 Pi 工作进程让职责更清楚，审核则把分散的工作重新牵回共同的完成标准。\n\n只读审核器逐条核对验收要求；任务可以携带反馈重试，或升级执行配置。管理界面展示进度、尝试次数、输出和资源使用；仍需人判断的事情，会回到主对话里，而不是被悄悄猜过去。\n\n并行的意义，不只是同时做得更多，更在于最终能够可靠地汇合。这个项目把编排看作一种照料：分工清楚、依据可见、重试有边界，人也始终可以暂停、查看，再决定下一步。',
      } satisfies LocalizedText,
      repo: 'https://github.com/0xBB2B/pi-subagent-cluster', link: 'https://pi.dev/packages/@0xbb2b/pi-subagent-cluster',
    },
  ],
};
