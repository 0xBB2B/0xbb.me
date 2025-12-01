import React, { useState, useEffect } from 'react';
import { GlitchText } from './components/GlitchText.tsx';
import { Terminal } from './components/Terminal.tsx';
import { ProjectCard } from './components/ProjectCard.tsx';
import { PROJECTS, SKILLS, SOCIAL_LINKS, PROFILE, TERMINAL_CONFIG } from './constants';

function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-neon-bg text-gray-300 font-mono relative selection:bg-neon-pink selection:text-white pb-20 crt">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/5 blur-[120px] rounded-full animate-pulse-fast"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-cyan/5 blur-[120px] rounded-full animate-pulse-fast delay-700"></div>
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-neon-pink/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl pt-12">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b-2 border-gray-800 pb-6 mb-12 relative">
           <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto text-center md:text-left">
             <img src={PROFILE.avatar} alt={PROFILE.name} className="w-24 h-24 rounded-full border-2 border-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.5)] shrink-0 hidden md:block" />
             <div className="relative">
               <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                 <img src={PROFILE.avatar} alt={PROFILE.name} className="w-10 h-10 rounded-full border border-neon-cyan md:hidden" />
                 <div className="text-xs font-mono text-neon-cyan tracking-widest">{PROFILE.status}</div>
               </div>
               <GlitchText as="h1" text={PROFILE.name} className="text-5xl md:text-7xl font-black font-cyber text-white tracking-tighter" />
               <p className="mt-2 text-xl text-gray-400 font-light">
                 <span className="text-neon-pink">{'>'}</span> {PROFILE.role}
               </p>
             </div>
           </div>
           
           <div className="flex gap-6 mt-8 md:mt-0 items-center">
             {SOCIAL_LINKS.map((link: any) => (
               <a 
                 key={link.name} 
                 href={link.url}
                 className="group flex flex-col items-center gap-1 text-gray-500 hover:text-neon-cyan transition-colors"
               >
                 <div className="w-10 h-10 border border-current flex items-center justify-center font-bold text-lg group-hover:shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-shadow">
                    {link.icon}
                 </div>
                 <span className="text-[10px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity">{link.name}</span>
               </a>
             ))}
           </div>
           
           {/* Decorative Bar */}
           <div className="absolute -bottom-[2px] left-0 w-1/3 h-[2px] bg-neon-cyan shadow-[0_0_10px_#00ffff]"></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Bio & Terminal (7/12) */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Bio Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                 <div className="w-2 h-2 bg-neon-pink animate-pulse"></div>
                 <h2 className="text-2xl font-cyber font-bold text-white tracking-wide">USER_PROFILE</h2>
              </div>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <img src={PROFILE.fullImage} alt="Profile Full" className="w-full md:w-1/3 rounded-lg border border-gray-800 opacity-80 hover:opacity-100 transition-opacity" />
                <p className="leading-relaxed text-gray-400 text-lg border-l-4 border-gray-800 pl-4">
                  {PROFILE.bio}
                </p>
              </div>
            </section>

            {/* Terminal Section */}
            <section>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-cyan"></div>
                  <h2 className="text-2xl font-cyber font-bold text-white tracking-wide">{TERMINAL_CONFIG.header}</h2>
                </div>
                <div className="text-xs text-neon-pink animate-pulse break-all sm:text-right">
                  {TERMINAL_CONFIG.subHeader}
                </div>
              </div>
              <div className="relative group">
                {/* Decorative border for terminal */}
                <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-purple-500 to-neon-pink opacity-30 group-hover:opacity-60 blur transition duration-500"></div>
                <div className="relative">
                  <Terminal />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600 text-right font-mono">
                {TERMINAL_CONFIG.hint} <span className="text-neon-cyan">{TERMINAL_CONFIG.hintCommand}</span>
              </p>
            </section>

          </div>

          {/* Right Column: Skills & Stats (5/12) */}
          <div className="lg:col-span-5 space-y-12">
            
            {/* Skills Matrix */}
            <section className="bg-gray-900/30 p-6 border border-gray-800 relative overflow-hidden">
               <div className="flex items-center gap-2 mb-6 relative z-10">
                 <div className="w-2 h-2 bg-neon-purple"></div>
                 <h2 className="text-xl font-cyber font-bold text-white tracking-wide">SKILL_MATRIX</h2>
              </div>
              
              <div className="space-y-4 relative z-10">
                {SKILLS.map((skill: any) => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 font-bold">{skill.name}</span>
                      <span className="text-neon-cyan">{skill.level}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-sm overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-neon-purple to-neon-cyan relative"
                        style={{ width: `${skill.level}%` }}
                      >
                         <div className="absolute top-0 right-0 h-full w-[2px] bg-white shadow-[0_0_10px_white]"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Background Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
            </section>

            {/* Quick Stats / Data */}
            <section className="grid grid-cols-2 gap-4">
              <div className="border border-gray-800 p-4 bg-black/50 hover:border-neon-yellow transition-colors group">
                 <div className="text-xs text-gray-500 mb-1">CONTRIBUTIONS</div>
                 <div className="text-3xl font-cyber text-neon-yellow group-hover:animate-pulse">{PROFILE.stats.contributions}</div>
              </div>
              <div className="border border-gray-800 p-4 bg-black/50 hover:border-neon-pink transition-colors group">
                 <div className="text-xs text-gray-500 mb-1">UPTIME</div>
                 <div className="text-3xl font-cyber text-neon-pink group-hover:animate-pulse">{PROFILE.stats.uptime}</div>
              </div>
              <div className="border border-gray-800 p-4 bg-black/50 hover:border-neon-cyan transition-colors group col-span-2">
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
           <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-gray-800 pb-4">
              <div className="w-2 h-2 bg-white"></div>
              <h2 className="flex-1 min-w-0 text-2xl sm:text-3xl font-cyber font-bold text-white tracking-wide break-all leading-tight">
                DEPLOYED_PROJECTS
              </h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {PROJECTS.map(project => (
               <ProjectCard key={project.id} project={project} />
             ))}
           </div>
        </section>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-gray-800 py-8 text-center text-xs text-gray-600 flex flex-col items-center gap-4">
           <p>{PROFILE.footer}</p>
           <p>{PROFILE.copyright.replace('2024', new Date().getFullYear().toString())}</p>
        </footer>

      </div>
    </div>
  );
}

export default App;
