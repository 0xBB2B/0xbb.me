import '@fontsource/dela-gothic-one/400.css';
import '@fontsource/m-plus-rounded-1c/500.css';
import '@fontsource/m-plus-rounded-1c/800.css';
import { CANVAS_TEXT, FONT_D, FONT_R } from './textures';

export async function loadCanvasFonts(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`40px ${FONT_D}`, CANVAS_TEXT),
        document.fonts.load(`800 40px ${FONT_R}`, CANVAS_TEXT),
        document.fonts.load(`500 40px ${FONT_R}`, CANVAS_TEXT),
      ]),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch {}
}
