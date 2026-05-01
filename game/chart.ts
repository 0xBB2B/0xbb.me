import type { BeatChart, CutDirection, Hand, Lane, Note } from './types';
import { createSoundtrack, stepDurationMs, trackDurationMs } from './chiptune';

// 显式枚举 8 个 (hand, cut) 组合，确保谱面里全部 8 个键位
// （左手 W/A/S/D 与右手 I/J/K/L）都会被用上。
//
// 早期版本是"hand 周期 4 + cut 周期 4"两套独立循环，但它们的最小公
// 倍数也是 4，结果只会出现 4 种组合（L+D, L+L, R+U, R+R），导致
// 玩家发现 W/D/J/K 永远没有方块来。这里用一张 8 步循环表彻底打破锁。
const NOTE_PATTERN: ReadonlyArray<{ hand: Hand; cut: CutDirection; lane: Lane }> = [
  { hand: 'L', cut: 'D', lane: 0 },
  { hand: 'R', cut: 'U', lane: 3 },
  { hand: 'L', cut: 'L', lane: 1 },
  { hand: 'R', cut: 'R', lane: 2 },
  { hand: 'L', cut: 'U', lane: 0 },
  { hand: 'R', cut: 'D', lane: 3 },
  { hand: 'L', cut: 'R', lane: 1 },
  { hand: 'R', cut: 'L', lane: 2 },
];

/**
 * createDemoChart 根据 ChiptuneEngine 的内置 BGM 生成对应的方块谱面。
 *
 * 设计原则：
 *   - 每 4 步（即每个 4 分音符）生成 1 个方块，节奏与拍点对齐；
 *   - 用 8 步循环的 NOTE_PATTERN 保证全部 8 个键位都会出现；
 *   - 谱面起点偏移 2 拍，给玩家"空拍准备"的入场感。
 */
export function createDemoChart(): BeatChart {
  const track = createSoundtrack();
  const stepMs = stepDurationMs(track);
  const totalSteps = track.tracks.lead.length * track.loops;
  // 每 4 步（4 分音符）放一块。
  const noteStepInterval = 4;
  // 入场预备的空拍数。
  const introBeats = 2;
  const approachMs = 1600;

  const notes: Note[] = [];
  for (let step = introBeats * 4; step < totalSteps; step += noteStepInterval) {
    const beatIndex = step / noteStepInterval;
    const slot = NOTE_PATTERN[beatIndex % NOTE_PATTERN.length];

    notes.push({
      time: step * stepMs,
      lane: slot.lane,
      hand: slot.hand,
      cut: slot.cut,
    });
  }

  return {
    title: 'AHA! TIME // SILVER WOLF MIX',
    bpm: track.bpm,
    durationMs: trackDurationMs(track) + 2000,
    approachMs,
    notes,
  };
}

// 谱面起点之前留出的"空拍准备"段长度，UI 可用于显示 READY?。
export function chartIntroMs(): number {
  const track = createSoundtrack();
  return stepDurationMs(track) * 4 * 2;
}
