import React from 'react';
import { motion } from 'motion/react';
import { Code2, ExternalLink, Terminal as TerminalIcon } from 'lucide-react';
import { Project } from '../types';

interface ProjectCardProps {
  project: Project;
  index?: number;
}

// status 文字到色彩 token 的映射，让卡片右上角的状态标签呼应整体游戏化语言。
const STATUS_COLOR: Record<Project['status'], string> = {
  ONLINE: 'text-game-teal',
  DEVELOPMENT: 'text-game-pink',
  OFFLINE: 'text-game-silver',
};

/**
 * ProjectCard 渲染 Aether Link 主题的项目卡片（DEPLOYED 段使用）。
 *
 * 视觉骨架：pixel-card 硬阴影 + 左上 Terminal 图标 + 右上 LV.STATUS 标签 +
 * tag 列表 + 右下 Github / 外链图标。motion 提供入场上滑与悬停轻微缩放。
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({ project, index = 0 }) => {
  const statusColor = STATUS_COLOR[project.status] ?? 'text-game-silver';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      className="pixel-card group hover:scale-[1.02] transition-all"
    >
      <div className="flex justify-between items-start mb-6">
        <TerminalIcon className="text-game-teal group-hover:animate-pulse" />
        <span className={`font-pixel text-[10px] ${statusColor}`}>
          LV.{project.status}
        </span>
      </div>

      <h3 className="font-pixel text-base mb-4 group-hover:text-game-teal transition-colors break-all">
        {project.title}
      </h3>

      <p className="text-xs text-game-silver leading-relaxed mb-6 min-h-[4.5rem]">
        {project.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {project.tech.map((tag) => (
          <span
            key={tag}
            className="text-[8px] font-cyber border border-game-silver/30 px-2 py-0.5 text-game-silver"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-end gap-3 text-game-silver">
        {project.repo && (
          <a
            href={project.repo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.title} repository`}
          >
            <Code2 size={16} className="hover:text-white transition-colors" />
          </a>
        )}
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.title} live site`}
          >
            <ExternalLink size={16} className="hover:text-white transition-colors" />
          </a>
        )}
      </div>
    </motion.div>
  );
};

export default ProjectCard;
