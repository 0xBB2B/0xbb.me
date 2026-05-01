/**
 * 节奏光剑核心数据类型定义。
 *
 * 谱面坐标系：lane 0..3 对应屏幕从左到右的 4 个轨道；
 * cut 方向描述方块上的箭头，表示需要从哪个方向切入；
 * hand 决定哪只手（哪种颜色光剑）能切到对应方块。
 */

// 切击手——L 表示左手红剑，R 表示右手蓝剑。
export type Hand = 'L' | 'R';

// 切击方向：八方向 + 'A'（any，任意方向都算命中）。
export type CutDirection = 'U' | 'D' | 'L' | 'R' | 'UL' | 'UR' | 'DL' | 'DR' | 'A';

// 轨道编号——0 最左，3 最右。
export type Lane = 0 | 1 | 2 | 3;

// 单个方块谱面项。
export interface Note {
  // 方块到达判定线的时间，单位毫秒，从音乐起点 0 计。
  time: number;
  lane: Lane;
  hand: Hand;
  cut: CutDirection;
}

// 完整谱面。
export interface BeatChart {
  // 标题，仅用于 HUD 展示。
  title: string;
  // 节拍速度，仅用于背景脉冲等装饰，不参与判定。
  bpm: number;
  // 谱面总时长（毫秒）。
  durationMs: number;
  // 方块从远处到达判定线所需的飞行时间（毫秒），决定生成提前量。
  approachMs: number;
  // 按 time 升序排列的方块列表。
  notes: Note[];
}

// 单次切击判定结果。
export type Judgement = 'PERFECT' | 'GOOD' | 'MISS';

// 判定阈值——可在测试中覆盖默认值。
export interface JudgeWindow {
  perfectMs: number;
  goodMs: number;
}

// 默认判定窗口，参考 Beat Saber 的容错度。
export const DEFAULT_JUDGE_WINDOW: JudgeWindow = {
  perfectMs: 60,
  goodMs: 120,
};

// 玩家本次切击输入。
export interface SwingInput {
  hand: Hand;
  direction: CutDirection;
  // 玩家按键时刻（毫秒），与 Note.time 同一时间轴。
  hitAt: number;
}
