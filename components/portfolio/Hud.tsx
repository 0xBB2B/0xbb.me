import { useEffect, useReducer, type PointerEvent } from 'react';
import { APP_DATA } from '../../data';
import { UI_COPY } from '../../portfolio/copy';
import type { TownInput } from '../../portfolio/input';
import {
  closeReader, openDialogue, openOverview, setDialoguePage, setLanguage,
  subscribeSession, type Session,
} from '../../portfolio/state';
import { Dialogue } from './Dialogue';
import { Overview } from './Overview';

export type GraphicsState = 'loading' | 'ready' | 'unavailable';

export function Hud({ session, input, graphics }: {
  session: Session;
  input: TownInput;
  graphics: GraphicsState;
}) {
  const [, rerender] = useReducer(value => value + 1, 0);
  const language = session.language;
  const isEnglish = language === 'en';
  const text = UI_COPY[language];

  useEffect(() => subscribeSession(session, rerender), [session]);
  useEffect(() => {
    input.setInteract(() => {
      if (openDialogue(session)) input.pause(true);
    });
    input.setCancel(() => {
      if (!session.reader) return;
      closeReader(session);
      input.pause(false);
    });
    return () => {
      input.setInteract(() => {});
      input.setCancel(() => {});
    };
  }, [session, input]);
  useEffect(() => { document.documentElement.lang = isEnglish ? 'en' : 'zh-CN'; }, [isEnglish]);

  const toggleLanguage = () => setLanguage(session, isEnglish ? 'zh' : 'en');
  const showOverview = () => {
    if (openOverview(session)) input.pause(true);
  };
  const dismissReader = () => {
    closeReader(session);
    input.pause(false);
  };
  const endPointer = (event: PointerEvent<HTMLButtonElement>) => input.release(`pointer:${event.pointerId}`);

  return <>
    {graphics === 'loading' && <p className="graphics-status graphics-loading" role="status">
      {text.graphicsLoading}
    </p>}
    <header className="town-header">
      <a className="wordmark" href="./" aria-label="FUBUKI_BB home"><span className="brand-mark" aria-hidden="true">f.</span>{APP_DATA.profile.name}</a>
      <span className="header-note">{APP_DATA.profile.roles[language][0]} &amp; {APP_DATA.profile.roles[language][2]}</span>
      <nav aria-label={isEnglish ? 'Portfolio' : '个人主页'}>
        {!session.reader && <>
          <button className="language-button" aria-label={isEnglish ? 'Language' : '语言'} onClick={toggleLanguage}>
            <span aria-hidden="true">◎</span> {isEnglish ? 'EN / 中' : '中 / EN'}
          </button>
          <button className="overview-button" aria-label={text.overview} onClick={showOverview}>
            {text.overview} <span aria-hidden="true">↗</span>
          </button>
        </>}
      </nav>
    </header>
    <section className="town-intro" aria-label={text.town}>
      <p className="eyebrow">{text.chapter}</p>
      <h1>{text.title}</h1>
      <p className="intro-caption">{text.welcome}</p>
      <p className="character-preview-note">{text.preview}</p>
    </section>
    {session.nearbyNpc && !session.reader && <button className="talk-prompt" onClick={() => {
      if (openDialogue(session)) input.pause(true);
    }} aria-label={text.talk}><kbd>E</kbd> {text.talk}</button>}
    <footer className="town-footer">
      <div className="movement-controls" aria-label={isEnglish ? 'Walking controls' : '行走控制'}>
        {([-1, 1] as const).map(direction => <button key={direction} className="direction-button"
          disabled={graphics !== 'ready'} aria-label={direction === -1 ? text.left : text.right}
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            input.press(`pointer:${event.pointerId}`, direction);
          }}
          onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={endPointer}
          onContextMenu={event => event.preventDefault()}>{direction === -1 ? '←' : '→'}</button>)}
        <div className="walk-help"><span className="keyboard-help">{text.keyboard}</span><span>{text.walk}</span></div>
      </div>
      <div className="place-label"><span className="place-dot" /><div><b aria-label="Current scene">{text.town}</b><span>HD–2D · 01</span></div></div>
    </footer>
    <Dialogue open={session.reader === 'dialogue'} language={language} page={session.dialoguePage}
      onLanguage={toggleLanguage} onPage={page => setDialoguePage(session, page)} onClose={dismissReader} />
    <Overview open={session.reader === 'overview' || graphics === 'unavailable'} language={language}
      persistent={graphics === 'unavailable'} fault={graphics === 'unavailable' ? text.graphicsUnavailable : undefined}
      onLanguage={toggleLanguage} onClose={dismissReader} />
  </>;
}
