import { expect, test, describe } from 'bun:test';
import { WET_SHADER } from '../diorama/wet-ground';

describe('wet ground reflection blur avoids per-cell banding artifacts', () => {
  test('the jitter hash is seeded from a modded gl_FragCoord and does not vary with uTime', () => {
    const src = WET_SHADER.fragmentShader;
    const call = src.match(/hash\(([^)]*gl_FragCoord[^)]*)\)/);
    expect(call).not.toBeNull();
    const args = call![1];
    expect(args).toContain('mod(gl_FragCoord');
    expect(args).not.toContain('uTime');
  });

  test('the jitter value actually shifts each blur sample offset', () => {
    const src = WET_SHADER.fragmentShader;
    const jitterName = src.match(/float\s+(\w+)\s*=\s*hash\(mod\(gl_FragCoord/)?.[1];
    expect(jitterName).toBeDefined();
    expect(src).toMatch(new RegExp(`u\\.y\\s*\\+=\\s*smear\\s*\\*\\s*\\([^;]*\\b${jitterName}\\b`));
  });
});
