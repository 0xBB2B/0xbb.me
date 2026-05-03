import React from 'react';
import { Project } from '../types';
import { GlitchText } from './GlitchText.tsx';

interface ProjectCardProps {
  project: Project;
}

/**
 * 状态对应的胶贴风格 className，与 sticker-chip-* 体系保持一致。
 */
const STATUS_STICKER: Record<string, string> = {
  ONLINE: 'sticker-chip sticker-chip-cyan',
  DEVELOPMENT: 'sticker-chip', // 默认黄色
  OFFLINE: 'sticker-chip sticker-chip-pink',
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const statusClass = STATUS_STICKER[project.status] ?? 'sticker-chip';
  return (
    <div className="group relative bg-neon-panel border-2 border-neon-purple hover:border-neon-cyan transition-all duration-200 overflow-hidden pixel-clip-sm pixel-shadow-purple hover:pixel-shadow-cyan">
      {/* 卡片内半色调质感叠层。 */}
      <div className="absolute inset-0 halftone-dots-dense opacity-20 pointer-events-none mix-blend-screen"></div>
      {/* 斜条纹底纹强化「贴纸」观感。 */}
      <div className="absolute inset-0 diagonal-stripes opacity-60 pointer-events-none"></div>

      <div className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4 gap-3">
          <GlitchText as="h3" text={project.title} className="text-xl font-bold font-cyber text-white" />
          <span className={`${statusClass} text-[7px] shrink-0`}>
            {project.status}
          </span>
        </div>

        <p className="text-gray-400 font-mono text-sm mb-4 leading-relaxed h-20 overflow-y-auto custom-scrollbar">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {project.tech.map(tech => (
            <span key={tech} className="font-pixel text-[7px] uppercase text-neon-cyan bg-neon-bg border-2 border-neon-cyan/60 px-2 py-1">
              {tech}
            </span>
          ))}
        </div>

        <div className="flex gap-4 mt-auto">
          {project.link && (
            <a
              href={project.link}
              className="flex-1 text-center py-2 font-pixel text-[10px] bg-neon-cyan text-neon-bg border-2 border-neon-bg pixel-shadow-tight hover:translate-y-[-2px] transition-transform tracking-widest"
            >
              LAUNCH
            </a>
          )}
          {project.repo && (
            <a
              href={project.repo}
              className="flex-1 text-center py-2 font-pixel text-[10px] bg-neon-pink text-neon-bg border-2 border-neon-bg pixel-shadow-tight hover:translate-y-[-2px] transition-transform tracking-widest"
            >
              SOURCE
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
