import { useState } from 'react';
import { APP_DATA, type Language } from '../data';
import { COPY, AVATAR_FALLBACK, rolesLine, locationLine } from '../copy';

interface ProfileContentProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

function Avatar({ language }: { language: Language }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <div className="profile-avatar profile-avatar--fallback">{AVATAR_FALLBACK}</div>;
  }
  return (
    <img
      className="profile-avatar"
      src="./profile.jpg"
      alt={COPY[language].avatarAlt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

function LinkList({ language }: { language: Language }) {
  return (
    <ul className="profile-links" aria-label={COPY[language].linksLabel}>
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

export function ProfileContent({ language, onLanguageChange }: ProfileContentProps) {
  const copy = COPY[language];
  return (
    <div className="profile-content">
      <Avatar language={language} />
      <h1 className="profile-name">{APP_DATA.profile.name}</h1>
      <p className="profile-roles">{rolesLine(language)}</p>
      <p className="profile-location" aria-label={copy.locationLabel}>
        {locationLine()}
      </p>
      <ul className="profile-directions" aria-label={copy.directionsLabel}>
        {APP_DATA.profile.directions.map((direction) => (
          <li key={direction.id}>{direction[language]}</li>
        ))}
      </ul>
      <p className="profile-bio">{APP_DATA.profile.bio[language]}</p>
      <LinkList language={language} />
      <div className="profile-language" aria-label={copy.languageLabel}>
        <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageChange('en')}>
          EN
        </button>
        <button type="button" aria-pressed={language === 'zh'} onClick={() => onLanguageChange('zh')}>
          中
        </button>
      </div>
    </div>
  );
}
