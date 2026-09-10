import { useEffect, useRef } from 'react';
import type { Language } from '../../data';
import { boardById, type BoardId } from '../../portfolio/journey';
import { UI_COPY } from '../../portfolio/copy';
import './BoardDetails.css';

export function BoardDetails({ open, boardId, language, onClose }: {
  open: boolean;
  boardId: BoardId | null;
  language: Language;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const text = UI_COPY[language];
  const board = boardId ? boardById(boardId) : null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={ref} className="board-details" aria-label={text.boardLabel}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}>
    <header className="board-details-toolbar">
      <span className="eyebrow">{text.boardLabel}</span>
      <button onClick={onClose} aria-label={text.closeBoard}>{text.closeBoard} <span aria-hidden="true">×</span></button>
    </header>
    {board && <section className="board-details-content" data-board-id={board.id}>
      <p className="board-kind">{board.kind === 'skill' ? text.skills : text.projects}</p>
      <h2>{board.title[language]}</h2>
      {board.status && <p className="board-status">{board.status}</p>}
      <p>{board.detail[language]}</p>
      {board.kind === 'project' && <nav aria-label={language === 'en' ? 'Project links' : '项目链接'}>
        <a href={board.link} target="_blank" rel="noopener noreferrer">{text.visit} {board.title[language]} ↗</a>
        <a href={board.repo} target="_blank" rel="noopener noreferrer">{text.source} {board.title[language]} ↗</a>
      </nav>}
    </section>}
  </dialog>;
}
