import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { rainSeeds, createRain, createSplashes } from '../diorama/weather';
import { ROOF_ZONES, isOnLot } from '../diorama/layout';

function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inZone(x: number, z: number, zone: (typeof ROOF_ZONES)[number]): boolean {
  return x >= zone.x0 && x <= zone.x1 && z >= zone.z0 && z <= zone.z1;
}

function inAnyRoofZone(x: number, z: number): boolean {
  return ROOF_ZONES.some((zone) => inZone(x, z, zone));
}

describe('rainSeeds', () => {
  const seeds = rainSeeds(5000, mulberry32(42));

  test('generates exactly the requested count', () => {
    expect(seeds.length).toBe(5000);
  });

  test('every drop falls above the base, within the 12.9 half-extent', () => {
    for (const seed of seeds) {
      expect(Math.abs(seed.x)).toBeLessThan(12.9);
      expect(Math.abs(seed.z)).toBeLessThan(12.9);
    }
  });

  test('every phase is within [0, 1)', () => {
    for (const seed of seeds) {
      expect(seed.phase).toBeGreaterThanOrEqual(0);
      expect(seed.phase).toBeLessThan(1);
    }
  });

  test('drops over the konbini roof land at that roof height', () => {
    const konbiniRoof = ROOF_ZONES.reduce((closest, zone) =>
      Math.abs(zone.y - 4.1) < Math.abs(closest.y - 4.1) ? zone : closest
    );
    const onKonbiniRoof = seeds.filter((seed) => inZone(seed.x, seed.z, konbiniRoof));

    expect(onKonbiniRoof.length).toBeGreaterThan(0);
    for (const seed of onKonbiniRoof) {
      expect(seed.floorY).toBe(konbiniRoof.y);
    }
  });

  test('drops on the lot or opposite sidewalk, outside any roof, land at 0.16', () => {
    const onLot = seeds.filter((seed) => isOnLot(seed.x, seed.z) && !inAnyRoofZone(seed.x, seed.z));

    expect(onLot.length).toBeGreaterThan(0);
    for (const seed of onLot) {
      expect(seed.floorY).toBe(0.16);
    }
  });

  test('drops on the open road land at ground level', () => {
    const onRoad = seeds.filter((seed) => !isOnLot(seed.x, seed.z) && !inAnyRoofZone(seed.x, seed.z));

    expect(onRoad.length).toBeGreaterThan(0);
    for (const seed of onRoad) {
      expect(seed.floorY).toBe(0.01);
    }
  });

  test('an empty request returns an empty list', () => {
    expect(rainSeeds(0, mulberry32(1))).toEqual([]);
  });
});

describe('roof landing heights and low-tier handles', () => {
  const random = (() => { let seed = 7; return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; })();
  const seeds = rainSeeds(20000, random);

  test('drops over the awning and the neighbour roof stop at those heights', () => {
    for (const zone of ROOF_ZONES) {
      const inside = seeds.filter((s) => s.x > zone.x0 && s.x < zone.x1 && s.z > zone.z0 && s.z < zone.z1);
      expect(inside.length).toBeGreaterThan(0);
      for (const s of inside) expect(s.floorY).toBe(zone.y);
    }
  });

  test('the default rain count is 3900 streaks', () => {
    const rain = createRain();
    expect(rain.mesh.geometry.getAttribute('position').count).toBe(3900 * 2);
  });

  test('the default splash count is 1100 drops', () => {
    const splashes = createSplashes(1);
    expect(splashes.mesh.geometry.getAttribute('position').count).toBe(1100);
  });

  test('the rain can be thinned to half for the low tier', () => {
    const rain = createRain(1000);
    rain.setVisibleRatio(0.5);
    const full = rain.mesh.geometry.getAttribute('position').count;
    expect(rain.mesh.geometry.drawRange.count).toBe(Math.round(full / 2));
    rain.setVisibleRatio(1);
    expect(rain.mesh.geometry.drawRange.count).toBe(full);
  });

  test('splash sprites follow a pixel ratio change', () => {
    const splashes = createSplashes(2, 10);
    splashes.setPixelRatio(1);
    expect((splashes.mesh.material as THREE.ShaderMaterial).uniforms.uPR.value).toBe(1);
  });
});
