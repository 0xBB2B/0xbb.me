import { useState, useEffect, lazy, Suspense } from 'react';
import { GlitchText } from './components/GlitchText.tsx';
import { BeatSaberPlaceholder } from './components/beat-saber/BeatSaberPlaceholder.tsx';
import { ProjectCard } from './components/ProjectCard.tsx';
import { CharacterVisual } from './components/CharacterVisual.tsx';
import { PROJECTS, SKILLS, SOCIAL_LINKS, PROFILE } from './constants';
import { useMediaQuery } from './hooks/useMediaQuery';

// 桌面端才动态 import BeatSaberGame：把 three.js（约 600KB）从移动端
// 首屏 bundle 中拆出来，移动端永远不下载也不渲染游戏组件。
const BeatSaberGame = lazy(() => import('./components/beat-saber/BeatSaberGame.tsx'));

/**
 * App 渲染个人主页主界面。
 */
function App() {
  const [mounted, setMounted] = useState(false);
  // lg 以上视为桌面端，匹配下面 lg:flex-row 的整体布局断点。
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-neon-bg text-gray-200 font-mono relative selection:bg-neon-pink selection:text-neon-bg pb-20 crt overflow-hidden">
      {/* 背景四层叠加：基底渐变 → BB 像素壁纸 → 半色调圆点 → 斜条纹 → HUD 横线。 */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 1. 底色：紫罗兰渐层 + 角落光斑。 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(155,123,255,0.34),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(255,79,216,0.22),transparent_26%),linear-gradient(135deg,#06031a_0%,#1b0d3d_48%,#06031a_100%)]"></div>
        {/* 2. BB 像素壁纸：低不透明度铺底，营造贴纸式 wallpaper。 */}
        <div className="absolute inset-0 bb-wallpaper opacity-70 mix-blend-screen animate-pattern-drift"></div>
        {/* 3. 半色调点阵：双层圆点，叠在壁纸之上做"印刷网点"质感。 */}
        <div className="absolute inset-0 halftone-dots opacity-80 mix-blend-screen animate-halftone-drift"></div>
        {/* 4. 紫色对角线条纹（参考图角色身后纹理）。 */}
        <div className="absolute inset-0 diagonal-stripes opacity-90 mix-blend-screen animate-stripe-drift"></div>
        {/* 5. HUD 横线。 */}
        <div className="absolute left-0 right-0 top-20 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent opacity-80"></div>
        <div className="absolute left-0 right-0 bottom-28 h-px bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-60"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl pt-12">

        <header className="flex flex-col md:flex-row justify-between items-center border-b-2 border-neon-purple/50 pb-6 mb-12 relative">
           <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto text-center md:text-left">
             <div className="relative hidden md:block">
               {/* 像素剪影头像：硬色差 drop-shadow + 黑色 2px 切角描边，告别柔光。 */}
               <img
                 src={PROFILE.avatar}
                 alt={PROFILE.name}
                 className="relative w-24 h-24 border-2 border-neon-bg shrink-0 object-cover pixel-clip-sm chrome-edge"
                 style={{ imageRendering: 'pixelated' }}
               />
             </div>
             <div className="relative">
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                 <img src={PROFILE.avatar} alt={PROFILE.name} className="w-10 h-10 border-2 border-neon-bg pixel-clip-sm chrome-edge md:hidden" />
                 <div className="font-pixel text-[9px] text-neon-cyan tracking-widest">{PROFILE.status}</div>
                 <span className="sticker-chip animate-hud-blink text-[9px]">LV.999</span>
               </div>
               <GlitchText as="h1" text={PROFILE.name} className="text-5xl md:text-7xl font-black font-cyber text-white tracking-normal text-level" />
               <p className="mt-3 text-lg sm:text-xl text-gray-300 font-light">
                 <span className="text-neon-pink">{'>'}</span> {PROFILE.role}
               </p>
               <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3 text-[8px]">
                 <span className="sticker-chip sticker-chip-purple">AHA! HACKER</span>
                 <span className="sticker-chip sticker-chip-pink">PUNKLORDE</span>
                 <span className="sticker-chip sticker-chip-cyan animate-aha-flicker">DATA ONLINE</span>
               </div>
             </div>
           </div>

           <div className="flex gap-4 mt-8 md:mt-0 items-center">
             {SOCIAL_LINKS.map((link: any) => (
               <a
                 key={link.name}
                 href={link.url}
                 className="group flex flex-col items-center gap-1 text-gray-300 hover:text-neon-cyan transition-colors"
               >
                 <div className="w-11 h-11 border-2 border-neon-bg bg-neon-panel font-pixel text-[10px] flex items-center justify-center pixel-clip-sm pixel-shadow-cyan group-hover:pixel-shadow-pink transition-all">
                    {link.icon}
                 </div>
                 <span className="font-pixel text-[7px] tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity">{link.name}</span>
               </a>
             ))}
           </div>

           <div className="absolute -bottom-[2px] left-0 w-1/3 h-[2px] bg-neon-cyan shadow-[0_0_12px_#42f8ff]"></div>
           <div className="absolute -bottom-[2px] right-0 w-1/5 h-[2px] bg-neon-pink shadow-[0_0_12px_#ff4fd8]"></div>
        </header>

        <div className="flex flex-col lg:flex-row gap-12">

          <CharacterVisual className="lg:hidden mb-6" />

          <div className="w-full lg:w-2/3 flex flex-col space-y-12">

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                 <div className="w-2 h-2 bg-neon-pink animate-pulse shadow-[0_0_10px_#ff4fd8]"></div>
                 <h2 className="text-2xl font-cyber font-bold text-white tracking-wide">USER_PROFILE</h2>
              </div>
                <p className="whitespace-pre-line leading-relaxed text-gray-300 text-lg border-l-4 border-neon-pink/70 bg-neon-panel/35 px-4 py-5 shadow-[inset_0_0_30px_rgba(139,92,246,0.08)]">
                  {PROFILE.bio}
                </p>

            </section>

            <section>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-3 h-3 bg-neon-purple"></div>
                  <h2 className="text-2xl font-cyber font-bold text-white tracking-wide">RHYTHM_BLADE</h2>
                  <span className="sticker-chip sticker-chip-pink text-[8px]">AHA! TIME</span>
                </div>
                <div className="font-pixel text-[9px] text-neon-cyan animate-pulse break-all sm:text-right">
                  /// DUAL_SABER
                </div>
              </div>
              {/* 节奏光剑 3D 容器：硬切角 + 像素阴影框，告别柔光。 */}
              <div className="relative group">
                <div className="relative border-2 border-neon-purple bg-neon-bg pixel-clip-sm pixel-shadow-purple">
                  {isDesktop ? (
                    <Suspense fallback={<BeatSaberPlaceholder />}>
                      <BeatSaberGame />
                    </Suspense>
                  ) : (
                    <BeatSaberPlaceholder />
                  )}
                </div>
              </div>
              {isDesktop && (
                <p className="mt-3 text-[10px] text-gray-400 text-right font-pixel">
                  L <span className="text-neon-purple">[WASD]</span> · R <span className="text-neon-cyan">[IJKL]</span>
                </p>
              )}
            </section>

          </div>

          <div className="w-full lg:w-1/3 flex flex-col space-y-12">

            <section className="bg-neon-panel/85 p-6 border-2 border-neon-purple relative overflow-hidden pixel-clip-sm pixel-shadow-purple">
               {/* 半色调底纹叠在面板内，呼应整体壁纸印刷感。 */}
               <div className="absolute inset-0 halftone-dots-dense opacity-25 pointer-events-none mix-blend-screen"></div>
               <div className="flex items-center gap-3 mb-6 relative z-10">
                 <div className="w-3 h-3 bg-neon-purple"></div>
                 <h2 className="text-xl font-cyber font-bold text-white tracking-wide">SKILL_MATRIX</h2>
                 <span className="ml-auto sticker-chip text-[8px]">MAX RANK</span>
              </div>
              
              <div className="space-y-4 relative z-10">
                {SKILLS.map((skill: any) => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-200 font-bold font-mono">{skill.name}</span>
                      <span className={`font-pixel text-[9px] ${skill.level >= 999 ? 'text-neon-yellow text-level' : 'text-neon-cyan'}`}>{skill.level >= 999 ? 'LV.999' : `${skill.level}%`}</span>
                    </div>
                    {/* 像素进度条：8 段离散块，更像复古血条。 */}
                    <div className="h-3 w-full bg-neon-bg border border-neon-purple/60 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan relative"
                        style={{ width: `${Math.min(skill.level, 100)}%` }}
                      >
                         <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_10px,rgba(0,0,0,0.45)_10px_12px)]"></div>
                         <div className="absolute top-0 right-0 h-full w-[2px] bg-white"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-5 mt-8">
              <div className="border-2 border-neon-yellow p-4 bg-neon-panel pixel-clip-sm pixel-shadow-yellow group">
                 <div className="font-pixel text-[8px] text-gray-400 mb-2 tracking-widest">CONTRIBUTIONS</div>
                 <div className="text-3xl font-cyber text-neon-yellow group-hover:animate-pulse">{PROFILE.stats.contributions}</div>
              </div>
              <div className="border-2 border-neon-pink p-4 bg-neon-panel pixel-clip-sm pixel-shadow-pink group">
                 <div className="font-pixel text-[8px] text-gray-400 mb-2 tracking-widest">UPTIME</div>
                 <div className="text-3xl font-cyber text-neon-pink group-hover:animate-pulse">{PROFILE.stats.uptime}</div>
              </div>
              <div className="border-2 border-neon-cyan p-4 bg-neon-panel pixel-clip-sm pixel-shadow-cyan group col-span-2">
                 <div className="font-pixel text-[8px] text-gray-400 mb-2 tracking-widest">CURRENT LOCATION</div>
                 <div className="text-xl font-mono text-neon-cyan flex items-center justify-between">
                   <span>{PROFILE.location}</span>
                   <span className="w-3 h-3 bg-green-500 shadow-[0_0_8px_#22c55e] animate-ping"></span>
                 </div>
              </div>
            </section>

          </div>
        </div>

        {/* Projects Grid Section */}
        {PROJECTS && PROJECTS.length > 0 && (
        <section className="mt-24 mb-12">
           <div className="flex flex-wrap items-center gap-3 mb-8 border-b-2 border-neon-purple/60 pb-4">
              <div className="w-3 h-3 bg-white"></div>
              <h2 className="flex-1 min-w-0 text-2xl sm:text-3xl font-cyber font-bold text-white tracking-wide break-all leading-tight">
                DEPLOYED_PROJECTS
              </h2>
              <span className="sticker-chip sticker-chip-cyan text-[8px]">ARCADE</span>
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
