import type { Direction } from './state';

const directions: Record<string, Direction> = { KeyA: -1, KeyD: 1, ArrowLeft: -1, ArrowRight: 1 };

export function createInput() {
  const held = new Map<string, Direction>();
  const shiftKeys = new Set<string>();
  let paused = false;
  let interact: () => void = () => {};
  let cancel: () => void = () => {};
  const clear = () => { held.clear(); shiftKeys.clear(); };
  const release = (source: string) => { held.delete(source); };
  const press = (source: string, direction: Direction) => {
    if (!paused) held.set(source, direction);
  };
  const editableTarget = (event: KeyboardEvent) =>
    event.target instanceof HTMLElement && !!event.target.closest('input, textarea, select, [contenteditable="true"]');
  const keyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || editableTarget(event)) return;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      if (!paused && !event.repeat) shiftKeys.add(event.code);
      return;
    }
    if (event.code === 'KeyE') {
      if (!event.repeat) interact();
      return;
    }
    if (event.code === 'Escape') {
      if (!event.repeat) cancel();
      return;
    }
    const direction = directions[event.code];
    if (!direction || paused) return;
    event.preventDefault();
    // A key held outside the window must not restart movement on focus return.
    if (!event.repeat) {
      if (event.shiftKey) shiftKeys.add('ShiftHeld');
      press(event.code, direction);
    }
  };
  const keyUp = (event: KeyboardEvent) => {
    release(event.code);
    shiftKeys.delete(event.code);
    if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight') && !event.shiftKey) shiftKeys.delete('ShiftHeld');
  };
  const visibility = () => { if (document.hidden) clear(); };

  return {
    press, release, clear,
    direction: (): Direction => [...held.values()].at(-1) ?? 0,
    sprinting: () => {
      const source = [...held.keys()].at(-1);
      return !paused && shiftKeys.size > 0 && !!source && source in directions;
    },
    pause(value: boolean) { paused = value; clear(); },
    setInteract(handler: () => void) { interact = handler; },
    setCancel(handler: () => void) { cancel = handler; },
    attach() {
      window.addEventListener('keydown', keyDown);
      window.addEventListener('keyup', keyUp);
      window.addEventListener('blur', clear);
      document.addEventListener('visibilitychange', visibility);
      return () => {
        clear();
        window.removeEventListener('keydown', keyDown);
        window.removeEventListener('keyup', keyUp);
        window.removeEventListener('blur', clear);
        document.removeEventListener('visibilitychange', visibility);
      };
    },
  };
}
export type TownInput = ReturnType<typeof createInput>;
