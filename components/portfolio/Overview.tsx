import { useEffect, useRef } from 'react';
import { APP_DATA, type Language } from '../../data';
import { UI_COPY } from '../../portfolio/copy';
import './Overview.css';

export function Overview({ open, language, onLanguage, onClose }: {
  open: boolean;
  language: Language;
  onLanguage: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const text = UI_COPY[language];
  const profile = APP_DATA.profile;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog className="profile-overview" ref={ref} aria-label={text.overviewLabel}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}>
    <div className="overview-toolbar">
      <span className="eyebrow">{text.overview}</span>
      <button className="language-button" aria-label={language === 'en' ? 'Language' : '语言'} onClick={onLanguage}>
        <span aria-hidden="true">◎</span> {language === 'en' ? 'EN / 中' : '中 / EN'}
      </button>
      <button onClick={onClose} aria-label={text.closeOverview}>{text.closeOverview} <span aria-hidden="true">×</span></button>
    </div>
    <div className="overview-content">
      <p className="eyebrow">{text.profile}</p>
      <h2>FUBUKI_BB</h2>
      <p className="profile-role">{profile.roles[language].join(' · ')}</p>
      <p className="profile-location">{profile.location.join(' · ')}</p>
      <ul className="profile-directions">{profile.directions.map(direction => <li key={direction.id}>{direction[language]}</li>)}</ul>
      <h3>{text.skills}</h3>
      <ul className="skill-list">{APP_DATA.skills.map(skill => <li key={skill.name}>{skill.name} <span>{skill.level}</span></li>)}</ul>
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
