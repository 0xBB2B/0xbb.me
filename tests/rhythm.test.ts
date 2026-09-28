import { expect, test, describe } from 'bun:test';
import {
  hazardOn,
  signalPhase,
  pedestrianPhase,
  nextDoorDelay,
  DOOR_OPEN_SECONDS,
  nextFlicker,
  plaqueGlow,
  PLAQUE_GLOW_PERIOD,
} from '../diorama/rhythm';

describe('hazardOn', () => {
  test('lit during the first half of the 0.9s cycle', () => {
    expect(hazardOn(0.1)).toBe(true);
    expect(hazardOn(0.449)).toBe(true);
  });

  test('dark during the second half of the cycle', () => {
    expect(hazardOn(0.45)).toBe(false);
    expect(hazardOn(0.5)).toBe(false);
  });

  test('wraps to lit again after a full cycle', () => {
    expect(hazardOn(0.95)).toBe(true);
  });
});

describe('signalPhase', () => {
  test('green for the first 8 seconds', () => {
    expect(signalPhase(3)).toBe('green');
  });

  test('yellow for seconds 8 to 10', () => {
    expect(signalPhase(8)).toBe('yellow');
    expect(signalPhase(9.9)).toBe('yellow');
  });

  test('red for the remaining seconds until the cycle repeats', () => {
    expect(signalPhase(10)).toBe('red');
    expect(signalPhase(15)).toBe('red');
  });

  test('wraps to green after the 20s cycle', () => {
    expect(signalPhase(23)).toBe('green');
  });
});

describe('pedestrianPhase', () => {
  test('main crossing goes during the tail of the red vehicle phase', () => {
    expect(pedestrianPhase(12).main).toBe('go');
  });

  test('main crossing blinks before turning stop', () => {
    expect(pedestrianPhase(17.5).main).toBe('blink');
  });

  test('main crossing stops while vehicle traffic has right of way', () => {
    expect(pedestrianPhase(3).main).toBe('stop');
  });

  test('side crossing goes at the start of the cycle', () => {
    expect(pedestrianPhase(3).side).toBe('go');
  });

  test('side crossing blinks before turning stop', () => {
    expect(pedestrianPhase(7).side).toBe('blink');
  });

  test('side crossing stops once the main crossing has right of way', () => {
    expect(pedestrianPhase(12).side).toBe('stop');
  });

  test('wraps to the same phase after a full 20s cycle', () => {
    expect(pedestrianPhase(32)).toEqual(pedestrianPhase(12));
    expect(pedestrianPhase(23)).toEqual(pedestrianPhase(3));
  });

  test('main crossing never gets go while vehicle signal is green or yellow', () => {
    for (let t = 0; t < 20; t += 0.1) {
      const signal = signalPhase(t);
      if (signal === 'green' || signal === 'yellow') {
        expect(pedestrianPhase(t).main).not.toBe('go');
      }
    }
  });

  test('main crossing go only happens while the vehicle signal is red', () => {
    for (let t = 0; t < 20; t += 0.1) {
      if (pedestrianPhase(t).main === 'go') {
        expect(signalPhase(t)).toBe('red');
      }
    }
  });
});

describe('nextDoorDelay', () => {
  test('shortest delay at random = 0', () => {
    expect(nextDoorDelay(0)).toBe(6);
  });

  test('longest delay at random = 1', () => {
    expect(nextDoorDelay(1)).toBe(11);
  });

  test('linear interpolation at the midpoint', () => {
    expect(nextDoorDelay(0.5)).toBe(8.5);
  });

  test('door stays open for a fixed duration', () => {
    expect(DOOR_OPEN_SECONDS).toBe(2.6);
  });
});

describe('nextFlicker', () => {
  test('shortest wait and duration at random = 0', () => {
    const flicker = nextFlicker(0, 0);
    expect(flicker.wait).toBeCloseTo(4, 5);
    expect(flicker.duration).toBeCloseTo(0.25, 5);
  });

  test('longest wait and duration at random = 1', () => {
    const flicker = nextFlicker(1, 1);
    expect(flicker.wait).toBeCloseTo(9, 5);
    expect(flicker.duration).toBeCloseTo(0.6, 5);
  });

  test('wait and duration interpolate independently at the midpoint', () => {
    const flicker = nextFlicker(0.5, 0.5);
    expect(flicker.wait).toBeCloseTo(6.5, 5);
    expect(flicker.duration).toBeCloseTo(0.425, 5);
  });
});

describe('plaqueGlow', () => {
  test('PLAQUE_GLOW_PERIOD is 2.4 seconds', () => {
    expect(PLAQUE_GLOW_PERIOD).toBe(2.4);
  });

  test('repeats every 2.4 seconds', () => {
    for (const t of [0, 0.5, 1.1, 2.0, 5.3]) {
      expect(Math.abs(plaqueGlow(t) - plaqueGlow(t + 2.4))).toBeLessThan(1e-9);
    }
  });

  test('stays above zero, swings by at least 0.3, tops out at 1, and never jumps between adjacent samples', () => {
    const samples: number[] = [];
    for (let i = 0; i < 240; i++) {
      samples.push(plaqueGlow((i / 240) * 2.4));
    }
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    expect(min).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(1);
    expect(max - min).toBeGreaterThanOrEqual(0.3);
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i] - samples[i - 1])).toBeLessThan(0.05);
    }
  });
});

describe('pedestrian signals blink for 1 to 2 seconds before turning red', () => {
  test('main crossing: go until 17, blink through 17.99, stop at 18', () => {
    expect(pedestrianPhase(16.99).main).toBe('go');
    expect(pedestrianPhase(17).main).toBe('blink');
    expect(pedestrianPhase(17.99).main).toBe('blink');
    expect(pedestrianPhase(18).main).toBe('stop');
  });

  test('side crossing: go until 6, blink through 7.99, stop at 8', () => {
    expect(pedestrianPhase(5.99).side).toBe('go');
    expect(pedestrianPhase(6).side).toBe('blink');
    expect(pedestrianPhase(7.99).side).toBe('blink');
    expect(pedestrianPhase(8).side).toBe('stop');
  });
});
