import type { Language } from './data';

export function detectLanguage(browserLanguage: string | undefined): Language {
  return browserLanguage?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function htmlLang(language: Language): string {
  return language === 'zh' ? 'zh-CN' : 'en';
}

export function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = htmlLang(language);
}
