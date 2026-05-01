import { describe, test, expect } from 'bun:test';
import {
  findHitTarget,
  isDirectionMatch,
  judgeHit,
  nextCombo,
  scoreFor,
} from './judge';
import type { Note, SwingInput } from './types';

// 构造测试用方块的辅助函数。
function buildNote(overrides: Partial<Note> = {}): Note {
  return {
    time: 1000,
    lane: 1,
    hand: 'L',
    cut: 'D',
    ...overrides,
  };
}

// 构造测试用切击输入的辅助函数。
function buildSwing(overrides: Partial<SwingInput> = {}): SwingInput {
  return {
    hand: 'L',
    direction: 'D',
    hitAt: 1000,
    ...overrides,
  };
}

describe('isDirectionMatch', () => {
  test('方块方向为 A 时任何方向都匹配', () => {
    expect(isDirectionMatch('A', 'U')).toBe(true);
    expect(isDirectionMatch('A', 'DL')).toBe(true);
  });

  test('方块方向具体时要求完全一致', () => {
    expect(isDirectionMatch('U', 'U')).toBe(true);
    expect(isDirectionMatch('U', 'D')).toBe(false);
    expect(isDirectionMatch('UL', 'L')).toBe(false);
  });
});

describe('judgeHit', () => {
  test('完全同时刻同方向同手切击 -> PERFECT', () => {
    expect(judgeHit(buildNote(), buildSwing())).toBe('PERFECT');
  });

  test('时间差在 perfect 窗口内 -> PERFECT', () => {
    expect(judgeHit(buildNote({ time: 1000 }), buildSwing({ hitAt: 1059 }))).toBe('PERFECT');
    expect(judgeHit(buildNote({ time: 1000 }), buildSwing({ hitAt: 941 }))).toBe('PERFECT');
  });

  test('时间差超过 perfect 但不超过 good 窗口 -> GOOD', () => {
    expect(judgeHit(buildNote({ time: 1000 }), buildSwing({ hitAt: 1100 }))).toBe('GOOD');
    expect(judgeHit(buildNote({ time: 1000 }), buildSwing({ hitAt: 880 }))).toBe('GOOD');
  });

  test('时间差超过 good 窗口 -> MISS', () => {
    expect(judgeHit(buildNote({ time: 1000 }), buildSwing({ hitAt: 1200 }))).toBe('MISS');
  });

  test('方向不匹配 -> MISS', () => {
    expect(judgeHit(buildNote({ cut: 'D' }), buildSwing({ direction: 'U' }))).toBe('MISS');
  });

  test('手不匹配 -> MISS（即使时间和方向都对）', () => {
    expect(judgeHit(buildNote({ hand: 'L' }), buildSwing({ hand: 'R' }))).toBe('MISS');
  });

  test('any 方向方块允许任何切入方向', () => {
    const note = buildNote({ cut: 'A' });
    expect(judgeHit(note, buildSwing({ direction: 'U' }))).toBe('PERFECT');
    expect(judgeHit(note, buildSwing({ direction: 'DR' }))).toBe('PERFECT');
  });

  test('支持自定义判定窗口', () => {
    const tight = { perfectMs: 20, goodMs: 50 };
    expect(judgeHit(buildNote(), buildSwing({ hitAt: 1030 }), tight)).toBe('GOOD');
    expect(judgeHit(buildNote(), buildSwing({ hitAt: 1060 }), tight)).toBe('MISS');
  });
});

describe('scoreFor', () => {
  test('PERFECT 得 100 分', () => {
    expect(scoreFor('PERFECT')).toBe(100);
  });
  test('GOOD 得 50 分', () => {
    expect(scoreFor('GOOD')).toBe(50);
  });
  test('MISS 得 0 分', () => {
    expect(scoreFor('MISS')).toBe(0);
  });
});

describe('nextCombo', () => {
  test('PERFECT/GOOD 累加 combo', () => {
    expect(nextCombo(5, 'PERFECT')).toBe(6);
    expect(nextCombo(5, 'GOOD')).toBe(6);
  });

  test('MISS 重置 combo 为 0', () => {
    expect(nextCombo(20, 'MISS')).toBe(0);
  });
});

describe('findHitTarget', () => {
  test('挑出时间最接近且匹配的方块下标', () => {
    const notes: Note[] = [
      buildNote({ time: 800, hand: 'L', cut: 'D' }),
      buildNote({ time: 1000, hand: 'L', cut: 'D' }),
      buildNote({ time: 1080, hand: 'L', cut: 'D' }),
    ];
    const result = findHitTarget(notes, buildSwing({ hitAt: 1010, direction: 'D' }));
    expect(result).toBe(1);
  });

  test('过滤掉手不匹配的方块', () => {
    const notes: Note[] = [
      buildNote({ time: 1000, hand: 'R', cut: 'D' }),
      buildNote({ time: 1100, hand: 'L', cut: 'D' }),
    ];
    const result = findHitTarget(notes, buildSwing({ hitAt: 1010, hand: 'L', direction: 'D' }));
    expect(result).toBe(1);
  });

  test('全部超出窗口时返回 -1', () => {
    const notes: Note[] = [buildNote({ time: 0 }), buildNote({ time: 5000 })];
    expect(findHitTarget(notes, buildSwing({ hitAt: 2500 }))).toBe(-1);
  });

  test('方向不匹配时跳过该方块', () => {
    const notes: Note[] = [
      buildNote({ time: 1000, cut: 'U' }),
      buildNote({ time: 1080, cut: 'D' }),
    ];
    const result = findHitTarget(notes, buildSwing({ hitAt: 1010, direction: 'D' }));
    expect(result).toBe(1);
  });

  test('any 方向方块即便玩家方向不同也能命中', () => {
    const notes: Note[] = [buildNote({ time: 1000, cut: 'A' })];
    const result = findHitTarget(notes, buildSwing({ hitAt: 1000, direction: 'UR' }));
    expect(result).toBe(0);
  });
});
