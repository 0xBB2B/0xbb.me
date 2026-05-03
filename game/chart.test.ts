import { describe, test, expect } from 'bun:test';
import { createDemoChart } from './chart';

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
});
