import type { PointerEvent } from 'react';
import type { Language } from '../data';
import { ProfileContent } from './ProfileContent';
import './CenterScreen.css';

interface CenterScreenProps {
  active: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

function stopPropagation(event: PointerEvent<HTMLDivElement>) {
  event.stopPropagation();
}

export function CenterScreen({ active, language, onLanguageChange }: CenterScreenProps) {
  return (
    <div
      className="center-screen"
      inert={!active}
      hidden={!active}
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
    >
      <ProfileContent language={language} onLanguageChange={onLanguageChange} />
    </div>
  );
}
