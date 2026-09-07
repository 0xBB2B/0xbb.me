export type Language = 'en' | 'zh';
export type LocalizedText = Record<Language, string>;

export const APP_DATA = {
  profile: {
    name: 'FUBUKI_BB',
    roles: {
      en: ['Full Stack Engineer', 'System Architect', 'AI Explorer'],
      zh: ['全栈工程师', '系统架构师', 'AI 探索者'],
    } satisfies Record<Language, string[]>,
    location: ['Tokyo', 'Shanghai'],
    directions: [
      { id: 'ai-workflows', en: 'AI Workflows', zh: 'AI 工作流' },
      { id: 'scalable-backends', en: 'Scalable Backends', zh: '可扩展后端' },
      { id: 'game-sdk-ecosystems', en: 'Game SDK Ecosystems', zh: '游戏 SDK 生态' },
      { id: 'trading-platforms', en: 'Trading Platforms', zh: '交易平台' },
    ],
  },
  socialLinks: [
    { name: 'GitHub', url: 'https://github.com/0xBB2b' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/0xbb2b' },
    { name: 'Juejin', url: 'https://juejin.cn/user/1037558235795032' },
    { name: 'Email', url: 'mailto:bb@yorha.xyz' },
  ],
  skills: [
    { name: 'AI', level: 999 },
    { name: 'Harness Engineering', level: 99 },
    { name: 'Context Engineering', level: 99 },
    { name: 'Prompt Engineering', level: 99 },
    { name: 'Go (Golang)', level: 90 },
    { name: 'Docker / K8s', level: 85 },
  ],
  projects: [
    {
      id: '0xbb.me', title: '0xbb.me', status: 'ONLINE',
      description: {
        en: 'An HD-2D exploration portfolio with a controllable character and a welcoming NPC introduction.',
        zh: '一座可操控角色探索、可与迎宾 NPC 交谈的 HD-2D 个人主页。',
      } satisfies LocalizedText,
      repo: 'https://github.com/0xBB2B/0xbb.me', link: 'https://0xbb.me',
    },
    {
      id: 'bb-spec', title: 'bb-spec', status: 'ONLINE',
      description: {
        en: 'A spec-driven process that moves fuzzy requirements to reviewed delivery with traceability, continuation and adversarial verification.',
        zh: '将模糊需求推进到审查交付的规范驱动流程，支持追踪、续接与对抗性验证。',
      } satisfies LocalizedText,
      repo: 'https://github.com/0xBB2B/bb-spec', link: 'https://github.com/0xBB2B/bb-spec',
    },
    {
      id: 'pi-subagent-cluster', title: 'pi-subagent-cluster', status: 'ONLINE',
      description: {
        en: 'Decomposes tasks into isolated worker processes, with review-driven retries and tiered escalation.',
        zh: '分解任务并在隔离工作进程中执行，以审查驱动重试和层级升级。',
      } satisfies LocalizedText,
      repo: 'https://github.com/0xBB2B/pi-subagent-cluster', link: 'https://pi.dev/packages/@0xbb2b/pi-subagent-cluster',
    },
  ],
};
