import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createFakeCanvasFactory } from './fake-canvas';

setCanvasFactory(createFakeCanvasFactory());

import { WET_SHADER, createWetGround } from '../diorama/wet-ground';

const src = WET_SHADER.fragmentShader;

function projCallArgs(): string[] {
  const start = src.indexOf('texture2DProj(tDiffuse');
  if (start < 0) return [];
  let depth = 0;
  const args: string[] = [];
  let current = '';
  for (let i = src.indexOf('(', start); i < src.length; i++) {
    const ch = src[i];
    if (ch === '(') {
      depth++;
      if (depth === 1) continue;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        args.push(current.trim());
        break;
      }
    } else if (ch === ',' && depth === 1) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  return args;
}

function biasExpression(): string {
  const bias = projCallArgs()[2] ?? '';
  const definition = src.match(new RegExp(`float\\s+${bias}\\s*=([^;]*);`));
  return definition && /^\w+$/.test(bias) ? definition[1] : bias;
}

describe('wet ground reflection blur has no per-pixel jitter', () => {
  test('the fragment shader never reads gl_FragCoord', () => {
    expect(src).not.toContain('gl_FragCoord');
  });
});

describe('wet ground reflection blur picks a smaller mip level for longer streaks', () => {
  test('the reflection sample passes a third LOD bias argument', () => {
    expect(projCallArgs().length).toBe(3);
  });

  test('the bias depends on smear so longer streaks sample smaller mips', () => {
    expect(biasExpression()).toContain('smear');
  });

  test('the bias is clamped at zero so puddles fall back to the full-size reflection', () => {
    expect(biasExpression()).toMatch(/max\(.*,\s*0\.0*\s*\)/);
  });

  test('puddles keep the shortest streak', () => {
    expect(src).toContain('smear=mix(.09,.005,pud)');
  });
});

describe('wet ground reflection render targets carry mipmaps', () => {
  function reflectorTargets(scene: THREE.Scene): THREE.WebGLRenderTarget[] {
    const targets: THREE.WebGLRenderTarget[] = [];
    scene.traverse((obj) => {
      const reflector = obj as unknown as { isReflector?: boolean; getRenderTarget(): THREE.WebGLRenderTarget };
      if (reflector.isReflector) targets.push(reflector.getRenderTarget());
    });
    return targets;
  }

  function expectMipmapped(targets: THREE.WebGLRenderTarget[]) {
    expect(targets.length).toBe(2);
    for (const target of targets) {
      expect(target.texture.generateMipmaps).toBe(true);
      expect(target.texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    }
  }

  test('both reflectors generate mipmaps with trilinear minification', () => {
    const scene = new THREE.Scene();
    createWetGround(scene, 1024, 768, 2);
    expectMipmapped(reflectorTargets(scene));
  });

  test('mipmaps survive a window resize', () => {
    const scene = new THREE.Scene();
    const handle = createWetGround(scene, 1024, 768, 2);
    handle.resize(800, 600, 1);
    expectMipmapped(reflectorTargets(scene));
  });
});
