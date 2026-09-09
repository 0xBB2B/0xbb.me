import { createAvatarModel } from '../portfolio/avatar-models';
import { createBlackOutfitPlayerVoxel } from './player-voxel-black';

export const NPC_LINEUP = [
  { id: 'current', label: '初始主角 · 黑装', detail: '主角的默认造型' },
  { id: 'dress', label: 'A · 银发黑色长裙', detail: '灯塔旁可切换的主角造型' },
  { id: 'blonde', label: 'B · 金发浅色外套', detail: '已选定的迎宾 NPC' },
] as const;
export type NpcLineupId = typeof NPC_LINEUP[number]['id'];

export function createNpcLineupModel(id: NpcLineupId) {
  return id === 'current' ? createBlackOutfitPlayerVoxel() : createAvatarModel(id);
}
