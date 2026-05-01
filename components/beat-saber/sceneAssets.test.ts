import { describe, test, expect } from 'bun:test';
import {
  JUDGE_Z,
  PAST_Z,
  SPAWN_Z,
  TRAVEL_DISTANCE,
  computeNoteZ,
  isNoteVisible,
} from './sceneAssets';

describe('computeNoteZ', () => {
  test('在 noteTime - approachMs 时刻，方块位于 SPAWN_Z', () => {
    const z = computeNoteZ(2000, 2000 - 1500, 1500);
    expect(z).toBeCloseTo(SPAWN_Z);
  });

  test('在 noteTime 时刻，方块到达 JUDGE_Z', () => {
    const z = computeNoteZ(2000, 2000, 1500);
    expect(z).toBeCloseTo(JUDGE_Z);
  });

  test('在 noteTime 之后，方块走过判定线继续前进', () => {
    const z = computeNoteZ(2000, 2300, 1500);
    expect(z).toBeGreaterThan(JUDGE_Z);
  });

  test('TRAVEL_DISTANCE 等于 PAST_Z - SPAWN_Z', () => {
    expect(TRAVEL_DISTANCE).toBeCloseTo(PAST_Z - SPAWN_Z);
  });
});

describe('isNoteVisible', () => {
  test('生成前不可见', () => {
    expect(isNoteVisible(2000, 0, 1500)).toBe(false);
  });

  test('在飞行窗口内可见', () => {
    expect(isNoteVisible(2000, 2000 - 1000, 1500)).toBe(true);
    expect(isNoteVisible(2000, 2000, 1500)).toBe(true);
    expect(isNoteVisible(2000, 2000 + 100, 1500)).toBe(true);
  });

  test('飞过相机后不再可见', () => {
    // 走完所有 TRAVEL_DISTANCE 用 approachMs * (TRAVEL_DISTANCE / (JUDGE_Z - SPAWN_Z))
    const overshoot = 1500 * 2;
    expect(isNoteVisible(2000, 2000 + overshoot, 1500)).toBe(false);
  });
});
