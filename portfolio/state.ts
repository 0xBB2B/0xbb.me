import type { Language } from '../data';

export type Direction = -1 | 0 | 1;
export type Reader = 'dialogue' | 'overview' | null;
export const ROAD = { start: -8, end: 18 };
export const GREETER_X = 2;
export const INTERACTION_DISTANCE = 1.8;

type Listener = () => void;

export function createSession() {
  return {
    x: ROAD.start,
    facing: 1 as -1 | 1,
    walking: false,
    stride: 0,
    paused: false,
    language: 'en' as Language,
    reader: null as Reader,
    dialoguePage: 0,
    nearbyNpc: false,
    listeners: new Set<Listener>(),
  };
}
export type Session = ReturnType<typeof createSession>;

export function subscribeSession(session: Session, listener: Listener) {
  session.listeners.add(listener);
  return () => { session.listeners.delete(listener); };
}

function notify(session: Session) {
  session.listeners.forEach(listener => listener());
}

export function setLanguage(session: Session, language: Language) {
  if (session.language === language) return;
  session.language = language;
  notify(session);
}

export function openOverview(session: Session) {
  if (session.reader) return false;
  session.reader = 'overview';
  session.paused = true;
  notify(session);
  return true;
}

export function openDialogue(session: Session) {
  if (session.reader || !session.nearbyNpc) return false;
  session.reader = 'dialogue';
  session.dialoguePage = 0;
  session.paused = true;
  notify(session);
  return true;
}

export function setDialoguePage(session: Session, page: number) {
  if (session.reader !== 'dialogue') return;
  session.dialoguePage = Math.max(0, Math.min(2, page));
  notify(session);
}

export function closeReader(session: Session) {
  if (!session.reader) return;
  session.reader = null;
  session.dialoguePage = 0;
  session.paused = false;
  session.walking = false;
  notify(session);
}

export function updateProximity(session: Session) {
  const nearby = Math.abs(session.x - GREETER_X) <= INTERACTION_DISTANCE;
  if (nearby === session.nearbyNpc) return;
  session.nearbyNpc = nearby;
  notify(session);
}

export function advance(session: Session, direction: Direction, seconds: number) {
  const previous = session.x;
  if (!session.paused && direction) {
    session.facing = direction;
    session.x = Math.max(ROAD.start, Math.min(ROAD.end, previous + direction * 3.2 * seconds));
  }
  session.walking = session.x !== previous;
  session.stride = session.walking ? session.stride + Math.abs(session.x - previous) * 4.2 : 0;
  updateProximity(session);
}
