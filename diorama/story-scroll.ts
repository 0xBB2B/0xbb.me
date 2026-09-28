export function storyLayout(viewportHeight: number): { sectionStarts: [number, number, number] } {
  return { sectionStarts: [0, viewportHeight, 2 * viewportHeight] };
}

export function scrollProgress(scrollY: number, viewportHeight: number): { index: number } {
  const { sectionStarts } = storyLayout(viewportHeight);
  const lastIndex = sectionStarts.length - 1;

  if (scrollY <= sectionStarts[0]) return { index: 0 };
  if (scrollY >= sectionStarts[lastIndex]) return { index: lastIndex };

  for (let i = 0; i < lastIndex; i++) {
    if (scrollY >= sectionStarts[i] && scrollY < sectionStarts[i + 1]) {
      const t = (scrollY - sectionStarts[i]) / (sectionStarts[i + 1] - sectionStarts[i]);
      return { index: t < 0.5 ? i : i + 1 };
    }
  }
  return { index: lastIndex };
}

export const PAGE_DURATION = 1;
export const PAGE_COOLDOWN = 0.5;

const LAST_SECTION_INDEX = 2;

export function createPager(opts: { durationMs: number; cooldownMs: number }): {
  input(direction: number, nowMs: number, currentIndex: number): number | null;
  rest(nowMs: number): void;
} {
  let busyUntil = -Infinity;
  return {
    rest(nowMs) {
      busyUntil = nowMs + opts.cooldownMs;
    },
    input(direction, nowMs, currentIndex) {
      if (nowMs < busyUntil) return null;

      const target = currentIndex + direction;
      if (target < 0 || target > LAST_SECTION_INDEX) return null;

      busyUntil = nowMs + opts.durationMs + opts.cooldownMs;
      return target;
    },
  };
}
