import { describe, test, expect } from 'bun:test';
import { analyzeOnsets } from './audioAnalysis';

/**
 * makePulseEnvelope 合成一段固定 BPM 的脉冲包络，用于测试分析函数。
 *
 * 每个脉冲是一个三角形（升 2 帧，降 4 帧），包络其余位置为低噪声底。
 * 脉冲位置 = offsetFrames + i * periodFrames（i=0..count-1），
 * 整段总长 = totalFrames。
 */
function makePulseEnvelope(opts: {
  totalFrames: number;
  offsetFrames: number;
  periodFrames: number;
  count: number;
  pulseAmp?: number;
  noiseAmp?: number;
}): Float32Array {
  const env = new Float32Array(opts.totalFrames);
  const pulseAmp = opts.pulseAmp ?? 1.0;
  const noiseAmp = opts.noiseAmp ?? 0.05;
  for (let i = 0; i < opts.totalFrames; i += 1) {
    env[i] = noiseAmp * (i * 7919 % 13) / 13; // 确定性"噪声"
  }
  for (let i = 0; i < opts.count; i += 1) {
    const peak = opts.offsetFrames + i * opts.periodFrames;
    if (peak >= opts.totalFrames) break;
    // 三角包络：peak-2..peak 升、peak..peak+4 降
    for (let k = -2; k <= 4; k += 1) {
      const idx = peak + k;
      if (idx < 0 || idx >= opts.totalFrames) continue;
      const w = k <= 0 ? (k + 2) / 2 : (4 - k) / 4;
      env[idx] = Math.max(env[idx], pulseAmp * w);
    }
  }
  return env;
}

describe('analyzeOnsets', () => {
  test('能从均匀脉冲恢复 BPM 与首拍偏移', () => {
    // envelope 帧率 1000 fps（1ms/帧），便于直接换算 ms
    const envelopeRate = 1000;
    // 120 BPM = 一拍 500ms = 500 帧；首拍偏移 320ms = 320 帧
    const env = makePulseEnvelope({
      totalFrames: 16_000, // 16 秒
      offsetFrames: 320,
      periodFrames: 500,
      count: 30,
    });
    const result = analyzeOnsets(env, envelopeRate);
    expect(result.bpm).toBeCloseTo(120, 0);
    expect(result.offsetMs).toBeGreaterThanOrEqual(315);
    expect(result.offsetMs).toBeLessThanOrEqual(325);
  });

  test('不同 BPM（每分钟拍数）下都能收敛', () => {
    const envelopeRate = 1000;
    const cases: Array<{ bpm: number; offsetMs: number }> = [
      { bpm: 90, offsetMs: 100 },
      { bpm: 117, offsetMs: 256 },
      { bpm: 145, offsetMs: 80 },
      { bpm: 175, offsetMs: 50 },
    ];
    for (const c of cases) {
      const period = (60_000 / c.bpm); // ms = frames at 1000 fps
      const env = makePulseEnvelope({
        totalFrames: 20_000,
        offsetFrames: c.offsetMs,
        periodFrames: Math.round(period),
        count: 40,
      });
      const result = analyzeOnsets(env, envelopeRate);
      expect(result.bpm).toBeCloseTo(c.bpm, 0);
      expect(Math.abs(result.offsetMs - c.offsetMs)).toBeLessThanOrEqual(8);
    }
  });

  test('onsetTimesMs 列表至少包含首拍位置且按时间升序', () => {
    const env = makePulseEnvelope({
      totalFrames: 10_000,
      offsetFrames: 200,
      periodFrames: 500,
      count: 18,
    });
    const result = analyzeOnsets(env, 1000);
    expect(result.onsetTimesMs.length).toBeGreaterThan(0);
    // 首拍附近（±20ms）
    expect(Math.abs(result.onsetTimesMs[0] - 200)).toBeLessThanOrEqual(20);
    // 时间升序
    for (let i = 1; i < result.onsetTimesMs.length; i += 1) {
      expect(result.onsetTimesMs[i]).toBeGreaterThan(result.onsetTimesMs[i - 1]);
    }
  });

  test('全静音 envelope 不崩溃，返回 BPM 默认值', () => {
    const env = new Float32Array(5_000); // 全 0
    const result = analyzeOnsets(env, 1000);
    expect(result.onsetTimesMs.length).toBe(0);
    expect(result.bpm).toBeGreaterThan(0); // 不返回 0/NaN
  });
});
