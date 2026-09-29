import { expect, test, describe } from 'bun:test';
import { initialTier, percentile95, createFrameMonitor, TIER_SETTINGS } from '../diorama/quality';

function feedFrames(
  sample: (timestampMs: number, visible: boolean) => void,
  options: { startMs: number; intervalMs: number; durationMs: number; visible: boolean },
): number {
  const { startMs, intervalMs, durationMs, visible } = options;
  let t = startMs;
  const end = startMs + durationMs;
  while (t <= end) {
    sample(t, visible);
    t += intervalMs;
  }
  return t;
}

describe('initialTier', () => {
  test('coarse pointer forces low tier regardless of viewport width', () => {
    expect(initialTier(true, 1440)).toBe('low');
  });

  test('narrow viewport (<768) forces low tier even with a fine pointer', () => {
    expect(initialTier(false, 767)).toBe('low');
  });

  test('fine pointer with wide viewport resolves to high tier', () => {
    expect(initialTier(false, 1440)).toBe('high');
  });

  test('768px boundary counts as wide, resolving to high tier', () => {
    expect(initialTier(false, 768)).toBe('high');
  });
});

describe('percentile95', () => {
  test('96 low + 4 high samples: 95th percentile lands on the low value', () => {
    const intervals = [...Array(96).fill(16), ...Array(4).fill(60)];
    expect(percentile95(intervals)).toBe(16);
  });

  test('94 low + 6 high samples: 95th percentile lands on the high value', () => {
    const intervals = [...Array(94).fill(16), ...Array(6).fill(60)];
    expect(percentile95(intervals)).toBe(60);
  });
});

describe('TIER_SETTINGS', () => {
  test('high tier: full rain ratio, pixel ratio cap 2, no reflection field', () => {
    expect(TIER_SETTINGS.high).toEqual({ rainRatio: 1, maxPixelRatio: 2 });
  });

  test('low tier: halved rain, pixel ratio cap 1, no reflection field', () => {
    expect(TIER_SETTINGS.low).toEqual({ rainRatio: 0.5, maxPixelRatio: 1 });
  });
});

describe('createFrameMonitor', () => {
  test('sustained 48ms frames for over 5s trigger exactly one downgrade', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => {
      calls += 1;
    });
    feedFrames(monitor.sample, { startMs: 0, intervalMs: 48, durationMs: 5200, visible: true });
    expect(calls).toBe(1);
  });

  test('downgrade never fires a second time on later mixed-speed frames', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => {
      calls += 1;
    });
    const afterFirstWindow = feedFrames(monitor.sample, {
      startMs: 0,
      intervalMs: 48,
      durationMs: 5200,
      visible: true,
    });
    expect(calls).toBe(1);

    let t = afterFirstWindow;
    const end = afterFirstWindow + 10000;
    let i = 0;
    while (t <= end) {
      t += i % 2 === 0 ? 16.7 : 48;
      monitor.sample(t, true);
      i += 1;
    }
    expect(calls).toBe(1);
  });

  test('steady 16.7ms frames for 10s never trigger a downgrade', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => {
      calls += 1;
    });
    feedFrames(monitor.sample, { startMs: 0, intervalMs: 16.7, durationMs: 10000, visible: true });
    expect(calls).toBe(0);
  });

  test('slow frames while the page is hidden are not counted', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => {
      calls += 1;
    });
    const afterHidden = feedFrames(monitor.sample, {
      startMs: 0,
      intervalMs: 100,
      durationMs: 6000,
      visible: false,
    });
    feedFrames(monitor.sample, { startMs: afterHidden, intervalMs: 16.7, durationMs: 10000, visible: true });
    expect(calls).toBe(0);
  });

  test('interval exactly at the 33.4ms threshold does not downgrade', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => {
      calls += 1;
    });
    feedFrames(monitor.sample, { startMs: 0, intervalMs: 33.4, durationMs: 6000, visible: true });
    expect(calls).toBe(0);
  });

  test('interval just above the threshold (33.5ms) downgrades exactly once', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => {
      calls += 1;
    });
    feedFrames(monitor.sample, { startMs: 0, intervalMs: 33.5, durationMs: 6000, visible: true });
    expect(calls).toBe(1);
  });
});

describe('createFrameMonitor windowing and page visibility', () => {
  test('a long pause between two visible frames (rAF suspended while hidden) does not downgrade', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => { calls += 1; });
    const t = feedFrames(monitor.sample, { startMs: 0, intervalMs: 16.7, durationMs: 3000, visible: true });
    feedFrames(monitor.sample, { startMs: t + 30000, intervalMs: 16.7, durationMs: 6000, visible: true });
    expect(calls).toBe(0);
  });

  test('the window slides: slow frames after a long smooth period still downgrade', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => { calls += 1; });
    const t = feedFrames(monitor.sample, { startMs: 0, intervalMs: 16.7, durationMs: 60000, visible: true });
    feedFrames(monitor.sample, { startMs: t, intervalMs: 48, durationMs: 5200, visible: true });
    expect(calls).toBe(1);
  });

  test('a short burst of slow frames does not downgrade', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => { calls += 1; });
    let t = feedFrames(monitor.sample, { startMs: 0, intervalMs: 16.7, durationMs: 3000, visible: true });
    t = feedFrames(monitor.sample, { startMs: t, intervalMs: 48, durationMs: 300, visible: true });
    feedFrames(monitor.sample, { startMs: t, intervalMs: 16.7, durationMs: 10000, visible: true });
    expect(calls).toBe(0);
  });

  test('slow frames before a brief hide are discarded', () => {
    let calls = 0;
    const monitor = createFrameMonitor(() => { calls += 1; });
    let t = feedFrames(monitor.sample, { startMs: 0, intervalMs: 48, durationMs: 3000, visible: true });
    t = feedFrames(monitor.sample, { startMs: t, intervalMs: 100, durationMs: 2000, visible: false });
    feedFrames(monitor.sample, { startMs: t, intervalMs: 48, durationMs: 600, visible: true });
    expect(calls).toBe(0);
  });
});
