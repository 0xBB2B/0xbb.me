import { describe, test, expect } from 'bun:test';
import { accuracy, applyJudgement, createInitialStats } from './scoring';

describe('createInitialStats', () => {
  test('所有计数器从 0 开始', () => {
    const stats = createInitialStats();
    expect(stats).toEqual({
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfect: 0,
      good: 0,
      miss: 0,
      total: 0,
    });
  });
});

describe('applyJudgement', () => {
  test('PERFECT 累加分数、连击与最大连击', () => {
    const stats = applyJudgement(createInitialStats(), 'PERFECT');
    expect(stats.score).toBe(100);
    expect(stats.combo).toBe(1);
    expect(stats.maxCombo).toBe(1);
    expect(stats.perfect).toBe(1);
    expect(stats.total).toBe(1);
  });

  test('连续 PERFECT 持续累加 maxCombo', () => {
    let stats = createInitialStats();
    for (let i = 0; i < 5; i += 1) {
      stats = applyJudgement(stats, 'PERFECT');
    }
    expect(stats.combo).toBe(5);
    expect(stats.maxCombo).toBe(5);
    expect(stats.score).toBe(500);
  });

  test('MISS 仅清零 combo 不影响 maxCombo', () => {
    let stats = createInitialStats();
    stats = applyJudgement(stats, 'PERFECT');
    stats = applyJudgement(stats, 'PERFECT');
    stats = applyJudgement(stats, 'MISS');
    expect(stats.combo).toBe(0);
    expect(stats.maxCombo).toBe(2);
    expect(stats.miss).toBe(1);
  });

  test('GOOD 累加 50 分', () => {
    const stats = applyJudgement(createInitialStats(), 'GOOD');
    expect(stats.score).toBe(50);
    expect(stats.good).toBe(1);
  });

  test('应保持函数纯粹性，不修改输入对象', () => {
    const original = createInitialStats();
    applyJudgement(original, 'PERFECT');
    expect(original.score).toBe(0);
    expect(original.combo).toBe(0);
  });
});

describe('accuracy', () => {
  test('未切击时返回 1', () => {
    expect(accuracy(createInitialStats())).toBe(1);
  });

  test('全 PERFECT 命中率为 1', () => {
    let stats = createInitialStats();
    stats = applyJudgement(stats, 'PERFECT');
    stats = applyJudgement(stats, 'PERFECT');
    expect(accuracy(stats)).toBe(1);
  });

  test('PERFECT/GOOD/MISS 加权平均', () => {
    let stats = createInitialStats();
    stats = applyJudgement(stats, 'PERFECT');
    stats = applyJudgement(stats, 'GOOD');
    stats = applyJudgement(stats, 'MISS');
    // (1 + 0.5 + 0) / 3
    expect(accuracy(stats)).toBeCloseTo(0.5);
  });
});
