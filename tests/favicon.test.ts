import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { startHeadlessBrowser } from './headless-browser';

const svg = () => readFileSync(new URL('../favicon.svg', import.meta.url), 'utf8');

test('the favicon represents the MC-2D lighthouse with self-contained vector shapes and no flashing', () => {
  const source = svg();
  expect(source).toContain('viewBox="0 0 64 64"');
  expect(source).toContain('MC-2D');
  expect(source).toContain('id="lighthouse"');
  expect(source).toContain('id="sea"');
  expect(source).not.toMatch(/<\s*(?:script|image|animate|filter|foreignObject)\b|(?:href|src)\s*=|#ff00ff/i);
});

test('the production HTML points to the exact new SVG favicon', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const href = html.match(/<link\b[^>]*rel="icon"[^>]*href="([^"]+)"/)?.[1];
  expect(href).toMatch(/^\.\/assets\/favicon-[\w-]+\.svg$/);
  const built = readFileSync(new URL(`../dist/${href!.slice(2)}`, import.meta.url), 'utf8');
  expect(built).toBe(svg());
});

test('16px and 32px favicon renders retain a bright lighthouse, warm lamp and cyan sea', async () => {
  const browser = await startHeadlessBrowser();
  try {
    const result = await browser.evaluate<Array<{ size: number; light: number; warm: number; cyan: number }>>(`(async()=>{
      const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(${JSON.stringify(svg())});await image.decode();
      return [16,32].map(size=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const context=canvas.getContext('2d');context.drawImage(image,0,0,size,size);
        const pixels=context.getImageData(0,0,size,size).data;let light=0,warm=0,cyan=0;
        for(let i=0;i<pixels.length;i+=4){const [r,g,b,a]=pixels.slice(i,i+4);if(a<200)continue;if(r>180&&g>175&&b>160)light++;if(r>200&&g>140&&g<235&&b<160)warm++;if(g>135&&b>140&&r<120)cyan++;}
        return {size,light,warm,cyan};});
    })()`);
    expect(result).toHaveLength(2);
    for (const frame of result) {
      expect(frame.light, `${frame.size}px tower`).toBeGreaterThan(5);
      expect(frame.warm, `${frame.size}px lamp`).toBeGreaterThan(1);
      expect(frame.cyan, `${frame.size}px sea`).toBeGreaterThan(5);
    }
  } finally { await browser.close(); }
});
