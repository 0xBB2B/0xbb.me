import type { BeatChart, CutDirection, Hand, Lane, Note } from './types';
import { createSoundtrack, stepDurationMs, trackDurationMs } from './chiptune';

// 全部 8 种 (hand, cut) 组合——对应键盘 8 个方向键。
const ALL_COMBOS: ReadonlyArray<{ hand: Hand; cut: CutDirection }> = [
  { hand: 'L', cut: 'U' },
  { hand: 'L', cut: 'D' },
  { hand: 'L', cut: 'L' },
  { hand: 'L', cut: 'R' },
  { hand: 'R', cut: 'U' },
  { hand: 'R', cut: 'D' },
  { hand: 'R', cut: 'L' },
  { hand: 'R', cut: 'R' },
];

/**
 * shuffle 用 Fisher-Yates 算法对副本进行就地洗牌，rng 注入便于测试。
 */
function shuffle<T>(arr: ReadonlyArray<T>, rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * createDemoChart 根据 ChiptuneEngine 的内置 BGM 生成方块谱面。
 *
 * 谱面随机化策略：
 *   - 每个拍点的 (hand, cut) 从一个"包含全部 8 种组合的洗牌袋"中抽取，
 *     抽空再重洗——这样既保证序列随机不重复成预测式，又保证每 8 个
 *     方块至少覆盖完所有 8 种组合，玩家不会出现"某个键永远等不到方块"。
 *   - lane 仅根据 hand 二选一（左手 0 或 1、右手 2 或 3），让左右手的
 *     方块自然分布在屏幕两侧，符合 Beat Saber 的双轨道直觉。
 *
 * @param rng 随机源，默认使用 Math.random；测试时可传确定性 RNG。
 */
export function createDemoChart(rng: () => number = Math.random): BeatChart {
  const track = createSoundtrack();
  const stepMs = stepDurationMs(track);
  const totalSteps = track.tracks.lead.length * track.loops;
  const noteStepInterval = 4;
  const introBeats = 2;
  const approachMs = 1600;

  let bag: { hand: Hand; cut: CutDirection }[] = [];
  const drawCombo = () => {
    if (bag.length === 0) {
      bag = shuffle(ALL_COMBOS, rng);
    }
    return bag.pop()!;
  };

  const notes: Note[] = [];
  for (let step = introBeats * 4; step < totalSteps; step += noteStepInterval) {
    const slot = drawCombo();
    const lane: Lane = slot.hand === 'L'
      ? (rng() < 0.5 ? 0 : 1)
      : (rng() < 0.5 ? 2 : 3);

    notes.push({
      time: step * stepMs,
      lane,
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
