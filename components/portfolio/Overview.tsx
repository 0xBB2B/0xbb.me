import { useEffect, useRef, useState } from 'react';
import { APP_DATA, type Language } from '../../data';
import { UI_COPY } from '../../portfolio/copy';
import './Overview.css';

export function Overview({ open, fault, language, onClose }: {
  open: boolean;
  fault?: string;
  language: Language;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [portraitUnavailable, setPortraitUnavailable] = useState(false);
  const text = UI_COPY[language];
  const profile = APP_DATA.profile;
  useEffect(() => { if (open) setPortraitUnavailable(false); }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.focus({ preventScroll: true });
      dialog.scrollTop = 0;
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog className="profile-overview" ref={ref} aria-label={text.overviewLabel}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}>
    <div className="overview-toolbar">
      <span className="eyebrow">{text.overview}</span>
      <button onClick={onClose} aria-label={text.closeOverview}>{text.closeOverview} <span aria-hidden="true">×</span></button>
    </div>
    {fault && <p className="overview-fault" role="alert">{fault}</p>}
    <div className="overview-content">
      <section className="profile-dossier" aria-label={language === 'en' ? 'Character profile' : '角色档案'}>
        <figure className="profile-portrait">
          {open && !portraitUnavailable && <img src="./profile-full.png" width="1696" height="2528" decoding="async"
            alt={language === 'en' ? 'FUBUKI_BB — personal character portrait' : 'FUBUKI_BB 的个人人设图'}
            onError={() => setPortraitUnavailable(true)} />}
          {portraitUnavailable && <div className="portrait-unavailable" role="img"
            aria-label={language === 'en' ? 'Character portrait unavailable' : '人设图暂不可用'}>
            <span aria-hidden="true">f.</span>
            <p>{language === 'en' ? 'The portrait could not load. Your reading continues below.' : '人设图暂时未能加载，文字资料仍可阅读。'}</p>
          </div>}
          <figcaption><span>FUBUKI_BB</span><small>{language === 'en' ? 'Character portrait' : '个人人设'}</small></figcaption>
        </figure>
        <div className="profile-identity">
          <p className="eyebrow">{text.profile}</p>
          <h2>FUBUKI_BB</h2>
          <p className="profile-role">{profile.roles[language].join(' · ')}</p>
          <p className="profile-location">{profile.location.join(' · ')}</p>
          <p className="profile-bio">{profile.bio[language]}</p>
        </div>
      </section>
      <ul className="profile-directions">{profile.directions.map(direction => <li key={direction.id}>{direction[language]}</li>)}</ul>
      <h3>{text.skills}</h3>
      <ul className="skill-list">{APP_DATA.skills.map(skill => <li key={skill.id}>
        <h4>{skill.title[language]}</h4><p>{skill.detail[language]}</p>
      </li>)}</ul>
      <h3>{text.projects}</h3>
      <div className="overview-projects">{APP_DATA.projects.map(project => <article key={project.id}>
        <h4>{project.title} <small>{project.status}</small></h4>
        <p>{project.description[language]}</p>
        <div><a href={project.link} target="_blank" rel="noopener noreferrer">{text.visit} ↗</a>
          <a href={project.repo} target="_blank" rel="noopener noreferrer">{text.source} ↗</a></div>
      </article>)}</div>
      <h3>{text.contacts}</h3>
      <div className="social-links">{APP_DATA.socialLinks.map(link => <a key={link.name} href={link.url}
        target="_blank" rel="noopener noreferrer">{link.name} ↗</a>)}</div>
    </div>
  </dialog>;
}
