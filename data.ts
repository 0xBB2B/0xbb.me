export type Language = 'en' | 'zh';
export type LocalizedText = Record<Language, string>;

export const APP_DATA = {
  profile: {
    name: 'FUBUKI_BB',
    roles: {
      en: ['Full Stack Engineer', 'System Architect', 'AI Agent Developer'],
      zh: ['全栈工程师', '系统架构师', 'AI Agent开发者'],
    } satisfies Record<Language, string[]>,
    location: ['Tokyo', 'Shanghai'],
    bio: {
      en: 'Behind every interface is a small promise: that someone can find their way, finish their work, or begin something new. This corner of the web brings together full-stack engineering, system architecture, and an ongoing exploration of AI workflows.',
      zh: '每一个界面背后，都藏着一个朴素的约定：让人找到方向，把事情做好，或是开始一段新的尝试。这里记录着全栈工程、系统架构，以及对 AI 工作流的持续探索。',
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
};
