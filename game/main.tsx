import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import { BeatSaberPlaceholder } from '../components/beat-saber/BeatSaberPlaceholder.tsx';
import { PROFILE } from '../constants';
import { useMediaQuery } from '../hooks/useMediaQuery';

// 桌面端才动态 import BeatSaberGame：three.js（约 600KB）在移动端永远不下载。
const BeatSaberGame = lazy(() => import('../components/beat-saber/BeatSaberGame.tsx'));

function GamePage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="hud-grid" />
      <div className="hud-scan" />

      <nav className="hud-nav relative z-10">
        <a href="../" className="whitespace-nowrap">
          ← <b>{PROFILE.name}</b>.SYS
        </a>
        <span className="whitespace-nowrap" style={{ color: 'var(--hud-fg)' }}>
          RHYTHM_BLADE<span className="hidden md:inline"> // DEPLOYED</span>
        </span>
        <span className="hidden md:inline">L [WASD] · R [IJKL]</span>
      </nav>

      <main className="relative z-10 flex flex-1 items-center px-4 py-6 md:px-7">
        <div className="hud-frame mx-auto w-full" style={{ maxWidth: 'calc((100vh - 140px) * 1.6)' }}>
          {isDesktop ? (
            <Suspense fallback={<BeatSaberPlaceholder />}>
              <BeatSaberGame />
            </Suspense>
          ) : (
            <BeatSaberPlaceholder />
          )}
        </div>
      </main>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GamePage />
  </React.StrictMode>
);
