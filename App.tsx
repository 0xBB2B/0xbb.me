import { useEffect, useRef, useState } from 'react';
import type { Language } from './data';
import { detectLanguage, applyDocumentLanguage } from './language';
import { transition, type ViewState, type ViewEvent } from './diorama/view-state';
import { initialTier, type Tier } from './diorama/quality';
import { LoadingShell } from './components/LoadingShell';
import { SceneViewport, type SceneViewportHandle } from './components/SceneViewport';
import { StoryScroller } from './components/StoryScroller';
import { EnterStoryButton } from './components/EnterStoryButton';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => detectLanguage(navigator.language));
  const [viewState, setViewState] = useState<ViewState>({ view: 'diorama', ready: false, failed: false });
  const [stage, setStage] = useState<'code' | 'scene'>('code');
  const [quality, setQuality] = useState<Tier>(() => initialTier(matchMedia('(pointer: coarse)').matches, innerWidth));
  const [loadingVisible, setLoadingVisible] = useState(true);
  const [loadingLeaving, setLoadingLeaving] = useState(false);
  const sceneRef = useRef<SceneViewportHandle>(null);

  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.quality = quality;
  }, [quality]);

  useEffect(() => {
    document.documentElement.dataset.view = viewState.view;
  }, [viewState.view]);

  useEffect(() => {
    if (viewState.ready && loadingVisible) setLoadingLeaving(true);
  }, [viewState.ready, loadingVisible]);

  useEffect(() => {
    if (!loadingLeaving) return;
    const timer = setTimeout(() => setLoadingVisible(false), 450);
    return () => clearTimeout(timer);
  }, [loadingLeaving]);

  const showBack = (viewState.view === 'story' || viewState.view === 'exiting') && viewState.ready && !viewState.failed;
  const canExitRef = useRef(false);
  canExitRef.current = viewState.view === 'story' && viewState.ready && !viewState.failed;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !canExitRef.current) return;
      sceneRef.current?.exitToDiorama();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function dispatch(event: ViewEvent) {
    setViewState((prev) => transition(prev, event));
  }

  function handleSceneFailed() {
    setLoadingVisible(false);
    dispatch('sceneFailed');
  }

  function handleExit() {
    if (!canExitRef.current) return;
    sceneRef.current?.exitToDiorama();
  }

  return (
    <>
      <SceneViewport
        ref={sceneRef}
        language={language}
        view={viewState.view}
        loading={loadingVisible}
        onStageChange={() => setStage('scene')}
        onReady={() => dispatch('sceneReady')}
        onFailed={handleSceneFailed}
        onEntering={() => dispatch('clickPlaque')}
        onStoryEntered={() => dispatch('enterDone')}
        onExiting={() => dispatch('exit')}
        onExitDone={() => dispatch('exitDone')}
        onQualityChange={setQuality}
      />
      <StoryScroller
        language={language}
        view={viewState.view}
        failed={viewState.failed}
        showBack={showBack}
        onScrollChange={(scrollY) => sceneRef.current?.setScroll(scrollY)}
        onBack={handleExit}
        onLanguageChange={setLanguage}
      />
      <EnterStoryButton
        language={language}
        enabled={viewState.view === 'diorama' && viewState.ready}
        onActivate={() => sceneRef.current?.enterStory()}
      />
      {loadingVisible && (
        <LoadingShell language={language} stage={stage} leaving={loadingLeaving} />
      )}
    </>
  );
}
