import { useCallback, useEffect, useState } from 'react';
import { Hud, type GraphicsState } from './components/portfolio/Hud';
import { LoadingScreen, LOADING_EXIT_MS } from './components/portfolio/LoadingScreen';
import './components/portfolio/WorldViewport.css';
import { createInput } from './portfolio/input';
import { cancelAppearanceChange, cancelDoorOpening, cancelNpcReaction, closeReader, openOverview, createSession } from './portfolio/state';

type Viewport = typeof import('./components/portfolio/WorldViewport')['WorldViewport'];

export default function App() {
  const [session] = useState(createSession);
  const [input] = useState(createInput);
  const [Viewport, setViewport] = useState<Viewport | null>(null);
  const [graphics, setGraphics] = useState<GraphicsState>('loading');
  const [loadingVisible, setLoadingVisible] = useState(true);

  useEffect(() => {
    let active = true;
    import('./components/portfolio/WorldViewport').then(module => {
      if (active) setViewport(() => module.WorldViewport);
    }).catch(() => {
      if (active) setGraphics('unavailable');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (graphics !== 'unavailable') return;
    input.pause(true);
    cancelDoorOpening(session);
    cancelAppearanceChange(session);
    cancelNpcReaction(session);
    if (session.reader !== 'overview') {
      closeReader(session);
      openOverview(session);
    }
  }, [graphics, input, session]);

  useEffect(() => {
    if (!loadingVisible || graphics === 'loading') return;
    if (graphics === 'unavailable') {
      setLoadingVisible(false);
      return;
    }
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : LOADING_EXIT_MS;
    const timer = window.setTimeout(() => setLoadingVisible(false), delay);
    return () => window.clearTimeout(timer);
  }, [graphics, loadingVisible]);

  const ready = useCallback(() => setGraphics(current => current === 'loading' ? 'ready' : current), []);
  const unavailable = useCallback(() => setGraphics('unavailable'), []);
  const readWhileLoading = () => {
    input.pause(true);
    openOverview(session);
    setLoadingVisible(false);
  };
  const showLoading = loadingVisible && graphics !== 'unavailable';

  return <main className="town-page">
    {Viewport && graphics !== 'unavailable'
      ? <Viewport session={session} input={input} onReady={ready} onUnavailable={unavailable} />
      : <div className="world-placeholder" aria-hidden="true" />}
    <div className="town-interface" inert={showLoading} aria-hidden={showLoading || undefined} aria-busy={showLoading}>
      <Hud session={session} input={input} graphics={showLoading ? 'loading' : graphics} />
    </div>
    {showLoading && <LoadingScreen phase={Viewport ? 'world' : 'code'} language={session.language}
      leaving={graphics === 'ready'} onOverview={readWhileLoading} />}
  </main>;
}
