import { APP_DATA, type Language } from '../data';

export const UI_COPY = {
  en: {
    town: 'Dusk town', chapter: '01 / A WALK AT GOLDEN HOUR', title: 'A little town.\nA wider world.',
    welcome: 'Take a stroll. Get to know the person behind the code.', overview: 'Quick overview',
    left: 'Move left', right: 'Move right', walk: 'Hold to walk · Release to pause', keyboard: 'A / D  or  ← / →',
    closeOverview: 'Back to town', profile: 'The person behind the code', skills: 'Skills', projects: 'Projects',
    source: 'Source', visit: 'Visit', contacts: 'Find me elsewhere', talk: 'Talk',
    previous: 'Previous page', next: 'Next page', closeDialogue: 'Close introduction',
    preview: 'Character appearance preview · Hold a direction to walk.',
    overviewLabel: 'Profile overview', dialogueLabel: 'Greeter introduction',
  },
  zh: {
    town: '黄昏小镇', chapter: '01 / 漫步于日落时分', title: '一座小镇，\n一个更大的世界。',
    welcome: '沿着石板路走走，认识代码背后的我。', overview: '资料速览', left: '向左', right: '向右',
    walk: '按住行走 · 松开停下', keyboard: 'A / D  或  ← / →', closeOverview: '返回城镇',
    profile: '代码背后的我', skills: '技能', projects: '作品', source: '源码', visit: '访问', contacts: '联系入口',
    talk: '交谈', previous: '上一页', next: '下一页', closeDialogue: '关闭介绍',
    preview: '人物造型预览 · 按住方向键即可行走。', overviewLabel: '资料速览', dialogueLabel: '迎宾介绍',
  },
} satisfies Record<Language, Record<string, string>>;

export function greeterPages(language: Language) {
  const { name, roles, location, directions } = APP_DATA.profile;
  if (language === 'en') return [
    { title: 'Identity & places', body: `${name} is a ${roles.en.join(', ')} based in ${location.join(' and ')}.` },
    { title: 'Engineering direction', body: `${roles.en[0]} and ${roles.en[1]} work spanning ${directions.slice(1).map(item => item.en).join(', ')}.` },
    { title: 'AI workflows', body: `As an ${roles.en[2]}, ${name} designs ${directions[0].en} with Skills and Agents to solve complex engineering problems.` },
  ];
  return [
    { title: '身份与地点', body: `${name} 是${roles.zh.join('、')}，常驻 ${location.join('、')}。` },
    { title: '工程方向', body: `${roles.zh[0]}与${roles.zh[1]}工作覆盖${directions.slice(1).map(item => item.zh).join('、')}。` },
    { title: 'AI 工作流', body: `作为${roles.zh[2]}，${name} 使用 Skills 与 Agents 设计${directions[0].zh}，解决复杂工程问题。` },
  ];
}
