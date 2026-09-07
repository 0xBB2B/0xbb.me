export type Direction = -1 | 0 | 1;
export const ROAD = { start: -8, end: 18 };

export function createSession() {
  return { x: ROAD.start, facing: 1 as -1 | 1, walking: false, stride: 0, paused: false };
}
export type Session = ReturnType<typeof createSession>;

export function advance(session: Session, direction: Direction, seconds: number) {
  const previous = session.x;
  if (!session.paused && direction) {
    session.facing = direction;
    session.x = Math.max(ROAD.start, Math.min(ROAD.end, previous + direction * 3.2 * seconds));
  }
  session.walking = session.x !== previous;
  session.stride = session.walking ? session.stride + Math.abs(session.x - previous) * 4.2 : 0;
}
