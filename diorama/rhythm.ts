export function hazardOn(t: number): boolean {
  return t % 0.9 < 0.45;
}

export type SignalPhase = 'green' | 'yellow' | 'red';

export function signalPhase(t: number): SignalPhase {
  const c = t % 20;
  if (c < 8) return 'green';
  if (c < 10) return 'yellow';
  return 'red';
}

export type PedestrianLight = 'go' | 'blink' | 'stop';

export interface PedestrianPhase {
  main: PedestrianLight;
  side: PedestrianLight;
}

export function pedestrianPhase(t: number): PedestrianPhase {
  const c = t % 20;
  const main: PedestrianLight = c >= 11 && c < 17 ? 'go' : c >= 17 && c < 18 ? 'blink' : 'stop';
  const side: PedestrianLight = c < 6 ? 'go' : c < 8 ? 'blink' : 'stop';
  return { main, side };
}

export function nextDoorDelay(random: number): number {
  return 6 + 5 * random;
}

export const DOOR_OPEN_SECONDS = 2.6;

export interface Flicker {
  wait: number;
  duration: number;
}

export function nextFlicker(waitRandom: number, durationRandom: number): Flicker {
  return { wait: 4 + 5 * waitRandom, duration: 0.25 + 0.35 * durationRandom };
}

export const PLAQUE_GLOW_PERIOD = 2.4;

export function plaqueGlow(t: number): number {
  const floor = 0.1;
  const peak = 1;
  const mid = (floor + peak) / 2;
  const amplitude = (peak - floor) / 2;
  return mid + amplitude * Math.cos((t / PLAQUE_GLOW_PERIOD) * Math.PI * 2);
}
