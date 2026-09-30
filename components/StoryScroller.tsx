import { useEffect, useRef, useState } from 'react';
import type { Language } from '../data';
import type { View } from '../diorama/view-state';
import { storyLayout, scrollProgress, createPager, PAGE_DURATION, PAGE_COOLDOWN } from '../diorama/story-scroll';
import { StorySections } from './StorySections';

interface StoryScrollerProps {
  language: Language;
  view: View;
  failed: boolean;
  showBack: boolean;
  onScrollChange: (scrollY: number) => void;
  onBack: () => void;
  onLanguageChange: (language: Language) => void;
}

const SWIPE_THRESHOLD = 40;

function isButtonTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.tagName === 'BUTTON';
}

export function StoryScroller({ language, view, failed, showBack, onScrollChange, onBack, onLanguageChange }: StoryScrollerProps) {
  const active = view === 'story';
  const [currentIndex, setCurrentIndex] = useState<0 | 1 | 2>(0);
  const sectionsRef = useRef<(HTMLElement | null)[]>([null, null, null]);
  const pagerRef = useRef(createPager({ durationMs: PAGE_DURATION * 1000, cooldownMs: PAGE_COOLDOWN * 1000 }));
  const indexRef = useRef<0 | 1 | 2>(0);
  const animRef = useRef<number | null>(null);
  const onScrollChangeRef = useRef(onScrollChange);
  onScrollChangeRef.current = onScrollChange;
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (view === 'story') {
      const start = storyLayout(window.innerHeight).sectionStarts[0];
      window.scrollTo(0, start);
      indexRef.current = 0;
      setCurrentIndex(0);
      onScrollChangeRef.current(start);
      sectionsRef.current[0]?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      pagerRef.current.rest(performance.now());
      return;
    }
    if (view === 'exiting') return;
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY;
      onScrollChangeRef.current(scrollY);
      const progress = scrollProgress(scrollY, window.innerHeight);
      setCurrentIndex(progress.index as 0 | 1 | 2);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function setStoryVh() {
      document.documentElement.style.setProperty('--story-vh', `${window.innerHeight}px`);
    }
    setStoryVh();

    function handleResize() {
      setStoryVh();
      if (viewRef.current === 'story' && animRef.current === null) {
        const start = storyLayout(window.innerHeight).sectionStarts[indexRef.current];
        window.scrollTo(0, start);
        onScrollChangeRef.current(start);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleFocusIn(event: FocusEvent) {
      if (viewRef.current !== 'story') return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const sectionIndex = sectionsRef.current.findIndex((section) => section?.contains(target));
      if (sectionIndex === -1 || sectionIndex === indexRef.current) return;
      indexRef.current = sectionIndex as 0 | 1 | 2;
      setCurrentIndex(sectionIndex as 0 | 1 | 2);
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      requestAnimationFrame(() => {
        const start = storyLayout(window.innerHeight).sectionStarts[sectionIndex];
        window.scrollTo(0, start);
        onScrollChangeRef.current(start);
      });
    }
    window.addEventListener('focusin', handleFocusIn);
    return () => window.removeEventListener('focusin', handleFocusIn);
  }, []);

  useEffect(() => {
    function animateTo(targetIndex: 0 | 1 | 2) {
      const from = window.scrollY;
      const duration = PAGE_DURATION * 1000;
      const startedAt = performance.now();
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      indexRef.current = targetIndex;

      function step(now: number) {
        const to = storyLayout(window.innerHeight).sectionStarts[targetIndex];
        const t = Math.min(1, (now - startedAt) / duration);
        const eased = t * t * (3 - 2 * t);
        window.scrollTo(0, from + (to - from) * eased);
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          animRef.current = null;
        }
      }
      animRef.current = requestAnimationFrame(step);
    }

    function tryPage(direction: 1 | -1) {
      if (viewRef.current !== 'story') return;
      const target = pagerRef.current.input(direction, performance.now(), indexRef.current);
      if (target === null) return;
      animateTo(target as 0 | 1 | 2);
    }

    function handleWheel(event: WheelEvent) {
      if (viewRef.current !== 'story') return;
      if (event.ctrlKey || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      tryPage(event.deltaY > 0 ? 1 : -1);
    }

    let touchStartY: number | null = null;
    function handleTouchStart(event: TouchEvent) {
      touchStartY = event.touches.length > 1 ? null : (event.touches[0]?.clientY ?? null);
    }
    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length > 1) {
        touchStartY = null;
        return;
      }
      if (viewRef.current === 'story') event.preventDefault();
    }
    function handleTouchEnd(event: TouchEvent) {
      if (touchStartY === null) return;
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const delta = touchStartY - endY;
      touchStartY = null;
      if (Math.abs(delta) > SWIPE_THRESHOLD) tryPage(delta > 0 ? 1 : -1);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (viewRef.current !== 'story') return;
      if (event.key === ' ' && isButtonTarget(event.target)) return;
      if (event.key === 'PageDown' || event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault();
        tryPage(1);
      } else if (event.key === 'PageUp' || event.key === 'ArrowUp') {
        event.preventDefault();
        tryPage(-1);
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <StorySections
      language={language}
      active={active}
      currentIndex={currentIndex}
      failed={failed}
      leaving={view === 'exiting'}
      showBack={showBack}
      onBack={onBack}
      onLanguageChange={onLanguageChange}
      sectionRef={(index, element) => {
        sectionsRef.current[index] = element;
      }}
    />
  );
}
