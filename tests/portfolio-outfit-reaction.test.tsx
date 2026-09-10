import { expect, test } from 'bun:test';
import { advance, cancelNpcReaction, closeReader, createSession, GREETER_X, openDialogue, openOverview, updateProximity } from '../portfolio/state';
import { renderToStaticMarkup } from 'react-dom/server';
import { NpcReaction } from '../components/portfolio/NpcReaction';
import { UI_COPY } from '../portfolio/copy';

test('the exclamation lasts one second before bilingual typewriter text and a complete reading hold', () => {
  for (const language of ['en', 'zh'] as const) {
    const render = (elapsed: number) => renderToStaticMarkup(<NpcReaction elapsed={elapsed} language={language} />);
    expect(render(.99)).toContain('data-reaction-stage="surprise"');
    expect(render(.99)).not.toContain(UI_COPY[language].outfitCompliment);
    expect(render(1)).toContain('data-reaction-stage="typing"');
    expect(render(1.5)).not.toContain(UI_COPY[language].outfitCompliment);
    expect(render(2.21)).toContain(UI_COPY[language].outfitCompliment);
    expect(render(2.21)).toContain('data-reaction-stage="complete"');
  }
});

test('the reaction uses elapsed time and graphics failure can unblock the complete profile', () => {
  const session = dressedVisitor(); openDialogue(session);
  advance(session, 0, .05, false, 1);
  expect(session.npcReaction!.elapsed).toBe(1);
  cancelNpcReaction(session);
  expect(openOverview(session)).toBe(true);
  expect(session.outfitComplimentSeen).toBe(true);
});

function dressedVisitor() {
  const session = createSession(); session.x = GREETER_X; session.appearance = 'dress'; updateProximity(session); return session;
}

test('the dressed visitor first gets a locked outfit reaction, then normal dialogue for the rest of this visit', () => {
  const session = dressedVisitor();
  expect(openDialogue(session)).toBe(true);
  expect(session.reader).toBeNull();
  expect(session.paused).toBe(true);
  expect(openDialogue(session)).toBe(false);
  expect(openOverview(session)).toBe(false);
  advance(session, 1, .99, true);
  expect(session.reader).toBeNull(); expect(session.x).toBe(GREETER_X);
  advance(session, 1, 1.21, true);
  expect(session.paused).toBe(true); expect(openDialogue(session)).toBe(false);
  advance(session, 1, 1.21, true);
  expect(session.paused).toBe(false); expect(session.x).toBe(GREETER_X);
  expect(openDialogue(session)).toBe(true); expect(session.reader).toBe('dialogue');
  closeReader(session);
  expect(openDialogue(session)).toBe(true); expect(session.reader).toBe('dialogue');
  const refreshed = dressedVisitor(); openDialogue(refreshed); expect(refreshed.reader).toBeNull();
});

test('normal clothes and out-of-range input do not consume the outfit surprise', () => {
  const session = createSession(); session.x = GREETER_X; updateProximity(session);
  openDialogue(session); expect(session.reader).toBe('dialogue'); closeReader(session);
  session.appearance = 'dress'; session.x = GREETER_X + 3; updateProximity(session);
  expect(openDialogue(session)).toBe(false);
  session.x = GREETER_X; updateProximity(session);
  openDialogue(session); expect(session.reader).toBeNull();
});
