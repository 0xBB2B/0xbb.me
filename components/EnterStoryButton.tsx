import { useEffect, useRef } from 'react';
import type { Language } from '../data';
import { COPY } from '../copy';
import './EnterStoryButton.css';

interface EnterStoryButtonProps {
  language: Language;
  enabled: boolean;
  onActivate: () => void;
}

export function EnterStoryButton({ language, enabled, onActivate }: EnterStoryButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enabled && document.activeElement === buttonRef.current) buttonRef.current?.blur();
  }, [enabled]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="enter-story-button"
      tabIndex={enabled ? 0 : -1}
      onClick={onActivate}
    >
      {COPY[language].viewProfile}
    </button>
  );
}
