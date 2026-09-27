export function storyLayout(viewportHeight: number): { pullBack: number; sectionStarts: [number, number, number] } {
  const pullBack = viewportHeight / 2;
  return {
    pullBack,
    sectionStarts: [pullBack, pullBack + viewportHeight, pullBack + 2 * viewportHeight],
  };
}

export function snapTarget(scrollY: number, viewportHeight: number): number {
  const { pullBack, sectionStarts } = storyLayout(viewportHeight);
  const lastIndex = sectionStarts.length - 1;

  if (scrollY <= 0) return 0;
  if (scrollY < pullBack) return sectionStarts[0];
  if (scrollY >= sectionStarts[lastIndex]) return sectionStarts[lastIndex];

  for (let i = 0; i < lastIndex; i++) {
    if (scrollY >= sectionStarts[i] && scrollY < sectionStarts[i + 1]) {
      const mid = (sectionStarts[i] + sectionStarts[i + 1]) / 2;
      return scrollY < mid ? sectionStarts[i] : sectionStarts[i + 1];
    }
  }
  return sectionStarts[lastIndex];
}

export function scrollProgress(scrollY: number, viewportHeight: number): { opacity: number; index: number } {
  const { pullBack, sectionStarts } = storyLayout(viewportHeight);
  const lastIndex = sectionStarts.length - 1;

  if (scrollY <= 0) return { opacity: 0, index: 0 };
  if (scrollY < pullBack) return { opacity: scrollY / pullBack, index: 0 };
  if (scrollY >= sectionStarts[lastIndex]) return { opacity: 1, index: lastIndex };

  for (let i = 0; i < lastIndex; i++) {
    if (scrollY >= sectionStarts[i] && scrollY < sectionStarts[i + 1]) {
      const t = (scrollY - sectionStarts[i]) / (sectionStarts[i + 1] - sectionStarts[i]);
      return { opacity: 1, index: t < 0.5 ? i : i + 1 };
    }
  }
  return { opacity: 1, index: lastIndex };
}
