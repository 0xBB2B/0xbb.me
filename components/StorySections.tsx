import { useMemo, useState } from 'react';
import { APP_DATA, type Language } from '../data';
import { COPY, AVATAR_FALLBACK, rolesLine, locationLine } from '../copy';
import './StorySections.css';

interface StorySectionsProps {
  language: Language;
  active: boolean;
  currentIndex: 0 | 1 | 2;
  failed: boolean;
  leaving?: boolean;
  onLanguageChange: (language: Language) => void;
  sectionRef?: (index: number, element: HTMLElement | null) => void;
  showBack?: boolean;
  onBack?: () => void;
}

export function StoryBackButton({ language, onBack }: { language: Language; onBack?: () => void }) {
  return (
    <button type="button" className="story-back-button" onClick={onBack}>
      {COPY[language].backToOverview}
    </button>
  );
}

export function StoryAvatar({ language }: { language: Language }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <div className="story-avatar story-avatar--fallback">{AVATAR_FALLBACK}</div>;
  }
  return (
    <img
      className="story-avatar"
      src="./profile.jpg"
      alt={COPY[language].avatarAlt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

export function StoryLinks({ language }: { language: Language }) {
  return (
    <ul className="story-links">
      {APP_DATA.socialLinks.map((link) => {
        const isMail = link.url.startsWith('mailto:');
        return (
          <li key={link.name}>
            <a href={link.url} {...(isMail ? {} : { target: '_blank', rel: 'noopener' })}>
              {link.name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function ProgressDots({
  language,
  currentIndex,
}: {
  language: Language;
  currentIndex: 0 | 1 | 2;
}) {
  return (
    <div className="story-dots" aria-label={COPY[language].progressLabel}>
      {([0, 1, 2] as const).map((index) => (
        <span
          key={index}
          className={`story-dot${index === currentIndex ? ' story-dot--active' : ''}`}
          {...(index === currentIndex ? { 'aria-current': 'true' as const } : {})}
        />
      ))}
    </div>
  );
}

export function LanguageToggle({
  language,
  onLanguageChange,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  return (
    <div className="story-language" aria-label={COPY[language].languageLabel}>
      <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageChange('en')}>
        EN
      </button>
      <button type="button" aria-pressed={language === 'zh'} onClick={() => onLanguageChange('zh')}>
        中
      </button>
    </div>
  );
}

export function StorySections({
  language,
  active,
  currentIndex,
  failed,
  leaving = false,
  onLanguageChange,
  sectionRef,
  showBack = false,
  onBack,
}: StorySectionsProps) {
  const copy = COPY[language];
  const sectionRefs = useMemo(
    () => [0, 1, 2].map((index) => (element: HTMLElement | null) => sectionRef?.(index, element)),
    [sectionRef],
  );
  return (
    <div
      className={`story-sections${leaving ? ' story-sections--leaving' : ''}`}
      hidden={!active && !leaving}
      inert={!active}
    >
      {showBack && <StoryBackButton language={language} onBack={onBack} />}
      <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
      <ProgressDots language={language} currentIndex={currentIndex} />
      <div className="story-sections-content">
        <section className="story-section" ref={sectionRefs[0]}>
          <div className="story-text">
            <p className="story-kicker">{copy.sectionLabels[0]}</p>
            {failed && (
              <p className="story-alert" role="alert">
                {copy.sceneFailed}
              </p>
            )}
            <StoryAvatar language={language} />
            <h1 tabIndex={-1}>FUBUKI_BB</h1>
            <p className="story-roles">{rolesLine(language)}</p>
            <p className="story-location">{locationLine()}</p>
          </div>
          <p className="story-hint">{copy.scrollHint}</p>
        </section>
        <section className="story-section" ref={sectionRefs[1]}>
          <div className="story-text">
            <p className="story-kicker">{copy.sectionLabels[1]}</p>
            <h2>{copy.aboutTitle}</h2>
            <p className="story-bio">{APP_DATA.profile.bio[language]}</p>
          </div>
        </section>
        <section className="story-section" ref={sectionRefs[2]}>
          <div className="story-text">
            <p className="story-kicker">{copy.sectionLabels[2]}</p>
            <h2>{copy.linksTitle}</h2>
            <ul className="story-directions">
              {APP_DATA.profile.directions.map((direction) => (
                <li key={direction.id}>{direction[language]}</li>
              ))}
            </ul>
            <StoryLinks language={language} />
          </div>
        </section>
      </div>
    </div>
  );
}
