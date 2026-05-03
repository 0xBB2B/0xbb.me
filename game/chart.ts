import type { BeatChart, CutDirection, Hand, Lane, Note } from './types';

/**
 * BGM 常量：所有谱面拍点都基于这三项推导。
 *
 * 数值来源——音频文件 public/music.ogg 是从原始素材中裁剪的 31.5s 片段，
 * 由项目侧的 ffmpeg + 振幅自相关分析（peak ≈ 117.2 BPM）确定，
 * 详见提交日志。
 */
export const BGM_URL = '/music.ogg';
export const BGM_BPM = 117;
export const BGM_DURATION_MS = 31_500;

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
 * createDemoChart 基于 BGM 的 BPM 与时长生成方块谱面。
 *
 * 拍点策略：
 *   - 以 BPM 推算每拍毫秒数（117 BPM ≈ 513ms/拍），每拍出一个方块；
 *   - 前 introBeats 拍不出方块，预留 READY? 暖场段；
 *   - 每个拍点的 (hand, cut) 从一个"包含全部 8 种组合的洗牌袋"中抽取，
 *     抽空再重洗——这样既保证序列随机不可预测，又保证每 8 个方块至少
 *     覆盖完所有 8 种组合，玩家不会出现"某个键永远等不到方块"。
 *   - lane 仅根据 hand 二选一（左手 0 或 1、右手 2 或 3），让左右手的
 *     方块自然分布在屏幕两侧，符合 Beat Saber 的双轨道直觉。
 *
 * @param rng 随机源，默认使用 Math.random；测试时可传确定性 RNG。
 */
export function createDemoChart(rng: () => number = Math.random): BeatChart {
  const beatMs = 60_000 / BGM_BPM;
  const introBeats = 2;
  const approachMs = 1600;
  const totalBeats = Math.floor(BGM_DURATION_MS / beatMs);

  let bag: { hand: Hand; cut: CutDirection }[] = [];
  const drawCombo = () => {
    if (bag.length === 0) {
      bag = shuffle(ALL_COMBOS, rng);
    }
    return bag.pop()!;
  };

  const notes: Note[] = [];
  for (let beat = introBeats; beat < totalBeats; beat += 1) {
    const slot = drawCombo();
    const lane: Lane = slot.hand === 'L'
      ? (rng() < 0.5 ? 0 : 1)
      : (rng() < 0.5 ? 2 : 3);

    notes.push({
      time: beat * beatMs,
      lane,
      hand: slot.hand,
      cut: slot.cut,
    });
  }

  return {
    title: 'STAGE 01 // FUBUKI MIX',
    bpm: BGM_BPM,
    durationMs: BGM_DURATION_MS + 2_000,
    approachMs,
    notes,
  };
}

// 谱面起点之前留出的"空拍准备"段长度，UI 可用于显示 READY?。
export function chartIntroMs(): number {
  return (60_000 / BGM_BPM) * 2;
}
