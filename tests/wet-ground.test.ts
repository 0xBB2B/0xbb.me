import { expect, test, describe } from 'bun:test';
import * as THREE from 'three';
import { setCanvasFactory } from '../diorama/materials';
import { createFakeCanvasFactory } from './fake-canvas';
import { runBrowser } from './browser';

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

  function evaluateBias(pud: number, texHeight: number): number {
    const smear = 0.09 + (0.005 - 0.09) * pud;
    const js = biasExpression()
      .replace(/float\(textureSize\(tDiffuse,\s*0\)\.y\)/g, 'texHeight')
      .replace(/\blog2\(/g, 'Math.log2(')
      .replace(/\bmax\(/g, 'Math.max(');
    return new Function('smear', 'pud', 'texHeight', `return ${js};`)(smear, pud, texHeight);
  }

  test('puddles get zero bias at every reflection height the high tier can produce', () => {
    for (const texHeight of [300, 450, 900, 1080, 1440]) {
      expect(evaluateBias(1, texHeight)).toBe(0);
    }
  });

  test('open wet road gets a larger bias than a puddle at the same reflection height', () => {
    expect(evaluateBias(0, 900)).toBeGreaterThan(evaluateBias(1, 900));
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

describe('ground puddles are identical on every device', () => {
  const scene = new THREE.Scene();
  createWetGround(scene, 1024, 768, 2);
  const groundShaders = [
    ...new Set(
      (() => {
        const found: string[] = [];
        scene.traverse((obj) => {
          const material = (obj as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
          if (material?.fragmentShader?.includes('vnoise(p*.28)')) found.push(material.fragmentShader);
        });
        return found;
      })(),
    ),
  ];

  test('the reflection layer and the ripple layer are both found', () => {
    expect(groundShaders.length).toBe(2);
  });

  test('neither ground shader uses sin for the random function', () => {
    for (const shader of groundShaders) expect(shader).not.toMatch(/\bsin\s*\(/);
  });

  test('both ground shaders use the integer multiply and xor hash constants', () => {
    for (const shader of groundShaders) {
      for (const constant of ['4104', '4152', '1597334673', '3812015801']) expect(shader).toContain(constant);
      expect(shader).toContain('^');
    }
  });

  const SIZE = 400;
  const HALF = 12;
  const M = 1597334673;
  const K = 3812015801;

  function hash(x: number, y: number): number {
    const a = (Math.floor(x) + 4104) | 0;
    const b = (Math.floor(y) + 4152) | 0;
    return (Math.imul(Math.imul(a, M) ^ Math.imul(b, K), M) >>> 0) / 4294967296;
  }

  function vnoise(px: number, py: number): number {
    const ix = Math.floor(px);
    const iy = Math.floor(py);
    const fx = px - ix;
    const fy = py - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const mix = (a: number, b: number, t: number) => a + (b - a) * t;
    return mix(mix(hash(ix, iy), hash(ix + 1, iy), ux), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux), uy);
  }

  function isPuddle(x: number, y: number): boolean {
    return vnoise(x * 0.28, y * 0.28) * 0.6 + vnoise(x * 0.9, y * 0.9) * 0.3 + vnoise(x * 3.1, y * 3.1) * 0.1 > 0.655;
  }

  function referenceMask(): string {
    let mask = '';
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const x = -HALF + ((col + 0.5) * 2 * HALF) / SIZE;
        const y = -HALF + ((row + 0.5) * 2 * HALF) / SIZE;
        mask += isPuddle(x, y) ? '1' : '0';
      }
    }
    return mask;
  }

  function renderMask(preamble: string, puddleLines: string, size: number, half: number): { error?: string; mask?: string } {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true })!;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : (gl.getShaderInfoLog(shader) ?? 'compile failed');
    };
    const vertex = compile(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }');
    const fragment = compile(
      gl.FRAGMENT_SHADER,
      `#version 300 es\nprecision highp float; precision highp int;\n${preamble}\nout vec4 o;\nvoid main(){ vec2 p=vec2(-${half}.)+gl_FragCoord.xy*(${2 * half}./${size}.);\n${puddleLines}\no=vec4(pud>.5?1.:0.,0.,0.,1.); }`,
    );
    if (typeof vertex === 'string') return { error: vertex };
    if (typeof fragment === 'string') return { error: fragment };
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return { error: gl.getProgramInfoLog(program) ?? 'link failed' };
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, size, size);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const pixels = new Uint8Array(size * size * 4);
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let mask = '';
    for (let i = 0; i < pixels.length; i += 4) mask += pixels[i] > 127 ? '1' : '0';
    return { mask };
  }

  function shaderParts(shader: string): { preamble: string; puddleLines: string } {
    const start = shader.indexOf('float hash(');
    const end = shader.indexOf('vec3 ripples(');
    const puddleLines = shader.match(/float n=[^;]*;\s*float pud=[^;]*;/)?.[0] ?? '';
    return { preamble: shader.slice(start, end), puddleLines };
  }

  const reference = referenceMask();

  test('the reference puddle map covers 15.7% of the 24x24 base within one percentage point', () => {
    const covered = [...reference].filter((c) => c === '1').length / reference.length;
    expect(Math.abs(covered - 0.157)).toBeLessThanOrEqual(0.01);
  });

  test('each ground shader draws the same puddles as the integer hash reference on at least 99% of pixels', async () => {
    for (const shader of groundShaders) {
      const { preamble, puddleLines } = shaderParts(shader);
      expect(puddleLines).not.toBe('');
      const result = await runBrowser<{ error?: string; mask?: string }>(`
        const outcome = await js(${JSON.stringify(`(${renderMask.toString()})(${JSON.stringify(preamble)}, ${JSON.stringify(puddleLines)}, ${SIZE}, ${HALF})`)});
        cliLog('PLAYABLE_TOWN_RESULT:' + JSON.stringify(outcome));
      `);
      expect(result.error).toBeUndefined();
      let same = 0;
      for (let i = 0; i < reference.length; i++) if (result.mask![i] === reference[i]) same++;
      expect(same / reference.length).toBeGreaterThanOrEqual(0.99);
    }
  }, 60_000);
});
