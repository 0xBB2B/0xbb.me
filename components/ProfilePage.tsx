import { useEffect, useRef, useState } from 'react';
import type { Language } from '../data';
import { COPY } from '../copy';
import { applyDocumentLanguage, detectLanguage } from '../language';
import { LanguageToggle } from './LanguageToggle';
import { PhotoPrint } from './PhotoPrint';
import { Receipt } from './Receipt';
import './ProfilePage.css';

export function ProfilePage() {
  const [language, setLanguage] = useState<Language>('en');
  // 开关依赖脚本，预渲染页不显示
  const [hydrated, setHydrated] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setLanguage(detectLanguage(navigator.language));
    setHydrated(true);
  }, []);

  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  const closePhoto = () => {
    setPhotoOpen(false);
    avatarRef.current?.focus();
  };

  return (
    <div className="profile-page">
      <div className="profile-page-rain-clip" aria-hidden="true">
        <div className="profile-page-rain" />
      </div>
      <a className="profile-page-back" href="../">
        {COPY[language].seeScene}
      </a>
      {hydrated && <LanguageToggle language={language} onLanguageChange={setLanguage} />}
      <main className="profile-page-main">
        <Receipt ref={avatarRef} language={language} onAvatarClick={() => setPhotoOpen(true)} assetBase="../" />
      </main>
      {photoOpen && <PhotoPrint language={language} onClose={closePhoto} assetBase="../" />}
    </div>
  );
}
