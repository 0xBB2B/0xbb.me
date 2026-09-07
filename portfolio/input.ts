import type { Direction } from './state';

const directions: Record<string, Direction> = { KeyA: -1, KeyD: 1, ArrowLeft: -1, ArrowRight: 1 };

export function createInput() {
  const held = new Map<string, Direction>();
  let paused = false;
  const clear = () => held.clear();
  const release = (source: string) => { held.delete(source); };
  const press = (source: string, direction: Direction) => {
    if (!paused) held.set(source, direction);
  };
  const keyDown = (event: KeyboardEvent) => {
    const direction = directions[event.code];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey ||
      (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
    if (paused) return;
    event.preventDefault();
    // A key held outside the window must not restart movement on focus return.
    if (!event.repeat) press(event.code, direction);
  };
  const keyUp = (event: KeyboardEvent) => release(event.code);
  const visibility = () => { if (document.hidden) clear(); };

  return {
    press, release, clear,
    direction: (): Direction => [...held.values()].at(-1) ?? 0,
    pause(value: boolean) { paused = value; clear(); },
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
