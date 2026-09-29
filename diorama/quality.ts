export type Tier = 'high' | 'low';

export function initialTier(coarsePointer: boolean, viewportWidth: number): Tier {
  return coarsePointer || viewportWidth < 768 ? 'low' : 'high';
}

export function percentile95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[index];
}

export interface TierSettings {
  reflection: { scale: number; shared: boolean };
  rainRatio: number;
  maxPixelRatio: number;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high: { reflection: { scale: 0.5, shared: false }, rainRatio: 1, maxPixelRatio: 2 },
  low: { reflection: { scale: 0.25, shared: true }, rainRatio: 0.5, maxPixelRatio: 1 },
};

const WINDOW_MS = 5000;
const DOWNGRADE_THRESHOLD_MS = 33.4;

export interface FrameMonitor {
  sample(timestampMs: number, visible: boolean): void;
}

export function createFrameMonitor(onDowngrade: () => void): FrameMonitor {
  let lastTimestamp: number | undefined;
  let lastVisible = false;
  let downgraded = false;
  const intervals: { t: number; value: number }[] = [];

  return {
    sample(timestampMs: number, visible: boolean): void {
      if (!visible) intervals.length = 0;
      const gap = lastTimestamp === undefined ? 0 : timestampMs - lastTimestamp;
      if (gap >= WINDOW_MS) intervals.length = 0;
      if (visible && lastVisible && lastTimestamp !== undefined && gap < WINDOW_MS) {
        const value = Math.round(gap * 100) / 100;
        intervals.push({ t: timestampMs, value });
        while (intervals.length > 0 && intervals[0].t < timestampMs - WINDOW_MS) {
          intervals.shift();
        }
        if (!downgraded) {
          const windowStart = intervals[0].t - intervals[0].value;
          if (timestampMs - windowStart >= WINDOW_MS && percentile95(intervals.map((i) => i.value)) > DOWNGRADE_THRESHOLD_MS) {
            downgraded = true;
            onDowngrade();
          }
        }
      }
      lastTimestamp = timestampMs;
      lastVisible = visible;
    },
  };
}
