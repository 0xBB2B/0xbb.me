import React from 'react';
import { motion } from 'motion/react';
import { PROFILE, PROJECTS, SKILLS, SOCIAL_LINKS } from './constants';
import { handleAnchorClick } from './lib/scrollToAnchor';

const GAME_URL = './game/';
const MAX_LEVEL = 999;
const NAV_ITEMS = ['STATS', 'SKILLS', 'PROJECTS'] as const;

const splitName = (name: string): [string, string] => {
  const i = name.indexOf('_');
  return i < 0 ? [name, ''] : [name.slice(0, i), name.slice(i + 1)];
};

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const [nameHead, nameTail] = splitName(PROFILE.name);
const statusWord = PROFILE.status.split(':').pop()?.trim() ?? PROFILE.status;
const GITHUB_URL = SOCIAL_LINKS.find((l) => l.name === 'GitHub')?.url ?? '#';
const onlineProjects = PROJECTS.filter((p) => p.status === 'ONLINE').length;

const STAT_CELLS: { label: string; value: string; unit: string; href?: string }[] = [
  ...SKILLS.slice(0, 2).map((s) => ({ label: s.name.toUpperCase(), value: String(s.level), unit: 'LV' })),
  { label: 'PROJECTS', value: pad2(onlineProjects), unit: 'ONLINE' },
  { label: 'RHYTHM BLADE', value: 'PLAY', unit: '→', href: GAME_URL },
];

const TelemetryRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 border-t border-hud-ice/10 py-2 tabular-nums">
    <span>{label}</span>
    <span className="text-hud-ice">{children}</span>
  </div>
);

const SectionHead: React.FC<{ id: string; title: string; aside?: string }> = ({ id, title, aside }) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <div>
      <div className="hud-eyebrow mb-1">// {id.toUpperCase()}</div>
      <h2 className="font-display text-2xl font-bold leading-none">{title}</h2>
    </div>
    {aside && <span className="font-mono text-[11px] tracking-[0.18em] text-hud-dim">{aside}</span>}
  </div>
);

function App() {
  return (
    <div className="relative min-h-screen">
      <div className="hud-grid" />
      <div className="hud-scan" />

      <nav className="hud-nav sticky top-0 z-20 bg-hud-bg/90 backdrop-blur">
        <div>
          <b>{PROFILE.name}</b>.SYS
        </div>
        <div className="hidden gap-6 md:flex">
          <a href="#home" onClick={handleAnchorClick} className="text-hud-fg">
            HOME
          </a>
          {NAV_ITEMS.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={handleAnchorClick}>
              {item}
            </a>
          ))}
          <a href={GAME_URL} className="text-hud-ice">
            GAME ↗
          </a>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5">
            LINK <span className="hud-dot text-hud-ok" /> {statusWord}
          </span>
        </div>
      </nav>

      <main className="relative z-10">
        <section id="home" className="mx-auto grid max-w-7xl gap-8 px-7 pb-10 pt-12 lg:grid-cols-[1.3fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="hud-eyebrow mb-3">PILOT PROFILE // {PROFILE.location.replace(',', ' · ')}</div>
            <h1 className="font-display text-[clamp(40px,7vw,84px)] font-bold leading-[0.95] tracking-tight">
              {nameHead}
              <br />
              <em className="not-italic text-hud-ice">{nameTail}</em>
            </h1>
            <p className="mt-4 font-display text-base tracking-wide">{PROFILE.role}</p>
            <p className="mt-3 max-w-[52ch] whitespace-pre-line text-sm leading-relaxed text-[#9db1c3]">{PROFILE.bio}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="hud-cta fill" href={GAME_URL}>
                DEPLOY GAME
              </a>
              <a className="hud-cta" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                VIEW STATS
              </a>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="hud-frame self-start p-5 font-mono text-xs"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[11px] font-semibold tracking-[0.2em] text-hud-dim">TELEMETRY</h3>
              <img src={PROFILE.avatar} alt={PROFILE.name} className="h-10 w-10 border border-hud-ice/40 object-cover" />
            </div>
            <TelemetryRow label="STATUS">
              <span className="inline-flex items-center gap-1.5 text-hud-ok">
                <span className="hud-dot" /> {statusWord}
              </span>
            </TelemetryRow>
            <TelemetryRow label="UPTIME">{PROFILE.stats.uptime}</TelemetryRow>
            <TelemetryRow label="CONTRIB">{PROFILE.stats.contributions}</TelemetryRow>
            <TelemetryRow label="LOCATION">{PROFILE.location}</TelemetryRow>
            <TelemetryRow label="LINKS">
              <span className="flex gap-3">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.name}
                    className="transition-colors hover:text-hud-fg"
                  >
                    {link.icon}
                  </a>
                ))}
              </span>
            </TelemetryRow>
          </motion.aside>
        </section>

        <section id="stats" className="border-y border-hud-ice/10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
            {STAT_CELLS.map((cell) => {
              const Tag = cell.href ? 'a' : 'div';
              return (
                <Tag
                  key={cell.label}
                  href={cell.href}
                  className="border-r border-hud-ice/10 px-7 py-5 last:border-r-0 [&:nth-child(2)]:border-r-0 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(2)]:border-r lg:[&:nth-child(-n+2)]:border-b-0"
                >
                  <small className="block font-mono text-[11px] tracking-[0.18em] text-hud-dim">{cell.label}</small>
                  <strong className="font-display text-3xl font-bold tabular-nums">
                    {cell.value}
                    <i className="ml-1 text-base not-italic text-hud-ice">{cell.unit}</i>
                  </strong>
                </Tag>
              );
            })}
          </div>
        </section>

        <section id="skills" className="mx-auto max-w-7xl px-7 py-8">
          <SectionHead id="skills" title="ABILITY MATRIX" aside={`${SKILLS.length} MODULES LOADED`} />
          <div className="grid gap-x-7 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
            {SKILLS.map((skill) => {
              const isMax = skill.level >= MAX_LEVEL;
              const fillPercent = isMax ? 100 : Math.min(skill.level, 100);
              return (
                <div key={skill.name} className="font-mono text-xs">
                  <div className="mb-1.5 flex justify-between">
                    <span>{skill.name.toUpperCase()}</span>
                    <b className={`font-medium ${isMax ? 'text-hud-warn' : 'text-hud-ice'}`}>
                      {isMax ? `LV.${skill.level}` : skill.level}
                    </b>
                  </div>
                  <div className={`hud-bar ${isMax ? 'max' : ''}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${fillPercent}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="projects" className="border-t border-hud-ice/10">
          <div className="mx-auto max-w-7xl px-7 py-8">
            <SectionHead id="projects" title="DEPLOYMENTS" aside={`${pad2(onlineProjects)} ONLINE`} />
            <div className="grid border border-hud-ice/10 md:grid-cols-3">
              {PROJECTS.map((project, i) => (
                <article
                  key={project.id}
                  className="flex flex-col gap-2 border-b border-hud-ice/10 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                >
                  <div className="flex justify-between font-mono text-[11px] tracking-[0.18em] text-hud-dim">
                    <span>PROJECT {pad2(i + 1)}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 ${project.status === 'ONLINE' ? 'text-hud-ok' : 'text-hud-warn'}`}
                    >
                      <span className="hud-dot" /> {project.status}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold">{project.title}</h3>
                  <p className="text-sm leading-relaxed text-[#9db1c3]">{project.description}</p>
                  <div className="mt-auto pt-2 font-mono text-[11px] text-hud-dim">{project.tech.join(' · ')}</div>
                  <div className="flex gap-4 font-display text-[11px] font-semibold tracking-[0.14em] text-hud-ice">
                    {project.link && (
                      <a href={project.link} target="_blank" rel="noopener noreferrer" className="hover:text-hud-fg">
                        LAUNCH ↗
                      </a>
                    )}
                    {project.repo && (
                      <a href={project.repo} target="_blank" rel="noopener noreferrer" className="hover:text-hud-fg">
                        SOURCE ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-2 border-t border-hud-ice/10 px-7 py-5 font-mono text-[11px] tracking-[0.12em] text-hud-dim md:flex-row">
          <span>{PROFILE.footer}</span>
          <span>
            © {new Date().getFullYear()} {PROFILE.copyright}
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
