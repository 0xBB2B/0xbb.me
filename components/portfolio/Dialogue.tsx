import { useEffect, useRef } from 'react';
import type { Language } from '../../data';
import { npcPages, npcSpeaker, UI_COPY } from '../../portfolio/copy';
import type { NpcId } from '../../portfolio/journey';
import './Dialogue.css';

export function Dialogue({ open, npc, language, page, onPage, onClose }: {
  open: boolean;
  npc: NpcId | null;
  language: Language;
  page: number;
  onPage: (page: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const text = UI_COPY[language];
  const dialogueNpc = npc ?? 'greeter';
  const pages = npcPages(dialogueNpc, language);
  const current = pages[Math.min(page, pages.length - 1)];

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
      <button onClick={onClose} aria-label={text.closeDialogue}>{text.closeDialogue} <span aria-hidden="true">×</span></button>
    </header>
    <section className="dialogue-content">
      <p className="dialogue-speaker">{npcSpeaker(dialogueNpc, language)}</p>
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
