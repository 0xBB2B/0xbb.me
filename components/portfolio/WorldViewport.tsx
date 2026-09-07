import { useEffect, useRef } from 'react';
import type { TownInput } from '../../portfolio/input';
import { mountWorld } from '../../portfolio/runtime';
import type { Session } from '../../portfolio/state';
import './WorldViewport.css';

export function WorldViewport({ session, input }: {
  session: Session; input: TownInput;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const world = mountWorld(container.current, session, input);
    return () => {
      world.dispose();
    };
  }, [session, input]);
  return <div className="world-viewport" ref={container} />;
}
