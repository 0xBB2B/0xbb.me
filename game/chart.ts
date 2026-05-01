import type { BeatChart, CutDirection, Hand, Lane, Note } from './types';
import { createSoundtrack, stepDurationMs, trackDurationMs } from './chiptune';

// 每个拍点轮流的切击方向，营造视觉节奏。
const CUT_PATTERN: CutDirection[] = ['D', 'L', 'U', 'R'];

// 4 个轨道循环放置。
const LANE_PATTERN: Lane[] = [0, 1, 2, 3];

/**
 * createDemoChart 根据 ChiptuneEngine 的内置 BGM 生成对应的方块谱面。
 *
 * 设计原则：
 *   - 每 4 步（即每个 4 分音符）生成 1 个方块，节奏与拍点对齐；
 *   - 轨道与手在 4 步 / 8 步周期内交替，避免单调；
 *   - 切击方向按 4 拍循环 D→L→U→R，让玩家形成空间记忆；
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
  const introMs = introBeats * stepMs * 4;
  const approachMs = 1600;

  const notes: Note[] = [];
  for (let step = introBeats * 4; step < totalSteps; step += noteStepInterval) {
    const beatIndex = step / noteStepInterval;
    const lane = LANE_PATTERN[beatIndex % LANE_PATTERN.length];
    const cut = CUT_PATTERN[beatIndex % CUT_PATTERN.length];
    // 左右手交替；每 4 拍换一次"主导手"，让两手都有连击段。
    const hand: Hand = Math.floor(beatIndex / 2) % 2 === 0 ? 'L' : 'R';

    notes.push({
      time: step * stepMs,
      lane,
      hand,
      cut,
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
