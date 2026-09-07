import { useEffect, useRef } from 'react';
import type { Language } from '../../data';
import { greeterPages, UI_COPY } from '../../portfolio/copy';
import './Dialogue.css';

export function Dialogue({ open, language, page, onLanguage, onPage, onClose }: {
  open: boolean;
  language: Language;
  page: number;
  onLanguage: () => void;
  onPage: (page: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const text = UI_COPY[language];
  const pages = greeterPages(language);
  const current = pages[page];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={ref} className="npc-dialogue" aria-label={text.dialogueLabel}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}>
    <header className="dialogue-toolbar">
      <span className="eyebrow">{text.dialogueLabel}</span>
      <button className="language-button" aria-label={language === 'en' ? 'Language' : '语言'} onClick={onLanguage}>
        <span aria-hidden="true">◎</span> {language === 'en' ? 'EN / 中' : '中 / EN'}
      </button>
      <button onClick={onClose} aria-label={text.closeDialogue}>{text.closeDialogue} <span aria-hidden="true">×</span></button>
    </header>
    <section className="dialogue-content">
      <p className="dialogue-speaker">FUBUKI_BB · {language === 'en' ? 'GREETER' : '迎宾者'}</p>
      <h2>{current.title}</h2>
      <p>{current.body}</p>
    </section>
    <footer className="dialogue-pages">
      <button aria-label={text.previous} disabled={page === 0} onClick={() => onPage(page - 1)}>← {text.previous}</button>
      <span aria-current="page">{page + 1} / {pages.length}</span>
      <button aria-label={text.next} disabled={page === pages.length - 1} onClick={() => onPage(page + 1)}>{text.next} →</button>
    </footer>
  </dialog>;
}
