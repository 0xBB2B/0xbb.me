import { describe, test, expect } from 'bun:test';
import { createDemoChart, createOnsetChart } from './chart';

/**
 * mulberry32 是一个体积极小的可种子化 RNG，用来让谱面测试稳定可复现。
 *
 * 算法源自 Tommy Ettinger 的 mulberry32：单一 32 位状态、周期 2^32、
 * 通过 BigCrush 简单测试，足够支撑测试场景里"伪随机但每次跑一致"的需求。
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('createDemoChart', () => {
  test('谱面包含足够多的方块（>40）', () => {
    const chart = createDemoChart(mulberry32(1));
    expect(chart.notes.length).toBeGreaterThan(40);
  });

  test('方块按时间升序排列', () => {
    const { notes } = createDemoChart(mulberry32(2));
    for (let i = 1; i < notes.length; i += 1) {
      expect(notes[i].time).toBeGreaterThan(notes[i - 1].time);
    }
  });

  test('方块时间不超过曲目总时长', () => {
    const chart = createDemoChart(mulberry32(3));
    const last = chart.notes[chart.notes.length - 1];
    expect(last.time).toBeLessThan(chart.durationMs);
  });

  test('谱面包含左右手两种方块', () => {
    const { notes } = createDemoChart(mulberry32(4));
    const hands = new Set(notes.map((n) => n.hand));
    expect(hands.has('L')).toBe(true);
    expect(hands.has('R')).toBe(true);
  });

  test('谱面覆盖 4 个轨道', () => {
    const { notes } = createDemoChart(mulberry32(5));
    const lanes = new Set(notes.map((n) => n.lane));
    expect(lanes.size).toBe(4);
  });

  test('approachMs 留出充足的提前预览时间', () => {
    const chart = createDemoChart(mulberry32(6));
    expect(chart.approachMs).toBeGreaterThanOrEqual(800);
  });

  test('首方块 spawn 时刻 ≥ 0：introSteps 必须够装下 approachMs', () => {
    // 不变量：方块只能在 BGM 起播 (t=0) 之后 spawn，所以
    // notes[0].time − approachMs 必须 ≥ 0；否则方块到判定线时距离不足。
    const chart = createDemoChart(mulberry32(9));
    const firstSpawnMs = chart.notes[0].time - chart.approachMs;
    expect(firstSpawnMs).toBeGreaterThanOrEqual(0);
  });

  test('谱面覆盖左右两手各 4 个方向，洗牌袋确保 W/A/S/D 与 I/J/K/L 都用得上', () => {
    const { notes } = createDemoChart(mulberry32(7));
    const combos = new Set(notes.map((n) => `${n.hand}-${n.cut}`));
    const required = ['L-U', 'L-D', 'L-L', 'L-R', 'R-U', 'R-D', 'R-L', 'R-R'];
    required.forEach((c) => {
      expect(combos.has(c)).toBe(true);
    });
  });

  test('左手方块只在左侧 lane 0/1，右手方块只在右侧 lane 2/3', () => {
    const { notes } = createDemoChart(mulberry32(8));
    notes.forEach((n) => {
      if (n.hand === 'L') {
        expect([0, 1]).toContain(n.lane);
      } else {
        expect([2, 3]).toContain(n.lane);
      }
    });
  });

  test('不同种子产出的方块序列不同（验证随机化生效）', () => {
    const a = createDemoChart(mulberry32(100));
    const b = createDemoChart(mulberry32(200));
    const sigA = a.notes.map((n) => `${n.hand}${n.cut}${n.lane}`).join('|');
    const sigB = b.notes.map((n) => `${n.hand}${n.cut}${n.lane}`).join('|');
    expect(sigA).not.toBe(sigB);
  });

  test('相邻方块的 lane 必须不同：避免后块沿同轨遮挡前块导致玩家来不及反应', () => {
    // 多种子各跑一遍，确保不变量在不同 RNG 路径下都成立。
    [1, 2, 3, 7, 42, 100, 200].forEach((seed) => {
      const { notes } = createDemoChart(mulberry32(seed));
      for (let i = 1; i < notes.length; i += 1) {
        expect(notes[i].lane).not.toBe(notes[i - 1].lane);
      }
    });
  });
});

describe('createOnsetChart', () => {
  // 合成一组节奏点：每 300ms 一个，从 2000ms 开始（2000/2300/.../11900）
  const buildOnsets = (count: number, startMs = 2000, gapMs = 300): number[] => {
    const out: number[] = [];
    for (let i = 0; i < count; i += 1) {
      out.push(startMs + i * gapMs);
    }
    return out;
  };

  test('方块时间严格等于过滤后的 onset 时间', () => {
    const onsets = buildOnsets(20);
    const chart = createOnsetChart(onsets, 15_000, mulberry32(1));
    expect(chart.notes.length).toBe(onsets.length);
    chart.notes.forEach((note, idx) => {
      expect(note.time).toBe(onsets[idx]);
    });
  });

  test('丢弃 spawn 时刻 < 0 的早期 onset（time < approachMs）', () => {
    // 加入若干早于 approachMs 的 onset，应该被过滤
    const earlyOnsets = [200, 500, 1000, 1500];
    const validOnsets = buildOnsets(15, 2000);
    const all = [...earlyOnsets, ...validOnsets];
    const chart = createOnsetChart(all, 10_000, mulberry32(2));
    chart.notes.forEach((note) => {
      expect(note.time - chart.approachMs).toBeGreaterThanOrEqual(0);
    });
  });

  test('强制最小间距，过密 onset 抽稀', () => {
    // 50ms 间距过密，应被抽到至少 minGapMs (默认 250ms) 间距
    const dense: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      dense.push(2000 + i * 50);
    }
    const chart = createOnsetChart(dense, 10_000, mulberry32(3));
    for (let i = 1; i < chart.notes.length; i += 1) {
      expect(chart.notes[i].time - chart.notes[i - 1].time).toBeGreaterThanOrEqual(250);
    }
  });

  test('丢弃超出 durationMs 的 onset', () => {
    const onsets = [2000, 3000, 4000, 5000, 6000, 7000];
    const chart = createOnsetChart(onsets, 5_500, mulberry32(4));
    chart.notes.forEach((note) => {
      expect(note.time).toBeLessThan(5_500);
    });
  });

  test('hand/cut 覆盖全部 8 组合，洗牌袋同样生效', () => {
    const onsets = buildOnsets(40);
    const chart = createOnsetChart(onsets, 15_000, mulberry32(5));
    const combos = new Set(chart.notes.map((n) => `${n.hand}-${n.cut}`));
    const required = ['L-U', 'L-D', 'L-L', 'L-R', 'R-U', 'R-D', 'R-L', 'R-R'];
    required.forEach((c) => {
      expect(combos.has(c)).toBe(true);
    });
  });

  test('左右手 lane 分布与 createDemoChart 一致（L→0/1, R→2/3）', () => {
    const onsets = buildOnsets(30);
    const chart = createOnsetChart(onsets, 15_000, mulberry32(6));
    chart.notes.forEach((n) => {
      if (n.hand === 'L') {
        expect([0, 1]).toContain(n.lane);
      } else {
        expect([2, 3]).toContain(n.lane);
      }
    });
  });

  test('approachMs 默认 1600，可被 options 覆盖', () => {
    const onsets = buildOnsets(20);
    const a = createOnsetChart(onsets, 15_000, mulberry32(7));
    expect(a.approachMs).toBe(1600);
    const b = createOnsetChart(onsets, 15_000, mulberry32(7), { approachMs: 1200 });
    expect(b.approachMs).toBe(1200);
  });

  test('空 onset 数组返回空 chart 但其他字段合法', () => {
    const chart = createOnsetChart([], 10_000, mulberry32(8));
    expect(chart.notes).toEqual([]);
    expect(chart.durationMs).toBeGreaterThan(0);
    expect(chart.approachMs).toBeGreaterThan(0);
  });

  test('相邻方块的 lane 必须不同：避免后块沿同轨遮挡前块导致玩家来不及反应', () => {
    const onsets = buildOnsets(40);
    [1, 2, 3, 7, 42, 100, 200].forEach((seed) => {
      const { notes } = createOnsetChart(onsets, 15_000, mulberry32(seed));
      for (let i = 1; i < notes.length; i += 1) {
        expect(notes[i].lane).not.toBe(notes[i - 1].lane);
      }
    });
  });
});
