import { useEffect, useRef } from 'react';
import type { TownInput } from '../../portfolio/input';
import { mountWorld } from '../../portfolio/runtime';
import type { Session } from '../../portfolio/state';
import './WorldViewport.css';

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
      const world = mountWorld(container.current, session, input, onUnavailable);
      onReady();
      return () => { world.dispose(); };
    } catch {
      onUnavailable();
    }
  }, [session, input, onReady, onUnavailable]);
  return <div className="world-viewport" ref={container} />;
}
