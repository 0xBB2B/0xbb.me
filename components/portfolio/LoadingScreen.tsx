import type { Language } from '../../data';

export const LOADING_EXIT_MS = 450;

const COPY = {
  en: {
    chapter: 'A LITTLE WORLD, COMING TO LIFE',
    title: 'Every journey starts\nwith a little light.',
    subtitle: 'A quiet town. An open door. A sea of possibilities.',
    code: 'Loading the journey…', world: 'Preparing the town…', ready: 'Your journey is ready.',
    overview: 'Read the profile while you wait',
    route: 'TOWN · WORKSHOP · STARLIT SHORE',
  },
  zh: {
    chapter: '点亮一个小小的世界',
    title: '每一段旅程，\n都从一点微光开始。',
    subtitle: '一座小镇，一扇门，一片充满可能的海。',
    code: '正在加载旅程…', world: '正在准备小镇…', ready: '旅程准备好了。',
    overview: '等待时，先读一读个人资料',
    route: '黄昏小镇 · 科技工坊 · 星夜海岸',
  },
} satisfies Record<Language, Record<string, string>>;

export function LoadingScreen({ phase = 'code', language = 'en', leaving = false, onOverview }: {
  phase?: 'code' | 'world';
  language?: Language;
  leaving?: boolean;
  onOverview?: () => void;
}) {
  const text = COPY[language];
  return <section className={`loading-screen${leaving ? ' is-leaving' : ''}`} aria-label={language === 'en' ? 'Loading' : '正在加载'}
    style={{ transitionDuration: `${LOADING_EXIT_MS}ms` }}>
    <header className="loading-brand"><span aria-hidden="true">f.</span> FUBUKI_BB</header>
    <span className="loading-edition" aria-hidden="true">MC-2D / PORTFOLIO</span>
    <div className="loading-content">
      <svg className="loading-town" viewBox="0 0 320 170" aria-hidden="true" focusable="false">
        <circle cx="166" cy="70" r="57" fill="#e9ce94" />
        <path d="M22 130 76 99 121 112 210 78 301 127V148H22Z" fill="#c8b794" />
        <path d="M49 135V88H106V135Z" fill="#b6845b" />
        <path d="M40 89 76 60 115 89Z" fill="#91604b" />
        <path d="M83 68V51H94V77Z" fill="#795141" />
        <path d="M133 135V71H192V135Z" fill="#c5996a" />
        <path d="M124 72 162 39 201 72Z" fill="#9f644a" />
        <path d="M173 51V30H184V61Z" fill="#78503f" />
        <path d="M217 135V96H263V135Z" fill="#ac805b" />
        <path d="M208 97 240 72 272 97Z" fill="#805a48" />
        <path className="loading-window" d="M63 102H74V114H63ZM86 102H97V114H86ZM146 85H158V99H146ZM169 85H181V99H169ZM230 108H242V120H230Z" fill="#ffe8ad" />
        <path d="M155 135V113H171V135Z" fill="#625849" />
        <path d="M25 135H291V139H25ZM69 148H247V151H69ZM121 160H197V163H121Z" fill="#907655" />
        <path d="M284 134V96H287V134ZM278 92H293V101H278Z" fill="#685743" />
        <path className="loading-window" d="M281 94H290V99H281Z" fill="#ffe8ad" />
      </svg>
      <p className="loading-chapter">{text.chapter}</p>
      <h1 lang={language}>{text.title}</h1>
      <p className="loading-subtitle">{text.subtitle}</p>
      <div className="loading-track" aria-hidden="true"><span /></div>
      <p className="loading-status" role="status" aria-live="polite" aria-atomic="true">{leaving ? text.ready : text[phase]}</p>
      <button className="loading-overview" disabled={!onOverview || leaving} onClick={onOverview}>
        {text.overview} <span aria-hidden="true">↗</span>
      </button>
    </div>
    <footer className="loading-route">{text.route}</footer>
  </section>;
}
