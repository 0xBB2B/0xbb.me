export const NPC_SURPRISE_SECONDS = 1;
export const NPC_TYPING_SECONDS = 1.2;
export const NPC_REACTION_SECONDS = NPC_SURPRISE_SECONDS + NPC_TYPING_SECONDS + 1.2;

// Only the typing stage needs frequent UI updates; the exclamation and final reading hold are static.
export function npcReactionFrame(elapsed: number) {
  if (elapsed < NPC_SURPRISE_SECONDS) return -1;
  return Math.min(36, Math.floor((elapsed - NPC_SURPRISE_SECONDS) * 30));
}
