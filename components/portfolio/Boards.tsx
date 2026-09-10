import { BOARDS } from '../../portfolio/journey';
import type { Session } from '../../portfolio/state';
import './Boards.css';

export function Boards({ session }: { session: Session }) {
  return <div className="world-boards" aria-label={session.language === 'en' ? 'World boards' : '场景看板'}>
    {BOARDS.filter(board => board.kind === 'skill').map((board, index) => <article className={`world-board ${index % 2 ? 'world-board-amber' : ''}`} key={board.id}
      data-board-id={board.id}>
      <span>{session.language === 'en' ? 'TERMINAL' : '数据终端'} / 0{index + 1}</span>
      <h2>{board.title[session.language]}</h2>
      <p>{board.summary[session.language]}</p>
    </article>)}
  </div>;
}
