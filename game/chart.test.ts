import { describe, test, expect } from 'bun:test';
import { createDemoChart } from './chart';

describe('createDemoChart', () => {
  test('谱面包含足够多的方块（>50）', () => {
    const chart = createDemoChart();
    expect(chart.notes.length).toBeGreaterThan(50);
  });

  test('方块按时间升序排列', () => {
    const { notes } = createDemoChart();
    for (let i = 1; i < notes.length; i += 1) {
      expect(notes[i].time).toBeGreaterThan(notes[i - 1].time);
    }
  });

  test('方块时间不超过曲目总时长', () => {
    const chart = createDemoChart();
    const last = chart.notes[chart.notes.length - 1];
    expect(last.time).toBeLessThan(chart.durationMs);
  });

  test('谱面包含左右手两种方块', () => {
    const { notes } = createDemoChart();
    const hands = new Set(notes.map((n) => n.hand));
    expect(hands.has('L')).toBe(true);
    expect(hands.has('R')).toBe(true);
  });

  test('谱面覆盖 4 个轨道', () => {
    const { notes } = createDemoChart();
    const lanes = new Set(notes.map((n) => n.lane));
    expect(lanes.size).toBe(4);
  });

  test('approachMs 留出充足的提前预览时间', () => {
    const chart = createDemoChart();
    expect(chart.approachMs).toBeGreaterThanOrEqual(800);
  });
});
