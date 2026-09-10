import type { Language } from '../../data';
import { UI_COPY } from '../../portfolio/copy';
import { NPC_SURPRISE_SECONDS, NPC_TYPING_SECONDS } from '../../portfolio/npc-reaction';
import './NpcReaction.css';

export function NpcReaction({ elapsed, language }: { elapsed: number; language: Language }) {
  const copy = UI_COPY[language];
  const surprise = elapsed < NPC_SURPRISE_SECONDS;
  const progress = Math.min(1, Math.max(0, (elapsed - NPC_SURPRISE_SECONDS) / NPC_TYPING_SECONDS));
  const characters = Array.from(copy.outfitCompliment);
  const typed = characters.slice(0, Math.ceil(characters.length * progress)).join('');
  return <aside className={`npc-reaction ${surprise ? 'npc-surprise' : 'npc-compliment'}`}
    data-interaction-id="greeter" data-reaction-stage={surprise ? 'surprise' : progress < 1 ? 'typing' : 'complete'}>
    <span className="reaction-announcement" role="status" aria-live="polite">{surprise ? copy.npcSurprised : progress >= 1 ? copy.outfitCompliment : ''}</span>
    <span className="reaction-visible" aria-hidden="true">{surprise ? '!' : typed}{!surprise && progress < 1 && <span className="reaction-caret">▏</span>}</span>
  </aside>;
}
