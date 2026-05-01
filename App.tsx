import { useState, useEffect } from 'react';
import { GlitchText } from './components/GlitchText.tsx';
import { ArcadeShooter } from './components/ArcadeShooter.tsx';
import { ProjectCard } from './components/ProjectCard.tsx';
import { CharacterVisual } from './components/CharacterVisual.tsx';
import { PROJECTS, SKILLS, SOCIAL_LINKS, PROFILE } from './constants';

/**
 * App 渲染个人主页主界面。
 */
function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-neon-bg text-gray-200 font-mono relative selection:bg-neon-pink selection:text-neon-bg pb-20 crt overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(139,92,246,0.28),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(66,248,255,0.16),transparent_24%),linear-gradient(135deg,#05040b_0%,#12092f_48%,#05040b_100%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(66,248,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,79,216,0.06)_1px,transparent_1px)] bg-[size:48px_48px] animate-pixel-drift opacity-70"></div>
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,transparent_42%,rgba(66,248,255,0.16)_43%,transparent_44%,transparent_100%)]"></div>
        <div className="absolute left-0 right-0 top-20 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-80"></div>
        <div className="absolute left-0 right-0 bottom-28 h-px bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-60"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl pt-12">

        <header className="flex flex-col md:flex-row justify-between items-center border-b-2 border-neon-purple/50 pb-6 mb-12 relative">
           <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto text-center md:text-left">
             <div className="relative hidden md:block">
               <div className="absolute -inset-1 bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink opacity-80 blur-sm"></div>
               <img src={PROFILE.avatar} alt={PROFILE.name} className="relative w-24 h-24 pixel-corners border-2 border-neon-cyan shadow-[0_0_24px_rgba(66,248,255,0.5)] shrink-0 object-cover" />
             </div>
             <div className="relative">
               <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                 <img src={PROFILE.avatar} alt={PROFILE.name} className="w-10 h-10 pixel-corners border border-neon-cyan md:hidden" />
                 <div className="text-xs font-mono text-neon-cyan tracking-widest">{PROFILE.status}</div>
                 <div className="hidden sm:block text-xs text-neon-yellow border border-neon-yellow/60 px-2 py-1 shadow-[0_0_12px_rgba(248,255,114,0.25)] animate-hud-blink">LV.999</div>
               </div>
               <GlitchText as="h1" text={PROFILE.name} className="text-5xl md:text-7xl font-black font-cyber text-white tracking-normal text-level" />
               <p className="mt-3 text-lg sm:text-xl text-gray-300 font-light">
                 <span className="text-neon-pink">{'>'}</span> {PROFILE.role}
               </p>
               <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2 text-[10px] uppercase tracking-[0.2em] text-neon-purple">
                 <span className="border border-neon-purple/60 bg-neon-purple/10 px-2 py-1">Quantum Gamer UI</span>
                 <span className="border border-neon-cyan/60 bg-neon-cyan/10 px-2 py-1">Aether Edit Mode</span>
               </div>
             </div>
           </div>
           
           <div className="flex gap-6 mt-8 md:mt-0 items-center">
             {SOCIAL_LINKS.map((link: any) => (
               <a 
                 key={link.name} 
                 href={link.url}
                 className="group flex flex-col items-center gap-1 text-gray-500 hover:text-neon-cyan transition-colors"
               >
                 <div className="w-10 h-10 border border-current bg-neon-panel/60 flex items-center justify-center font-bold text-lg group-hover:shadow-[0_0_14px_rgba(66,248,255,0.65)] transition-shadow">
                    {link.icon}
                 </div>
                 <span className="text-[10px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity">{link.name}</span>
               </a>
             ))}
           </div>
           
           <div className="absolute -bottom-[2px] left-0 w-1/3 h-[2px] bg-neon-cyan shadow-[0_0_12px_#42f8ff]"></div>
           <div className="absolute -bottom-[2px] right-0 w-1/5 h-[2px] bg-neon-pink shadow-[0_0_12px_#ff4fd8]"></div>
        </header>

        <div className="flex flex-col lg:flex-row gap-12">

          <CharacterVisual className="lg:hidden mb-6" />

          <div className="w-full lg:w-7/12 flex flex-col space-y-12">

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                 <div className="w-2 h-2 bg-neon-pink animate-pulse shadow-[0_0_10px_#ff4fd8]"></div>
                 <h2 className="text-2xl font-cyber font-bold text-white tracking-wide">USER_PROFILE</h2>
              </div>
                <p className="leading-relaxed text-gray-300 text-lg border-l-4 border-neon-pink/70 bg-neon-panel/35 px-4 py-5 shadow-[inset_0_0_30px_rgba(139,92,246,0.08)]">
                  {PROFILE.bio}
                </p>

            </section>

            <section>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-cyan"></div>
                  <h2 className="text-2xl font-cyber font-bold text-white tracking-wide">STAR_RAID</h2>
                </div>
                <div className="text-xs text-neon-pink animate-pulse break-all sm:text-right">
                  /// LEFT_RIGHT_SPACE
                </div>
              </div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink opacity-45 group-hover:opacity-75 blur transition duration-500"></div>
                <div className="relative">
                  <ArcadeShooter />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600 text-right font-mono">
                Press <span className="text-neon-cyan">GAME START</span>, move with <span className="text-neon-cyan">← →</span>, fire with <span className="text-neon-cyan">SPACE</span>
              </p>
            </section>

          </div>

          <div className="w-full lg:w-5/12 flex flex-col space-y-12">

            <section className="bg-neon-panel/55 p-6 border border-neon-purple/40 relative overflow-hidden pixel-corners shadow-[0_0_36px_rgba(139,92,246,0.12)]">
               <div className="flex items-center gap-2 mb-6 relative z-10">
                 <div className="w-2 h-2 bg-neon-purple shadow-[0_0_10px_#8b5cf6]"></div>
                 <h2 className="text-xl font-cyber font-bold text-white tracking-wide">SKILL_MATRIX</h2>
                 <span className="ml-auto text-[10px] text-neon-yellow border border-neon-yellow/50 px-2 py-1">MAX RANK</span>
              </div>
              
              <div className="space-y-4 relative z-10">
                {SKILLS.map((skill: any) => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 font-bold">{skill.name}</span>
                      <span className={skill.level >= 999 ? 'text-neon-yellow text-level' : 'text-neon-cyan'}>{skill.level >= 999 ? 'LV.999' : `${skill.level}%`}</span>
                    </div>
                    <div className="h-2 w-full bg-neon-bg/90 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan relative"
                        style={{ width: `${Math.min(skill.level, 100)}%` }}
                      >
                         <div className="absolute top-0 right-0 h-full w-[2px] bg-white shadow-[0_0_10px_white]"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="absolute inset-0 bg-[linear-gradient(rgba(66,248,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,79,216,0.04)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
            </section>

            <section className="grid grid-cols-2 gap-4 mt-8">
              <div className="border border-neon-yellow/35 p-4 bg-neon-panel/60 hover:border-neon-yellow transition-colors group pixel-corners">
                 <div className="text-xs text-gray-500 mb-1">CONTRIBUTIONS</div>
                 <div className="text-3xl font-cyber text-neon-yellow group-hover:animate-pulse">{PROFILE.stats.contributions}</div>
              </div>
              <div className="border border-neon-pink/35 p-4 bg-neon-panel/60 hover:border-neon-pink transition-colors group pixel-corners">
                 <div className="text-xs text-gray-500 mb-1">UPTIME</div>
                 <div className="text-3xl font-cyber text-neon-pink group-hover:animate-pulse">{PROFILE.stats.uptime}</div>
              </div>
              <div className="border border-neon-cyan/35 p-4 bg-neon-panel/60 hover:border-neon-cyan transition-colors group col-span-2 pixel-corners">
                 <div className="text-xs text-gray-500 mb-1">CURRENT LOCATION</div>
                 <div className="text-xl font-mono text-neon-cyan flex items-center justify-between">
                   <span>{PROFILE.location}</span>
                   <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_#22c55e] animate-ping"></span>
                 </div>
              </div>
            </section>

          </div>
        </div>

        {/* Projects Grid Section */}
        {PROJECTS && PROJECTS.length > 0 && (
        <section className="mt-24 mb-12">
           <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-neon-purple/40 pb-4">
              <div className="w-2 h-2 bg-white shadow-[0_0_10px_white]"></div>
              <h2 className="flex-1 min-w-0 text-2xl sm:text-3xl font-cyber font-bold text-white tracking-wide break-all leading-tight">
                DEPLOYED_PROJECTS
              </h2>
              <span className="text-[10px] text-neon-cyan border border-neon-cyan/50 px-2 py-1">ARCADE SELECT</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {PROJECTS.map(project => (
               <ProjectCard key={project.id} project={project} />
             ))}
           </div>
        </section>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-neon-purple/35 py-8 text-center text-xs text-gray-600 flex flex-col items-center gap-4">
           <p>{PROFILE.footer}</p>
           <p>{PROFILE.copyright.replace('2024', new Date().getFullYear().toString())}</p>
        </footer>

      </div>
    </div>
  );
}

export default App;
