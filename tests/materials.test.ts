import { expect, test } from 'bun:test';
import { Color } from 'three';
import { ctex, setCanvasFactory, toon } from '../diorama/materials';

test('the materials module imports without a DOM and draws textures through an injected canvas', () => {
  expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
  let drawn = false;
  setCanvasFactory(() => ({ width: 0, height: 0, getContext: () => ({}) }) as unknown as HTMLCanvasElement);
  const texture = ctex(16, 8, () => { drawn = true; });
  expect(drawn).toBe(true);
  expect(texture.image.width).toBe(16);
  expect(texture.image.height).toBe(8);
});

test('toon materials created from different Color objects are not shared through the cache', () => {
  const red = toon(new Color('#ff0000'));
  const blue = toon(new Color('#0000ff'));
  expect(red).not.toBe(blue);
  expect(red.color.getHexString()).toBe('ff0000');
  expect(blue.color.getHexString()).toBe('0000ff');
});
