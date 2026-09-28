import { expect, test, describe } from 'bun:test';
import { detectLanguage, htmlLang, applyDocumentLanguage } from '../language';

describe('detectLanguage', () => {
  test('browser language starting with zh (any case) resolves to zh', () => {
    expect(detectLanguage('zh-CN')).toBe('zh');
    expect(detectLanguage('ZH-tw')).toBe('zh');
  });

  test('non-zh, empty, or undefined browser language resolves to en', () => {
    expect(detectLanguage('ja-JP')).toBe('en');
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
  });
});

describe('htmlLang', () => {
  test('maps zh to zh-CN and en to en', () => {
    expect(htmlLang('zh')).toBe('zh-CN');
    expect(htmlLang('en')).toBe('en');
  });
});

describe('applyDocumentLanguage', () => {
  test('sets document.documentElement.lang without touching localStorage', () => {
    const originalDocument = globalThis.document;
    const originalLocalStorage = globalThis.localStorage;
    const documentStub = { documentElement: { lang: '' } };
    let localStorageCalls = 0;
    const localStorageStub = new Proxy(
      {},
      {
        get() {
          localStorageCalls += 1;
          return () => {};
        },
      },
    );
    // @ts-expect-error minimal test stub
    globalThis.document = documentStub;
    // @ts-expect-error minimal test stub
    globalThis.localStorage = localStorageStub;

    try {
      applyDocumentLanguage('zh');
      expect(documentStub.documentElement.lang).toBe('zh-CN');

      applyDocumentLanguage('en');
      expect(documentStub.documentElement.lang).toBe('en');

      expect(localStorageCalls).toBe(0);
    } finally {
      globalThis.document = originalDocument;
      globalThis.localStorage = originalLocalStorage;
    }
  });
});
