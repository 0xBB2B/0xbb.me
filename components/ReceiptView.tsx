import { useEffect, useRef, useState } from 'react';
import type { Language } from '../data';
import { COPY } from '../copy';
import type { View } from '../diorama/view-state';
import { LanguageToggle } from './LanguageToggle';
import { PhotoPrint } from './PhotoPrint';
import { Receipt } from './Receipt';
import './ReceiptView.css';

interface ReceiptViewProps {
  language: Language;
  view: View;
  failed: boolean;
  showBack: boolean;
  onBack: () => void;
  onLanguageChange: (language: Language) => void;
}

function BackButton({ language, onBack }: { language: Language; onBack: () => void }) {
  return (
    <button type="button" className="receipt-view-back" onClick={onBack}>
      {COPY[language].backToOverview}
    </button>
  );
}

export function ReceiptView({ language, view, failed, showBack, onBack, onLanguageChange }: ReceiptViewProps) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const hidden = view === 'diorama' || view === 'entering';

  useEffect(() => {
    if (view === 'story') layerRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, [view]);

  const closePhoto = () => {
    setPhotoOpen(false);
    avatarRef.current?.focus();
  };

  return (
    <div
      className={`receipt-view${view === 'exiting' ? ' receipt-view--leaving' : ''}`}
      hidden={hidden}
      inert={hidden || view === 'exiting'}
    >
      <div className="receipt-view-layer" ref={layerRef}>
        <div className="receipt-view-slot">
          {failed && <p className="receipt-view-alert">{COPY[language].sceneFailed}</p>}
          <Receipt ref={avatarRef} language={language} onAvatarClick={() => setPhotoOpen(true)} />
        </div>
      </div>
      {showBack && <BackButton language={language} onBack={onBack} />}
      <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
      {photoOpen && <PhotoPrint language={language} onClose={closePhoto} />}
    </div>
  );
}
