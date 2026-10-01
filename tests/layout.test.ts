import { expect, test, describe } from 'bun:test';
import { BASE_HALF, DEFAULT_CAMERA, ORBIT_LIMITS, CAR_CENTER, isOnLot, viewFov } from '../diorama/layout';

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
    expect(CAR_CENTER).toEqual([-1.95, 0.15, 1.15]);
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

describe('viewFov', () => {
  test('宽高比 1.6（1440x900）竖直视场角为 28 度', () => {
    expect(viewFov(1440, 900)).toBe(28);
  });

  test('宽高比 1.78（1920x1080）竖直视场角为 28 度', () => {
    expect(viewFov(1920, 1080)).toBe(28);
  });

  test('宽高比恰为 1.6（1600x1000）竖直视场角为 28 度', () => {
    expect(viewFov(1600, 1000)).toBe(28);
  });

  test('方屏（800x800）竖直视场角约 43.5 度，水平视野与宽屏 1.6 时一致', () => {
    expect(viewFov(800, 800)).toBeCloseTo(43.5, 0);
  });

  test('竖屏（390x844）竖直视场角约 81.6 度，水平视野与宽屏 1.6 时一致', () => {
    expect(viewFov(390, 844)).toBeCloseTo(81.6, 0);
  });

  test('宽高比越小，竖直视场角越大（单调不减）', () => {
    const aspects = [2, 1.78, 1.6, 1.33, 1, 0.75, 390 / 844];
    let prevFov = -Infinity;
    for (const aspect of aspects) {
      const fov = viewFov(1000, 1000 / aspect);
      expect(fov).toBeGreaterThanOrEqual(prevFov);
      prevFov = fov;
    }
  });
});

