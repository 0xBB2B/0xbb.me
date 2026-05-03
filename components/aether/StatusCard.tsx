import React from 'react';
import { motion } from 'motion/react';
import { Cpu, Shield, Sparkles, Swords, Zap } from 'lucide-react';
import { PROFILE, SKILLS } from '../../constants';

// 将技能 category 映射到 lucide-react 图标，给 StatusCard 提供视觉锚点。
// 与 Aether 原版 4 项游戏属性（Intelligence/Hacking/Defense/Attack）保持视觉量级一致。
const CATEGORY_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Tools: Sparkles,
  Backend: Cpu,
  DevOps: Shield,
  Frontend: Zap,
};

// 类别对应的强调色，让 4 项面板每条都有独立色阶。
const CATEGORY_COLOR: Record<string, string> = {
  Tools: 'text-game-pink',
  Backend: 'text-game-teal',
  DevOps: 'text-game-silver',
  Frontend: 'text-game-purple',
};

const FALLBACK_ICON = Swords;

/**
 * StatusCard 渲染玩家状态卡：头像槽、姓名、等级、技能槽进度条。
 *
 * 数据全部从 PROFILE / SKILLS 注入，技能槽默认取前 4 项，按类别匹配图标。
 * level >= 999 视为 MAX 满槽，普通技能按 level/100 比例展示。
 */
export const StatusCard: React.FC = () => {
  const stats = SKILLS.slice(0, 4);

  return (
    <div className="pixel-card max-w-md w-full">
      <div className="flex items-start gap-6 mb-8">
        <div className="w-24 h-24 bg-game-silver/20 border-2 border-game-silver flex items-center justify-center relative overflow-hidden group">
          <img
            src={PROFILE.avatar}
            alt={PROFILE.name}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-game-purple/30 to-transparent pointer-events-none" />
        </div>
        <div>
          <h2 className="font-pixel text-xl text-game-teal mb-1 break-all">{PROFILE.name}</h2>
          <p className="text-xs text-game-silver uppercase tracking-widest font-cyber">
            {PROFILE.role}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-pixel">LV:</span>
            <span className="text-xl font-pixel text-game-pink">999</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {stats.map((skill) => {
          const Icon = CATEGORY_ICON[skill.category] ?? FALLBACK_ICON;
          const color = CATEGORY_COLOR[skill.category] ?? 'text-game-teal';
          // level >= 999 时显示满槽与 MAX 标签；否则按百分比映射到 1000 总量。
          const isMax = skill.level >= 999;
          const fillPercent = isMax ? 100 : Math.min(skill.level, 100);
          const valueText = isMax ? 'MAX' : `${skill.level * 10}/1000`;

          return (
            <div key={skill.name}>
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={color} />
                  <span className="text-[10px] font-pixel uppercase">{skill.name}</span>
                </div>
                <span className="font-mono text-xs text-game-silver">{valueText}</span>
              </div>
              <div className="h-2 bg-game-dark border border-game-silver/30 relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-game-purple to-game-teal"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${fillPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t-2 border-game-silver/20 flex justify-between items-center text-[10px] font-pixel">
        <span className="text-game-silver opacity-50">#AETHER_LINK</span>
        <a
          href={`#${'levels'}`}
          className="text-game-teal hover:text-game-pink transition-colors"
        >
          VIEW_DETAILS &gt;
        </a>
      </div>
    </div>
  );
};

export default StatusCard;
