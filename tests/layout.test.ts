import { expect, test, describe } from 'bun:test';
import { BASE_HALF, DEFAULT_CAMERA, ORBIT_LIMITS, CAR_CENTER, isOnLot, portraitDistanceScale } from '../diorama/layout';

describe('layout constants', () => {
  test('BASE_HALF is 13', () => {
    expect(BASE_HALF).toBe(13);
  });

  test('DEFAULT_CAMERA matches the fixed starting view', () => {
    expect(DEFAULT_CAMERA).toEqual({ position: [33, 23, 40], target: [0, -1.4, -0.5], fov: 28 });
  });

  test('ORBIT_LIMITS matches the fixed zoom and tilt range', () => {
    expect(ORBIT_LIMITS).toEqual({ minDistance: 16, maxDistance: 80, minPolarAngle: 0.2, maxPolarAngle: 1.4 });
  });

  test('CAR_CENTER is the fixed car position', () => {
    expect(CAR_CENTER).toEqual([-0.85, 0.15, 1.15]);
  });
});

describe('isOnLot', () => {
  test('inside the konbini lot (x<5, z<5) is on lot', () => {
    expect(isOnLot(0, 0)).toBe(true);
    expect(isOnLot(-10, -10)).toBe(true);
  });

  test('across the street (z>11) is on lot', () => {
    expect(isOnLot(0, 12)).toBe(true);
  });

  test('the far sidewalk strip (x>11, z<5) is on lot', () => {
    expect(isOnLot(12, -5)).toBe(true);
  });

  test('the open road area is not on lot', () => {
    expect(isOnLot(8, 8)).toBe(false);
    expect(isOnLot(8, -5)).toBe(false);
    expect(isOnLot(0, 8)).toBe(false);
  });

  test('boundary values exactly at the lot edges are excluded', () => {
    expect(isOnLot(5, 0)).toBe(false);
    expect(isOnLot(0, 5)).toBe(false);
    expect(isOnLot(0, 11)).toBe(false);
    expect(isOnLot(11, 0)).toBe(false);
  });
});

describe('portraitDistanceScale', () => {
  test('landscape viewport (width > height) has no extra scale', () => {
    expect(portraitDistanceScale(1440, 900)).toBe(1);
  });

  test('square viewport (width === height) has no extra scale', () => {
    expect(portraitDistanceScale(800, 800)).toBe(1);
  });

  test('portrait viewport scales by (height/width)^0.85', () => {
    expect(portraitDistanceScale(390, 780)).toBeCloseTo(Math.pow(780 / 390, 0.85), 2);
  });

  test('extreme portrait viewport is capped at 1.9', () => {
    expect(portraitDistanceScale(300, 1200)).toBe(1.9);
  });
});
