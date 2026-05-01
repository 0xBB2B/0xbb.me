import { describe, test, expect } from 'bun:test';
import {
  createSoundtrack,
  stepDurationMs,
  trackDurationMs,
} from './chiptune';

describe('chiptune track shape', () => {
  test('createSoundtrack 返回内置 demo 曲目，BPM 与小节长度合法', () => {
    const track = createSoundtrack();
    expect(track.bpm).toBeGreaterThan(0);
    expect(track.stepsPerBar).toBeGreaterThan(0);
    expect(track.loops).toBeGreaterThan(0);
  });

  test('每条 voice 序列长度都是 stepsPerBar 的整数倍', () => {
    const track = createSoundtrack();
    Object.values(track.tracks).forEach((sequence) => {
      expect(sequence.length % track.stepsPerBar).toBe(0);
      expect(sequence.length).toBeGreaterThan(0);
    });
  });

  test('lead/bass/hat 序列同步等长，保证小节对齐', () => {
    const { tracks } = createSoundtrack();
    const lengths = Object.values(tracks).map((seq) => seq.length);
    const unique = new Set(lengths);
    expect(unique.size).toBe(1);
  });

  test('lead 至少包含若干非空音符以验证旋律存在', () => {
    const { tracks } = createSoundtrack();
    const nonEmpty = tracks.lead.filter((step) => step !== null);
    expect(nonEmpty.length).toBeGreaterThan(8);
  });
});

describe('stepDurationMs', () => {
  test('132bpm + 16 步小节单步约 113ms', () => {
    const track = createSoundtrack();
    const stepMs = stepDurationMs(track);
    // 60_000 / 132 / 4 ≈ 113.636
    expect(stepMs).toBeCloseTo(113.636, 1);
  });

  test('单步乘以小节步数等于一小节四拍', () => {
    const track = createSoundtrack();
    const barMs = stepDurationMs(track) * track.stepsPerBar;
    const expectedBarMs = (60_000 / track.bpm) * 4;
    expect(barMs).toBeCloseTo(expectedBarMs, 5);
  });
});

describe('trackDurationMs', () => {
  test('总时长 = 单步 × lead 序列长度 × 循环数', () => {
    const track = createSoundtrack();
    const expected = stepDurationMs(track) * track.tracks.lead.length * track.loops;
    expect(trackDurationMs(track)).toBeCloseTo(expected, 5);
  });

  test('demo 曲目总时长应在合理范围内（30s ~ 120s）', () => {
    const ms = trackDurationMs(createSoundtrack());
    expect(ms).toBeGreaterThan(30_000);
    expect(ms).toBeLessThan(120_000);
  });
});
