import type { CutDirection, Judgement, JudgeWindow, Note, SwingInput } from './types';
import { DEFAULT_JUDGE_WINDOW } from './types';

/**
 * isDirectionMatch 判断玩家切入方向是否满足方块要求。
 *
 * 当方块方向为 'A' 时表示任意方向都视为正确；
 * 否则要求玩家方向与方块方向完全一致。
 */
export function isDirectionMatch(noteDir: CutDirection, swingDir: CutDirection): boolean {
  if (noteDir === 'A') {
    return true;
  }
  return noteDir === swingDir;
}

/**
 * judgeHit 判定一次切击的成败档次。
 *
 * 判定规则（按优先级）：
 *   1. 手不匹配 -> MISS（红/蓝光剑只能切对应方块）。
 *   2. 时间差超过 GOOD 窗口 -> MISS。
 *   3. 方向不匹配 -> MISS。
 *   4. 时间差 ≤ PERFECT 窗口 -> PERFECT。
 *   5. 时间差 ≤ GOOD 窗口 -> GOOD。
 *
 * @param note 目标方块。
 * @param swing 玩家本次切击输入。
 * @param window 判定窗口，未传时使用默认值。
 */
export function judgeHit(
  note: Note,
  swing: SwingInput,
  window: JudgeWindow = DEFAULT_JUDGE_WINDOW,
): Judgement {
  if (note.hand !== swing.hand) {
    return 'MISS';
  }

  const delta = Math.abs(swing.hitAt - note.time);
  if (delta > window.goodMs) {
    return 'MISS';
  }

  if (!isDirectionMatch(note.cut, swing.direction)) {
    return 'MISS';
  }

  if (delta <= window.perfectMs) {
    return 'PERFECT';
  }
  return 'GOOD';
}

/**
 * scoreFor 返回单次判定对应的分数增量。
 */
export function scoreFor(judgement: Judgement): number {
  switch (judgement) {
    case 'PERFECT':
      return 100;
    case 'GOOD':
      return 50;
    case 'MISS':
      return 0;
  }
}

/**
 * nextCombo 根据本次判定计算更新后的连击数。
 *
 * PERFECT 与 GOOD 累加 combo；MISS 直接清零。
 */
export function nextCombo(currentCombo: number, judgement: Judgement): number {
  if (judgement === 'MISS') {
    return 0;
  }
  return currentCombo + 1;
}

/**
 * findHitTarget 在候选方块中挑出最该被本次切击命中的方块下标。
 *
 * 通常在玩家挥剑时，可能有多块方块挂在判定窗口内，需挑选时间最接近、
 * 手匹配且方向匹配的那一块。返回 -1 表示挥空。
 *
 * @param notes 所有未消除的活动方块。
 * @param swing 玩家本次输入。
 * @param window 判定窗口。
 */
export function findHitTarget(
  notes: Note[],
  swing: SwingInput,
  window: JudgeWindow = DEFAULT_JUDGE_WINDOW,
): number {
  let bestIndex = -1;
  let bestDelta = Infinity;

  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i];
    if (note.hand !== swing.hand) {
      continue;
    }
    const delta = Math.abs(swing.hitAt - note.time);
    if (delta > window.goodMs) {
      continue;
    }
    if (!isDirectionMatch(note.cut, swing.direction)) {
      continue;
    }
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }

  return bestIndex;
}
