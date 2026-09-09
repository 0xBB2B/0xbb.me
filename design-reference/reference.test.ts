import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const expectedHash = '93112c75b439d72949250c21da06d5a6ff86be5e7211ed1ee09eb17575747a8f';
const source = new URL('../public/profile-full.png', import.meta.url);
const reference = new URL('./profile-full.png', import.meta.url);

function pngFacts(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  };
}

describe('site-entry/AC-5: the confirmed profile artwork is permitted in HTML reading, never as a character texture', () => {
  test('the published portrait and preserved design reference have the original unchanged bytes', () => {
    expect(existsSync(source)).toBe(true);
    expect(existsSync(reference)).toBe(true);
    const bytes = readFileSync(reference);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHash);
    expect(createHash('sha256').update(readFileSync(source)).digest('hex')).toBe(expectedHash);
    expect(pngFacts(bytes)).toEqual({ width: 1696, height: 2528, bitDepth: 8, colorType: 2 });
  });
});
