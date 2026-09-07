import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { APP_DATA } from '../../data';
import type { TownInput } from '../../portfolio/input';
import type { Session } from '../../portfolio/state';

export function Hud({ session, input }: {
  session: Session; input: TownInput;
}) {
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const overview = useRef<HTMLDialogElement>(null);
  const isEnglish = language === 'en';
  const text = isEnglish ? {
    town: 'Dusk town', chapter: '01 / A WALK AT GOLDEN HOUR', title: 'A little town.\nA wider world.',
    welcome: 'Take a stroll. Get to know the person behind the code.',
    overview: 'Quick overview', left: 'Move left', right: 'Move right',
    walk: 'Hold to walk · Release to pause', keyboard: 'A / D  or  ← / →',
    close: 'Back to town', profile: 'The person behind the code', skills: 'Skills', projects: 'Projects',
    source: 'Source', visit: 'Visit', contacts: 'Find me elsewhere',
    preview: 'Character preview · Walking animation not yet complete.',
  } : {
    town: '黄昏城镇', chapter: '01 / 漫步于日落时分', title: '一座小镇，\n一个更大的世界。',
    welcome: '沿着石板路走走，认识代码背后的我。',
    overview: '资料速览', left: '向左', right: '向右', walk: '按住行走 · 松开停下', keyboard: 'A / D  或  ← / →',
    close: '返回城镇', profile: '代码背后的我', skills: '技能', projects: '作品', source: '源码', visit: '访问', contacts: '在别处找到我',
    preview: '人物造型预览 · 行走动画尚未完成。',
  };
  useEffect(() => { document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN'; }, [language]);
  const languageButton = <button className="language-button" aria-label={isEnglish ? 'Language' : '语言'}
    onClick={() => setLanguage(isEnglish ? 'zh' : 'en')}><span aria-hidden="true">◎</span> {isEnglish ? 'EN / 中' : '中 / EN'}</button>;
  const openOverview = () => {
    input.pause(true);
    session.paused = true;
    overview.current?.showModal();
  };
  const resumeTown = () => {
    input.pause(false);
    session.paused = false;
  };
  const closeOverview = () => {
    overview.current?.close();
    resumeTown();
  };
  const endPointer = (event: PointerEvent<HTMLButtonElement>) => {
    input.release(`pointer:${event.pointerId}`);
  };
  return <>
    <header className="town-header">
      <a className="wordmark" href="./" aria-label="FUBUKI_BB home"><span className="brand-mark" aria-hidden="true">f.</span>{APP_DATA.profile.name}</a>
      <span className="header-note">{APP_DATA.profile.role}</span>
      <nav aria-label={isEnglish ? 'Portfolio' : '个人主页'}>
        {languageButton}
        <button className="overview-button" onClick={openOverview}>{text.overview} <span aria-hidden="true">↗</span></button>
      </nav>
    </header>
    <section className="town-intro" aria-label={text.town}>
      <p className="eyebrow">{text.chapter}</p>
      <h1>{text.title}</h1>
      <p className="intro-caption">{text.welcome}</p>
      <p className="character-preview-note">{text.preview}</p>
    </section>
    <footer className="town-footer">
      <div className="movement-controls" aria-label={isEnglish ? 'Walking controls' : '行走控制'}>
        {([-1, 1] as const).map(direction => <button key={direction} className="direction-button"
          aria-label={direction === -1 ? text.left : text.right}
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            input.press(`pointer:${event.pointerId}`, direction);
          }}
          onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={endPointer}
          onContextMenu={event => event.preventDefault()}>{direction === -1 ? '←' : '→'}</button>)}
        <div className="walk-help"><span className="keyboard-help">{text.keyboard}</span><span>{text.walk}</span></div>
      </div>
      <div className="place-label"><span className="place-dot" /><div><b>{text.town}</b><span>HD–2D · 01</span></div></div>
    </footer>
    <dialog className="profile-overview" ref={overview} aria-labelledby="overview-title"
      onClose={resumeTown}>
      <div className="overview-toolbar">
        <span className="eyebrow">{text.overview}</span>
        {languageButton}
        <button onClick={closeOverview} autoFocus>{text.close} <span aria-hidden="true">×</span></button>
      </div>
      <div className="overview-content">
        <p className="eyebrow">{text.profile}</p>
        <h2 id="overview-title">{APP_DATA.profile.name}</h2>
        <p className="profile-role">{APP_DATA.profile.role}</p>
        <p className="profile-location">{APP_DATA.profile.location.replace(',', ' · ')}</p>
        <p className="profile-bio">{APP_DATA.profile.bio}</p>
        <h3>{text.skills}</h3>
        <ul className="skill-list">{APP_DATA.skills.map(skill => <li key={skill.name}>{skill.name} <span>LV.{skill.level}</span></li>)}</ul>
        <h3>{text.projects}</h3>
        <div className="overview-projects">{APP_DATA.projects.map(project => <article key={project.id}>
          <h4>{project.title}</h4><p>{project.description}</p>
          <small>{project.tech.join(' · ')}</small>
          <div><a href={project.link} target="_blank" rel="noopener noreferrer">{text.visit} ↗</a>
            <a href={project.repo} target="_blank" rel="noopener noreferrer">{text.source} ↗</a></div>
        </article>)}</div>
        <h3>{text.contacts}</h3>
        <div className="social-links">{APP_DATA.socialLinks.map(link => <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer">{link.name} ↗</a>)}</div>
      </div>
    </dialog>
  </>;
}
