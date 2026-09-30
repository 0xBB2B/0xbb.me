import type { Language } from '../data';
import { COPY } from '../copy';

interface LoadingShellProps {
  language?: Language;
  stage?: 'code' | 'scene';
  leaving?: boolean;
}

export function LoadingShell({ language = 'en', stage = 'code', leaving = false }: LoadingShellProps) {
  const copy = COPY[language];
  const statusText = stage === 'code' ? copy.loadingCode : copy.loadingScene;
  return (
    <div className={`loading-shell${leaving ? ' loading-shell--leaving' : ''}`} inert={leaving}>
      <div className="loading-shell-rain" aria-hidden="true" />
      <h1 className="loading-shell-name">FUBUKI_BB</h1>
      <p className="loading-shell-status" role="status" aria-live="polite">
        {statusText}
      </p>
      <div className="loading-shell-spinner" aria-hidden="true" />
      <a className="loading-shell-button" href="./profile/">
        {copy.readFirst}
      </a>
    </div>
  );
}
