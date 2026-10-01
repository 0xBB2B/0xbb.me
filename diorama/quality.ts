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
  reflections: boolean;
  rainRatio: number;
  maxPixelRatio: number;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high: { reflections: true, rainRatio: 1, maxPixelRatio: 2 },
  low: { reflections: false, rainRatio: 0.5, maxPixelRatio: 1 },
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

const PACER_SAMPLE_COUNT = 30;
const PACER_MAX_GAP_MS = 100;

export interface FramePacer {
  shouldDraw(timestampMs: number): boolean;
}

export function createFramePacer(maxFps = 60): FramePacer {
  let lastTimestamp: number | undefined;
  let count = 0;
  const gaps: number[] = [];

  return {
    shouldDraw(timestampMs: number): boolean {
      if (lastTimestamp !== undefined) {
        const gap = timestampMs - lastTimestamp;
        if (gap <= PACER_MAX_GAP_MS) {
          gaps.push(gap);
          if (gaps.length > PACER_SAMPLE_COUNT) gaps.shift();
        }
      }
      lastTimestamp = timestampMs;
      let n = 1;
      if (gaps.length > 0) {
        const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        // 减 0.1 是容差：浏览器时间戳可能只精确到 1 毫秒，120Hz 的 8.33 毫秒会被报成 8 或 9，不留容差会把 N 算大
        n = Math.max(1, Math.ceil(1000 / mean / maxFps - 0.1));
      }
      return count++ % n === 0;
    },
  };
}
