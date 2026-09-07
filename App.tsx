import { useState } from 'react';
import { Hud } from './components/portfolio/Hud';
import { WorldViewport } from './components/portfolio/WorldViewport';
import { createInput } from './portfolio/input';
import { createSession } from './portfolio/state';

export default function App() {
  const [session] = useState(createSession);
  const [input] = useState(createInput);
  return <main className="town-page">
    <WorldViewport session={session} input={input} />
    <Hud session={session} input={input} />
  </main>;
}
