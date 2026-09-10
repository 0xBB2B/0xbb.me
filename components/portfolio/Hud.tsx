import { useEffect, useReducer, type PointerEvent } from 'react';
import { APP_DATA } from '../../data';
import { LIGHTHOUSE_COPY, SCENE_COPY, UI_COPY } from '../../portfolio/copy';
import { boardById, JOURNEY } from '../../portfolio/journey';
import type { TownInput } from '../../portfolio/input';
import {
  closeReader, cycleAppearance, jump, openBoard, openDialogue, openNearbyDoor, openOverview, setDialoguePage, setLanguage,
  subscribeSession, type Session,
} from '../../portfolio/state';
import { BoardDetails } from './BoardDetails';
import { Boards } from './Boards';
import { Dialogue } from './Dialogue';
import { Overview } from './Overview';
import { NpcReaction } from './NpcReaction';

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
  const scene = JOURNEY.find(item => item.id === session.scene)!;
  const ending = graphics === 'ready' && session.atLighthouse;
  const changingAppearance = !!session.appearanceTransition;
  const npcReacting = !!session.npcReaction;
  const appearanceLabel = { black: text.appearanceBlack, dress: text.appearanceDress }[session.appearance];
  const sceneText = SCENE_COPY[session.scene][language];
  const nearbyBoard = session.nearbyBoard ? boardById(session.nearbyBoard) : null;

  useEffect(() => subscribeSession(session, rerender), [session]);
  useEffect(() => {
    input.setJump(() => { jump(session); });
    input.setInteract(() => {
      if (openNearbyDoor(session) || openDialogue(session) || openBoard(session)) input.pause(true);
    });
    input.setCancel(() => {
      if (!session.reader) return;
      closeReader(session);
      input.pause(false);
    });
    return () => {
      input.setInteract(() => {});
      input.setCancel(() => {});
      input.setJump(() => {});
    };
  }, [session, input]);
  useEffect(() => { document.documentElement.lang = isEnglish ? 'en' : 'zh-CN'; }, [isEnglish]);
  useEffect(() => { input.pause(graphics !== 'ready' || !!session.reader || !!session.openingDoor || changingAppearance || npcReacting); }, [graphics, session.reader, session.openingDoor, changingAppearance, npcReacting, input]);

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
    {graphics === 'unavailable' && !session.reader && <p className="graphics-status" role="alert">{text.graphicsUnavailable}</p>}
    <header className={`town-header scene-${session.scene}`}>
      <a className="wordmark" href="./" aria-label="FUBUKI_BB home"><span className="brand-mark" aria-hidden="true">f.</span>{APP_DATA.profile.name}</a>
      <span className="header-note">{APP_DATA.profile.roles[language][0]} &amp; {APP_DATA.profile.roles[language][2]}</span>
      <nav aria-label={isEnglish ? 'Portfolio' : '个人主页'}>
        {!session.reader && <>
          <button className="language-button" aria-label={isEnglish ? 'Language' : '语言'} onClick={toggleLanguage}>
            <span aria-hidden="true">◎</span> {isEnglish ? 'EN / 中' : '中 / EN'}
          </button>
          <button className="overview-button" aria-label={text.overview} disabled={!!session.openingDoor || changingAppearance || npcReacting} onClick={showOverview}>
            {text.overview} <span aria-hidden="true">↗</span>
          </button>
        </>}
      </nav>
    </header>
    <section className={`town-intro scene-${session.scene}`} aria-label={scene.name[language]}>
      <p className="eyebrow">{sceneText.chapter}</p>
      <h1>{sceneText.title}</h1>
      <p className="intro-caption">{sceneText.welcome}</p>
    </section>
    {ending && !session.reader && <aside className="lighthouse-note" aria-label={language === 'en' ? 'A note by the lighthouse' : '灯塔旁的题记'}>
      <p className="eyebrow">{LIGHTHOUSE_COPY[language].chapter}</p>
      <h2>{LIGHTHOUSE_COPY[language].title}</h2>
      <p>{LIGHTHOUSE_COPY[language].welcome}</p>
    </aside>}
    {graphics === 'ready' && !session.reader && <Boards session={session} />}
    {graphics === 'ready' && (session.nearbyDoor || session.openingDoor) && !session.reader && <button
      className="talk-prompt door-prompt" data-door-id={session.nearbyDoor || session.openingDoor}
      data-interaction-id={session.nearbyDoor || session.openingDoor} disabled={!!session.openingDoor}
      aria-label={session.openingDoor ? text.openingDoor : session.scene === 'workshop' ? text.exitRoom : text.enterRoom}
      onClick={() => { if (openNearbyDoor(session)) input.pause(true); }}>
      <kbd>E</kbd> {session.openingDoor ? text.openingDoor : session.scene === 'workshop' ? text.exitRoom : text.enterRoom}
    </button>}
    {graphics === 'ready' && session.nearbyNpc && !session.reader && !session.openingDoor && !npcReacting && <button className="talk-prompt" data-interaction-id={session.nearbyNpc} onClick={() => {
      if (openDialogue(session)) input.pause(true);
    }} aria-label={text.talk}><kbd>E</kbd> {text.talk}</button>}
    {graphics === 'ready' && nearbyBoard && !session.reader && !session.nearbyDoor && !session.openingDoor && <button className={`talk-prompt board-prompt ${nearbyBoard.kind === 'project' ? 'star-prompt' : ''}`}
      data-interaction-id={nearbyBoard.id} onClick={() => {
        if (openBoard(session)) input.pause(true);
      }} aria-label={text.view}>
      {nearbyBoard.kind === 'project' && <strong>{nearbyBoard.title[language]}</strong>}
      <span><kbd>E</kbd> {text.view}</span>
    </button>}
    {graphics === 'ready' && session.npcReaction && <NpcReaction elapsed={session.npcReaction.elapsed} language={language} />}
    {ending && !session.reader && <button className="avatar-switch"
      aria-label={text.changeCharacter} aria-description={appearanceLabel} disabled={changingAppearance}
      onClick={() => { if (cycleAppearance(session)) input.pause(true); }}>
      <span aria-hidden="true">⇄</span> {changingAppearance ? text.changingCharacter : text.changeCharacter}
    </button>}
    <footer className="town-footer">
      <div className="movement-controls" aria-label={isEnglish ? 'Walking controls' : '行走控制'}>
        {([-1, 1] as const).map(direction => <button key={direction} className="direction-button"
          disabled={graphics !== 'ready' || changingAppearance || npcReacting} aria-label={direction === -1 ? text.left : text.right}
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
      <div className="place-label"><span className="place-dot" /><div><b aria-label="Current scene">{scene.name[language]}</b><span>MC-2D · {String(scene.order).padStart(2, '0')}</span></div></div>
    </footer>
    <Dialogue open={session.reader === 'dialogue'} npc={session.dialogueNpc} language={language} page={session.dialoguePage}
      onPage={page => setDialoguePage(session, page)} onClose={dismissReader} />
    <BoardDetails open={session.reader === 'board'} boardId={session.boardId} language={language}
      onClose={dismissReader} />
    <Overview open={session.reader === 'overview'} language={language}
      fault={graphics === 'unavailable' ? text.graphicsUnavailable : undefined}
      onClose={dismissReader} />
  </>;
}
