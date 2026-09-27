import { useEffect, useRef, useState } from 'react';
import type { Language } from '../data';
import type { View } from '../diorama/view-state';
import { storyLayout, snapTarget, scrollProgress } from '../diorama/story-scroll';
import { StorySections } from './StorySections';
import './StoryScroller.css';

interface StoryScrollerProps {
  language: Language;
  view: View;
  failed: boolean;
  onScrollChange: (scrollY: number) => void;
  onReachTop: () => void;
  onLanguageChange: (language: Language) => void;
}

export function StoryScroller({ language, view, failed, onScrollChange, onReachTop, onLanguageChange }: StoryScrollerProps) {
  const active = view === 'story';
  const [opacity, setOpacity] = useState(0);
  const [currentIndex, setCurrentIndex] = useState<0 | 1 | 2>(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const sectionsRef = useRef<(HTMLElement | null)[]>([null, null, null]);
  const callbacks = useRef({ onScrollChange, onReachTop });
  callbacks.current = { onScrollChange, onReachTop };

  useEffect(() => {
    function updateViewportHeight() {
      document.documentElement.style.setProperty('--story-vh', `${window.innerHeight}px`);
      setViewportHeight(window.innerHeight);
    }
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    return () => window.removeEventListener('resize', updateViewportHeight);
  }, []);

  useEffect(() => {
    if (view !== 'story') {
      document.documentElement.style.overflow = 'hidden';
      window.scrollTo(0, 0);
      return;
    }
    document.documentElement.style.overflow = '';
    window.scrollTo(0, storyLayout(window.innerHeight).sectionStarts[0]);
    sectionsRef.current[0]?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, [view]);

  useEffect(() => {
    let snapTimer: number | undefined;
    function handleScroll() {
      const scrollY = window.scrollY;
      callbacks.current.onScrollChange(scrollY);
      const progress = scrollProgress(scrollY, window.innerHeight);
      setOpacity(progress.opacity);
      setCurrentIndex(progress.index as 0 | 1 | 2);
      if (scrollY === 0) callbacks.current.onReachTop();

      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        const target = snapTarget(window.scrollY, window.innerHeight);
        if (target !== window.scrollY) window.scrollTo({ top: target, behavior: 'smooth' });
      }, 150);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearTimeout(snapTimer);
    };
  }, []);

  const pullBack = storyLayout(viewportHeight).pullBack;

  return (
    <>
      <div className="story-pullback" style={{ height: pullBack }} />
      <StorySections
        language={language}
        active={active}
        currentIndex={currentIndex}
        failed={failed}
        opacity={opacity}
        onLanguageChange={onLanguageChange}
        sectionRef={(index, element) => {
          sectionsRef.current[index] = element;
        }}
      />
    </>
  );
}
