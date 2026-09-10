import { useEffect, useRef } from 'react';
import type { TownInput } from '../../portfolio/input';
import { mountWorld } from '../../portfolio/runtime';
import type { Session } from '../../portfolio/state';

export function WorldViewport({ session, input, onReady, onUnavailable }: {
  session: Session;
  input: TownInput;
  onReady: () => void;
  onUnavailable: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    try {
      let active = true;
      const world = mountWorld(container.current, session, input, onUnavailable);
      world.ready.then(() => { if (active) onReady(); }).catch(() => { if (active) onUnavailable(); });
      return () => { active = false; world.dispose(); };
    } catch {
      onUnavailable();
    }
  }, [session, input, onReady, onUnavailable]);
  return <div className="world-viewport" ref={container} />;
}
