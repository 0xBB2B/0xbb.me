import { useCallback, useEffect, useState } from 'react';
import { Hud, type GraphicsState } from './components/portfolio/Hud';
import { createInput } from './portfolio/input';
import { closeReader, openOverview, createSession } from './portfolio/state';

type Viewport = typeof import('./components/portfolio/WorldViewport')['WorldViewport'];

export default function App() {
  const [session] = useState(createSession);
  const [input] = useState(createInput);
  const [Viewport, setViewport] = useState<Viewport | null>(null);
  const [graphics, setGraphics] = useState<GraphicsState>('loading');

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
    if (session.reader !== 'overview') {
      closeReader(session);
      openOverview(session);
    }
  }, [graphics, input, session]);

  const ready = useCallback(() => setGraphics('ready'), []);
  const unavailable = useCallback(() => setGraphics('unavailable'), []);

  return <main className="town-page">
    {Viewport && graphics !== 'unavailable'
      ? <Viewport session={session} input={input} onReady={ready} onUnavailable={unavailable} />
      : <div className="world-placeholder" aria-hidden="true" />}
    <Hud session={session} input={input} graphics={graphics} />
  </main>;
}
