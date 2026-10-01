import { useEffect, useRef, useState } from 'react';
import type { Language } from '../data';
import { COPY } from '../copy';
import './PhotoPrint.css';

export function formatPrintDate(date: Date): string {
  return `'${String(date.getFullYear()).slice(-2)} ${date.getMonth() + 1} ${date.getDate()}`;
}

type PrintStatus = 'loading' | 'loaded' | 'failed';

interface PhotoPrintProps {
  language: Language;
  onClose: () => void;
  assetBase?: string;
}

export function PhotoPrint({ language, onClose, assetBase = './' }: PhotoPrintProps) {
  const copy = COPY[language];
  const [status, setStatus] = useState<PrintStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button') ?? []);
        if (items.length === 0) return;
        event.preventDefault();
        const at = items.indexOf(document.activeElement as HTMLElement);
        const step = event.shiftKey ? -1 : 1;
        items[(at + step + items.length) % items.length].focus();
        return;
      }
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const retry = () => {
    setStatus('loading');
    setAttempt((n) => n + 1);
    closeRef.current?.focus();
  };

  return (
    <div className="photo-print-overlay" ref={dialogRef} role="dialog" aria-modal="true" aria-label={copy.fullAlt}>
      <div className="photo-print-backdrop" onClick={onClose} />
      <figure className="photo-print">
        <span className="photo-print-tape photo-print-tape--l" />
        <span className="photo-print-tape photo-print-tape--r" />
        <div className="photo-print-photo">
          <img
            key={attempt}
            src={`${assetBase}profile-full-print.jpg`}
            alt={copy.fullAlt}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('failed')}
          />
          {status === 'loading' && (
            <div className="photo-print-developing">
              <span>{copy.developing}</span>
            </div>
          )}
          {status === 'failed' && (
            <div className="photo-print-failed">
              <span>{copy.photoFailed}</span>
              <button type="button" onClick={retry}>
                {copy.printAgain}
              </button>
            </div>
          )}
          {status === 'loaded' && <span className="photo-print-date">{formatPrintDate(new Date())}</span>}
        </div>
        <figcaption className="photo-print-caption">
          <b>FUBUKI_BB</b>
          <span>{copy.photoCaption}</span>
        </figcaption>
      </figure>
      <button
        type="button"
        className="photo-print-close"
        ref={closeRef}
        aria-label={copy.closePhoto}
        onClick={onClose}
      >
        ✕
      </button>
      <p className="photo-print-dismiss-hint">{copy.dismissHint}</p>
    </div>
  );
}
