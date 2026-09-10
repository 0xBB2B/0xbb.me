import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Hud } from '../components/portfolio/Hud';
import { APP_DATA } from '../data';
import { createInput } from '../portfolio/input';
import { SCENE_COPY, LIGHTHOUSE_COPY } from '../portfolio/copy';
import { JOURNEY } from '../portfolio/journey';
import { createSession } from '../portfolio/state';

test('the chapter heading and lighthouse note both remain visible at the endpoint', () => {
  for (const language of ['en', 'zh'] as const) {
    const session = createSession();
    session.scene = 'gallery';
    session.language = language;
    session.atLighthouse = true;
    const html = renderToStaticMarkup(<Hud session={session} input={createInput()} graphics="ready" />);
    expect(html).toContain('town-intro scene-gallery');
    expect(html).toContain(SCENE_COPY.gallery[language].chapter);
    expect(html).toContain(SCENE_COPY.gallery[language].title);
    expect(html).toContain(LIGHTHOUSE_COPY[language].title);
  }
});

test('MC-2D is the single public style name across chapters and bilingual project reading', () => {
  for (const language of ['en', 'zh'] as const) {
    const project = APP_DATA.projects.find(item => item.id === '0xbb.me')!;
    expect(project.description[language]).toContain('MC-2D');
    for (const scene of JOURNEY) {
      const session = createSession();
      session.language = language;
      session.scene = scene.id;
      const html = renderToStaticMarkup(<Hud session={session} input={createInput()} graphics="ready" />);
      expect(html).toContain(`MC-2D · ${String(scene.order).padStart(2, '0')}`);
      expect(html).not.toMatch(/HD[-–‑ ]?2D|HD-MC/i);
    }
  }
});
