import type { CanvasLike } from '../diorama/materials';

export interface FakeCanvas extends CanvasLike {
  fillTextCalls: string[];
  fillStyleCalls: unknown[];
}

function fakeGradient(): { addColorStop: (offset: number, color: string) => void } {
  return { addColorStop: () => {} };
}

function fakeContext(fillTextCalls: string[], fillStyleCalls: unknown[]): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {};
  return new Proxy(state, {
    get(target, prop: string) {
      if (prop === 'fillText') return (text: string) => { fillTextCalls.push(text); };
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return fakeGradient;
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop: string, value) {
      if (prop === 'fillStyle') fillStyleCalls.push(value);
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

export function createFakeCanvas(): FakeCanvas {
  const fillTextCalls: string[] = [];
  const fillStyleCalls: unknown[] = [];
  const ctx = fakeContext(fillTextCalls, fillStyleCalls);
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    fillTextCalls,
    fillStyleCalls,
  };
}

export function createFakeCanvasFactory(): () => CanvasLike {
  return () => createFakeCanvas();
}
