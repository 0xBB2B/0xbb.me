import type { Judgement } from './types';
import { nextCombo, scoreFor } from './judge';

/**
 * GameStats 表示一局游戏的累计统计信息。
 *
 * 该结构故意保持纯数据，方便在 UI 与逻辑层之间无副作用地传递。
 */
export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  // 已切击的方块总数（包含 MISS）。
  total: number;
}

/**
 * createInitialStats 创建一份零值统计。
 */
export function createInitialStats(): GameStats {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    miss: 0,
    total: 0,
  };
}

/**
 * applyJudgement 在不修改原对象的前提下产出新统计。
 */
export function applyJudgement(stats: GameStats, judgement: Judgement): GameStats {
  const combo = nextCombo(stats.combo, judgement);
  const score = stats.score + scoreFor(judgement);
  const maxCombo = Math.max(stats.maxCombo, combo);

  return {
    score,
    combo,
    maxCombo,
    perfect: stats.perfect + (judgement === 'PERFECT' ? 1 : 0),
    good: stats.good + (judgement === 'GOOD' ? 1 : 0),
    miss: stats.miss + (judgement === 'MISS' ? 1 : 0),
    total: stats.total + 1,
  };
}

/**
 * accuracy 返回当前命中率（PERFECT 计 1，GOOD 计 0.5，MISS 计 0）。
 *
 * 当尚未发生任何切击时返回 1，避免 UI 上初始就显示 0%。
 */
export function accuracy(stats: GameStats): number {
  if (stats.total === 0) {
    return 1;
  }
  const weighted = stats.perfect * 1 + stats.good * 0.5;
  return weighted / stats.total;
}
