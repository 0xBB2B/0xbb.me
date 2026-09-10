import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { APP_DATA } from '../data';
import { npcPages, npcSpeaker, UI_COPY } from '../portfolio/copy';
import { Dialogue } from '../components/portfolio/Dialogue';
import { Overview } from '../components/portfolio/Overview';

const noop = () => {};

test('the resident greeter tells three world stories, not the protagonist biography', () => {
  expect(npcSpeaker('greeter', 'zh')).toBe('NPC · 迎宾者');
  expect(npcSpeaker('greeter', 'en')).toBe('NPC · GREETER');
  expect(UI_COPY.zh.dialogueLabel).toBe('世界观');
  expect(UI_COPY.en.dialogueLabel).toBe('World lore');
  for (const language of ['zh', 'en'] as const) {
    const pages = npcPages('greeter', language);
    expect(pages).toHaveLength(3);
    const text = pages.map(page => `${page.title}\n${page.body}`).join('\n');
    expect(text).not.toMatch(/FUBUKI_BB|Tokyo|Shanghai|全栈|系统架构师|AI Agent开发者|Full Stack|System Architect|AI Agent Developer|身份与地点|全栈与系统|AI 工作流|Identity & places|Full-stack systems|AI workflows/i);
    expect(text).toMatch(/小镇|town/i);
    expect(text).toMatch(/工厂|factory/i);
    expect(text).toMatch(/灯塔|lighthouse/i);
    for (const [page, content] of pages.entries()) {
      expect(content.body.split('\n\n')).toHaveLength(3);
      const html = renderToStaticMarkup(<Dialogue open npc="greeter" language={language} page={page} onPage={noop} onClose={noop} />);
      expect(html).toContain(npcSpeaker('greeter', language));
      expect(html).toContain(content.title);
      expect(html).not.toContain('FUBUKI_BB');
      expect(html).not.toContain('aria-label="Language"');
    }
  }
});

test('the protagonist profile keeps the confirmed AI Agent developer identity in both languages', () => {
  expect(APP_DATA.profile.roles.zh).toContain('AI Agent开发者');
  expect(APP_DATA.profile.roles.en).toContain('AI Agent Developer');
  for (const language of ['zh', 'en'] as const) {
    const html = renderToStaticMarkup(<Overview open language={language} onClose={noop} />);
    expect(html).toContain('FUBUKI_BB');
    expect(html).toContain(APP_DATA.profile.roles[language][2]);
    expect(html).toContain('Tokyo');
    expect(html).toContain('Shanghai');
  }
});
