import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Language } from '../data';
import type { DioramaHandle } from '../diorama/world';
import type { Tier } from '../diorama/quality';
import type { View } from '../diorama/view-state';
import './SceneViewport.css';

export interface SceneViewportHandle {
  enterStory(): void;
  exitToDiorama(): void;
}

interface SceneViewportProps {
  language: Language;
  view: View;
  loading: boolean;
  onStageChange: () => void;
  onReady: () => void;
  onFailed: () => void;
  onEntering: () => void;
  onStoryEntered: () => void;
  onExiting: () => void;
  onExitDone: () => void;
  onQualityChange: (tier: Tier) => void;
}

export const SceneViewport = forwardRef<SceneViewportHandle, SceneViewportProps>(function SceneViewport(
  { language, view, loading, onStageChange, onReady, onFailed, onEntering, onStoryEntered, onExiting, onExitDone, onQualityChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<DioramaHandle | null>(null);
  const languageRef = useRef(language);
  languageRef.current = language;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      enterStory: () => handleRef.current?.enterStory(),
      exitToDiorama: () => handleRef.current?.exitToDiorama(),
    }),
    [],
  );

  useEffect(() => {
    let disposed = false;

    async function mount() {
      let world: typeof import('../diorama/world');
      try {
        world = await import('../diorama/world');
      } catch {
        if (!disposed) { setFailed(true); onFailed(); }
        return;
      }
      if (disposed) return;
      onStageChange();

      let handle: DioramaHandle;
      try {
        handle = await world.mountDiorama(containerRef.current!, { language });
      } catch {
        if (!disposed) { setFailed(true); onFailed(); }
        return;
      }
      if (disposed) { handle.dispose(); return; }

      handleRef.current = handle;
      handle.setLanguage(languageRef.current);
      handle.onViewChange((next) => {
        if (next === 'entering') onEntering();
        else if (next === 'story') onStoryEntered();
        else if (next === 'exiting') onExiting();
        else if (next === 'diorama') onExitDone();
      });
      handle.onQualityChange(onQualityChange);
      handle.onContextLost(() => {
        handle.dispose();
        handleRef.current = null;
        setFailed(true);
        onFailed();
      });

      setReady(true);
      onReady();
    }

    mount();
    return () => {
      disposed = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    handleRef.current?.setLanguage(language);
  }, [language]);

  return (
    <div
      id="scene"
      ref={containerRef}
      aria-busy={loading || !ready}
      className={`scene-viewport${ready ? ' scene-viewport--ready' : ''}${failed ? ' scene-viewport--hidden' : ''}`}
    />
  );
});
