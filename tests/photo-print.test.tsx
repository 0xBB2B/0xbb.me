import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhotoPrint, formatPrintDate } from '../components/PhotoPrint';
import type { Language } from '../data';

const decodeEntities = (html: string) =>
  html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');

function renderPhotoPrint(language: Language): string {
  return decodeEntities(
    renderToStaticMarkup(createElement(PhotoPrint, { language, onClose: () => {} })),
  );
}

const TEXT = {
  zh: {
    closeHint: '点空白处或按 Esc 关闭',
    alt: 'FUBUKI_BB 的全身像',
    developing: '显影中…',
  },
  en: {
    closeHint: 'Tap outside or press Esc to close',
    alt: 'Full-length portrait of FUBUKI_BB',
    developing: 'DEVELOPING…',
  },
} as const;

describe('PhotoPrint：内容', () => {
  test.each(['zh', 'en'] as const)('%s：对话框语义、署名、图片、替代文字、关闭提示、加载中文字', (language) => {
    const html = renderPhotoPrint(language);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('FUBUKI_BB');
    expect(html).toContain('0xBB MART PHOTO · L');
    expect(html).toMatch(/<img[^>]*src="\.\/profile-full-print\.jpg"/);
    expect(html).toContain(`alt="${TEXT[language].alt}"`);
    expect(html).toContain(TEXT[language].closeHint);
    expect(html).toContain(TEXT[language].developing);
    expect(html).toContain('✕');
  });

  test('加载中状态不显示日期戳', () => {
    expect(renderPhotoPrint('zh')).not.toContain(formatPrintDate(new Date()));
  });
});

describe('formatPrintDate', () => {
  test("2026-09-30 -> '26 9 30", () => {
    expect(formatPrintDate(new Date(2026, 8, 30))).toBe("'26 9 30");
  });

  test("两位数月份 2027-12-05 -> '27 12 5", () => {
    expect(formatPrintDate(new Date(2027, 11, 5))).toBe("'27 12 5");
  });
});

function jpegWidth(bytes: Uint8Array): number {
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    expect(bytes[offset]).toBe(0xff);
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return (bytes[offset + 7] << 8) | bytes[offset + 8];
    offset += 2 + length;
  }
  throw new Error('JPEG 中没有 SOF 段');
}

describe('profile-full-print.jpg', () => {
  const path = new URL('../public/profile-full-print.jpg', import.meta.url).pathname;

  test('文件大小不超过 200KB', () => {
    expect(statSync(path).size).toBeLessThanOrEqual(200 * 1024);
  });

  test('宽度为 900 像素', () => {
    expect(jpegWidth(readFileSync(path))).toBe(900);
  });
});
