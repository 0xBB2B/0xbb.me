import { expect, test } from 'bun:test';
import { createInput } from './input';
import { advance, createSession, openOverview } from './state';
import { ROAD } from './journey';

test('Shift sprint preserves normal walking, closed-door collision, reading pause and endpoint bounds', () => {
  const walk = createSession(), run = createSession();
  advance(walk, 1, 1);
  advance(run, 1, 1, true);
  expect(walk.x - ROAD.start).toBeCloseTo(3.2);
  expect(run.x - ROAD.start).toBeCloseTo(5.6);
  expect(walk.stride).toBeCloseTo(3.2 * 4.2);
  expect(run.stride).toBeCloseTo(5.6 * 2.6);
  const x = run.x;
  advance(run, 1, 1, false);
  expect(run.x - x).toBeCloseTo(3.2);
  advance(run, 1, 20, true);
  expect(run.x).toBe(19.35);
  openOverview(run);
  advance(run, 1, 1, true);
  expect(run.x).toBe(19.35);
  const end = createSession(); end.x = ROAD.end - .5;
  advance(end, 1, 1, true);
  expect(end.x).toBe(ROAD.end);
  expect(end.atLighthouse).toBe(true);
});

test('both Shift keys are held modifiers, cleared by pause and blur, and never accelerate pointer controls', () => {
  const globals = globalThis as unknown as Record<string, unknown>;
  const names = ['window', 'document', 'HTMLElement'];
  const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const windowTarget = new EventTarget(), documentTarget = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: windowTarget });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentTarget });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: class {} });
  const input = createInput(); const detach = input.attach();
  const key = (type: string, code: string, repeat = false) => windowTarget.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code, repeat }));
  try {
    key('keydown', 'ShiftLeft'); expect(input.sprinting()).toBe(false);
    key('keydown', 'KeyD'); expect(input.sprinting()).toBe(true);
    key('keydown', 'ShiftRight'); key('keyup', 'ShiftLeft'); expect(input.sprinting()).toBe(true);
    key('keyup', 'ShiftRight'); expect(input.sprinting()).toBe(false); expect(input.direction()).toBe(1);
    key('keydown', 'ShiftLeft'); input.press('pointer:1', -1); expect(input.sprinting()).toBe(false);
    input.release('pointer:1'); expect(input.sprinting()).toBe(true);
    windowTarget.dispatchEvent(new Event('blur')); expect(input.direction()).toBe(0); expect(input.sprinting()).toBe(false);
    key('keydown', 'ShiftLeft', true); key('keydown', 'KeyD'); expect(input.sprinting()).toBe(false);
    key('keydown', 'ShiftLeft'); input.pause(true); input.pause(false);
    key('keydown', 'KeyD'); expect(input.sprinting()).toBe(false);
    key('keydown', 'ShiftRight'); expect(input.sprinting()).toBe(true);
    detach(); expect(input.direction()).toBe(0); expect(input.sprinting()).toBe(false);
  } finally {
    detach();
    names.forEach((name, index) => { const descriptor = previous[index]; if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globals[name]; });
  }
});
