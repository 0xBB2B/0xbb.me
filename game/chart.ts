import type { BeatChart, CutDirection, Hand, Lane, Note } from './types';

/**
 * BGM 常量：所有谱面拍点都基于这三项推导。
 *
 * 数值来源——音频文件 public/music.ogg 由资源提供方自行裁剪好直接放入仓库，
 * 项目侧不再做二次截取；BPM 通过振幅自相关分析得出（peak ≈ 117.2 BPM，
 * 145 BPM 的相关分数仅为 1/32），DURATION_MS 与 ogg 实际时长（32.11s）对齐。
 */
export const BGM_URL = '/music.ogg';
export const BGM_BPM = 117;
export const BGM_DURATION_MS = 32_100;
/**
 * BGM_OFFSET_MS：裁剪片段中第一个清晰鼓点距 t=0 的偏移。
 * 通过前 3 秒的 onset 峰值检测得出（首个明显峰值约在 256ms 处）。
 * 谱面所有拍点都以 BGM_OFFSET_MS 为相位锚点累加 beatMs，让方块
 * 切击时刻与音乐 onset 对齐。
 */
export const BGM_OFFSET_MS = 256;

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
 * ChartTiming 是 createDemoChart 的可选时间参数。
 *
 * 默认值取自 BGM_BPM / BGM_OFFSET_MS / BGM_DURATION_MS 常量，作为分析失败
 * 或离线（unit test）场景下的兜底；运行时可由浏览器侧 analyzeAudioBuffer
 * 动态推断后传入，让相位锚点跟着实际音频校准。
 */
export interface ChartTiming {
  bpm: number;
  offsetMs: number;
  durationMs: number;
}

/**
 * createDemoChart 基于 BGM 的 BPM、时长、首拍偏移生成方块谱面。
 *
 * 拍点策略：
 *   - beatMs = 60_000 / timing.bpm，每拍出一个方块；
 *   - introBeats = ⌈approachMs / beatMs⌉——保证首方块的 spawn 时刻
 *     (= time − approachMs) ≥ 0，让 approachMs 调整时无需手动配套；
 *   - 每个拍点的 time = timing.offsetMs + (introBeats + i) × beatMs，
 *     以音乐首鼓点为相位锚点累加，方块切击时刻与音乐 onset 对齐；
 *   - 每个拍点的 (hand, cut) 从一个"包含全部 8 种组合的洗牌袋"中抽取，
 *     抽空再重洗——这样既保证序列随机不可预测，又保证每 8 个方块至少
 *     覆盖完所有 8 种组合，玩家不会出现"某个键永远等不到方块"。
 *   - lane 仅根据 hand 二选一（左手 0 或 1、右手 2 或 3），让左右手的
 *     方块自然分布在屏幕两侧，符合 Beat Saber 的双轨道直觉。
 *
 * @param rng 随机源，默认使用 Math.random；测试时可传确定性 RNG。
 * @param timing 可选的 BPM / offset / 总时长；默认走 BGM_* 常量兜底。
 */
export function createDemoChart(
  rng: () => number = Math.random,
  timing: ChartTiming = { bpm: BGM_BPM, offsetMs: BGM_OFFSET_MS, durationMs: BGM_DURATION_MS },
): BeatChart {
  const beatMs = 60_000 / timing.bpm;
  const approachMs = 1600;
  const introBeats = Math.ceil(approachMs / beatMs);

  let bag: { hand: Hand; cut: CutDirection }[] = [];
  const drawCombo = () => {
    if (bag.length === 0) {
      bag = shuffle(ALL_COMBOS, rng);
    }
    return bag.pop()!;
  };

  const notes: Note[] = [];
  for (let i = 0; ; i += 1) {
    const time = timing.offsetMs + (introBeats + i) * beatMs;
    if (time >= timing.durationMs) {
      break;
    }
    const slot = drawCombo();
    const lane: Lane = slot.hand === 'L'
      ? (rng() < 0.5 ? 0 : 1)
      : (rng() < 0.5 ? 2 : 3);
    notes.push({ time, lane, hand: slot.hand, cut: slot.cut });
  }

  return {
    title: 'STAGE 01 // FUBUKI MIX',
    bpm: timing.bpm,
    durationMs: timing.durationMs + 2_000,
    approachMs,
    notes,
  };
}
