import type { Language } from '../data';
import { COPY } from '../copy';
import './LanguageToggle.css';

export function LanguageToggle({
  language,
  onLanguageChange,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  return (
    <div className="language-toggle" aria-label={COPY[language].languageLabel}>
      <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageChange('en')}>
        EN
      </button>
      <button type="button" aria-pressed={language === 'zh'} onClick={() => onLanguageChange('zh')}>
        中
      </button>
    </div>
  );
}
