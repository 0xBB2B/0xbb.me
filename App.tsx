import React, { Suspense, lazy, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Briefcase,
  ChevronDown,
  Code2,
  Gamepad2,
  Layers,
  Mail,
  Sparkles,
} from 'lucide-react';
import { GlitchText } from './components/GlitchText.tsx';
import { AetherBackground } from './components/aether/AetherBackground.tsx';
import { Terminal } from './components/aether/Terminal.tsx';
import { StatusCard } from './components/aether/StatusCard.tsx';
import { BeatSaberPlaceholder } from './components/beat-saber/BeatSaberPlaceholder.tsx';
import { PROFILE, SKILLS, SOCIAL_LINKS } from './constants';
import { useMediaQuery } from './hooks/useMediaQuery';
import { handleAnchorClick } from './lib/scrollToAnchor';

// 桌面端才动态 import BeatSaberGame：把 three.js（约 600KB）从移动端
// 首屏 bundle 中拆出来，移动端永远不下载也不渲染游戏组件。
const BeatSaberGame = lazy(() => import('./components/beat-saber/BeatSaberGame.tsx'));

// 顶部导航锚点；与下方各 section 的 id 对齐。
const NAV_ITEMS = ['HOME', 'STATS', 'GAME', 'SKILLS'] as const;

// SOCIAL_LINKS 名称到 lucide 图标的映射，让社交按钮拥有统一视觉语言。
// 注：lucide-react v1 砍掉了所有品牌 logo（GitHub/LinkedIn 等），故此处使用
// 语义化通用图标——Code2 代表代码仓库、Briefcase 代表职业网络、BookOpen
// 代表技术内容平台——与 Aether Link 主题的极简像素美学保持一致。
const SOCIAL_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  GitHub: Code2,
  LinkedIn: Briefcase,
  Email: Mail,
  Juejin: BookOpen,
};

/**
 * App 渲染 Aether Link 主题作品集主界面。
 *
 * 主要分段：
 *  - HERO：玩家入口；
 *  - STATS：玩家档案 + 状态卡；
 *  - LEVELS：嵌入节奏光剑游戏；
 *  - SKILLS：能力树进度条；
 *  - FOOTER：GAME OVER 收束。
 */
function App() {
  const [mounted, setMounted] = useState(false);
  // lg 以上视为桌面端，匹配 BeatSaber 键盘玩法的最小可用尺寸。
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen selection:bg-game-teal selection:text-game-dark overflow-hidden">
      {/* CRT 扫描线浮层 + 内阴影暗角 */}
      <div className="scanline" />
      <div className="fixed inset-0 pointer-events-none z-[150] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />

      {/* Boot 启动终端：完成后自动淡出。 */}
      <Terminal />

      {/* 浮动方块背景（青 / 紫两组 motion 动画）。 */}
      <AetherBackground />

      {/* 背景装饰：径向辉光 + 1/4 网格竖线，给页面长滚动增加纵深感。 */}
      <div className="fixed top-0 left-0 w-full h-full -z-20 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)]" />
        <div className="absolute h-full w-[1px] bg-game-silver/10 left-1/4" />
        <div className="absolute h-full w-[1px] bg-game-silver/10 left-2/4" />
        <div className="absolute h-full w-[1px] bg-game-silver/10 left-3/4" />
      </div>

      <nav className="fixed top-0 w-full z-50 p-6 flex justify-between items-center mix-blend-difference">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-pixel text-xs tracking-tighter text-game-teal"
        >
          {PROFILE.name.toUpperCase()}.SYS
        </motion.div>
        <div className="hidden md:flex gap-8 items-center">
          {NAV_ITEMS.map((item, i) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={handleAnchorClick}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="font-cyber text-[10px] tracking-[0.2em] hover:text-game-teal transition-colors"
            >
              //{item}
            </motion.a>
          ))}
        </div>
      </nav>

      <main className="relative z-10">
        {/* HERO */}
        <section
          id="home"
          className="min-h-screen flex flex-col items-center justify-center pt-24 px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-6 relative"
          >
            <div className="absolute -inset-4 bg-game-purple/20 blur-3xl rounded-full" />
            <Gamepad2 size={80} className="text-game-teal relative z-10" />
          </motion.div>

          <GlitchText
            text={PROFILE.name}
            className="text-4xl md:text-7xl font-cyber font-black mb-4"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-mono text-game-silver text-sm md:text-lg max-w-2xl mx-auto uppercase tracking-wider mb-12"
          >
            {PROFILE.role}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <a
              href="#game"
              onClick={handleAnchorClick}
              className="pixel-card bg-game-purple border-game-purple group hover:bg-game-teal hover:border-game-teal transition-all"
            >
              <span className="font-pixel text-xs flex items-center gap-2 group-hover:text-game-dark">
                PRESS_START <Layers size={14} />
              </span>
            </a>
            <a
              href="#stats"
              onClick={handleAnchorClick}
              className="pixel-card border-game-silver/50 hover:border-game-pink transition-all"
            >
              <span className="font-pixel text-xs text-game-silver hover:text-game-pink">
                JOIN_PARTY
              </span>
            </a>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-10"
          >
            <ChevronDown size={32} className="text-game-silver opacity-20" />
          </motion.div>
        </section>

        {/* STATS */}
        <section
          id="stats"
          className="min-h-screen flex flex-col items-center justify-center py-24 px-6 bg-game-dark/50"
        >
          <div className="w-full max-w-6xl grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-block px-3 py-1 bg-game-teal/20 border border-game-teal text-game-teal font-pixel text-[10px] mb-6">
                CHARACTER_DATA
              </div>
              <h2 className="font-cyber text-4xl md:text-5xl mb-8">PLAYER_PROFILE</h2>
              <p className="font-mono text-game-silver leading-relaxed mb-4 whitespace-pre-line">
                {PROFILE.bio}
              </p>
              <div className="flex items-center gap-3 text-xs font-mono text-game-silver mb-8">
                <span className="font-pixel text-[10px] text-game-teal">LOC:</span>
                <span>{PROFILE.location}</span>
                <span className="w-2 h-2 bg-green-500 shadow-[0_0_6px_#22c55e] animate-pulse rounded-full" />
              </div>
              <div className="flex flex-wrap gap-4">
                {SOCIAL_LINKS.map((link) => {
                  const Icon = SOCIAL_ICON[link.name];
                  if (!Icon) return null;
                  return (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.name}
                      className="text-game-silver hover:text-game-teal transition-colors"
                    >
                      <Icon size={24} />
                    </a>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <StatusCard />
            </motion.div>
          </div>
        </section>

        {/* LEVELS：嵌入节奏光剑（替换 Aether 原版的 LEVEL_SELECT） */}
        <section id="game" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <div className="inline-block px-3 py-1 bg-game-pink/20 border border-game-pink text-game-pink font-pixel text-[10px] mb-4">
                BOSS_BATTLE
              </div>
              <h2 className="font-cyber text-4xl md:text-5xl uppercase italic">RHYTHM_BLADE</h2>
              <p className="mt-3 font-mono text-game-silver text-sm uppercase tracking-widest">
                Dual-saber arcade · three.js + Web Audio
              </p>
            </div>
            {isDesktop && (
              <div className="text-right font-pixel text-[10px] text-game-silver">
                <div>
                  L <span className="text-game-purple">[WASD]</span>
                </div>
                <div className="mt-1">
                  R <span className="text-game-teal">[IJKL]</span>
                </div>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="pixel-card p-0 overflow-hidden"
          >
            {isDesktop ? (
              <Suspense fallback={<BeatSaberPlaceholder />}>
                <BeatSaberGame />
              </Suspense>
            ) : (
              <BeatSaberPlaceholder />
            )}
          </motion.div>
        </section>

        {/* SKILLS */}
        <section id="skills" className="py-24 px-6 bg-game-dark">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="font-cyber text-4xl md:text-5xl mb-6 flex items-center justify-center gap-4">
              <Sparkles className="text-game-teal" /> ABILITY_TREE
            </h2>
            <p className="text-game-silver font-mono text-sm uppercase tracking-[0.2em]">
              Upgrading system core... [100%]
            </p>
          </div>

          <div className="max-w-2xl mx-auto grid gap-12">
            {SKILLS.map((skill, i) => {
              const isMax = skill.level >= 999;
              const fillPercent = isMax ? 100 : Math.min(skill.level, 100);
              const valueText = isMax ? 'LV.999' : `${skill.level}%`;
              return (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-8"
                >
                  <div className="w-12 h-12 shrink-0 border-2 border-game-silver/20 flex items-center justify-center font-cyber text-xs text-game-silver">
                    {(i + 1).toString().padStart(2, '0')}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="font-pixel text-xs tracking-tight">{skill.name}</span>
                      <span
                        className={`font-pixel text-xs ${isMax ? 'text-game-pink' : 'text-game-teal'}`}
                      >
                        {valueText}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-game-silver/10 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${isMax ? 'bg-game-pink' : 'bg-game-teal'}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${fillPercent}%` }}
                        transition={{ duration: 1.5, ease: 'circOut' }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <footer className="py-24 px-6 text-center border-t border-game-silver/10">
          <GlitchText
            text="GAME OVER"
            className="text-6xl md:text-8xl font-cyber mb-8 opacity-20"
          />
          <p className="font-pixel text-[10px] text-game-silver mb-4 uppercase">
            {PROFILE.footer}
          </p>
          <p className="font-mono text-[10px] text-game-silver/50">
            © {new Date().getFullYear()} {PROFILE.copyright}
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
