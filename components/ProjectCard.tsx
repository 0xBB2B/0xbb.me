import React from 'react';
import { Project } from '../types';
import { GlitchText } from './GlitchText.tsx';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <div className="group relative bg-neon-panel/85 border border-neon-purple/35 hover:border-neon-cyan/70 transition-all duration-300 overflow-hidden shadow-[0_0_26px_rgba(139,92,246,0.1)]">
      <div className="p-6 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <GlitchText as="h3" text={project.title} className="text-xl font-bold font-cyber text-white" />
          <span className={`text-xs px-2 py-1 font-mono border ${
            project.status === 'ONLINE' ? 'border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(66,248,255,0.3)]' :
            project.status === 'DEVELOPMENT' ? 'border-neon-yellow text-neon-yellow' :
            'border-red-500 text-red-500'
          }`}>
            {project.status}
          </span>
        </div>
        
        <p className="text-gray-400 font-mono text-sm mb-4 leading-relaxed h-20 overflow-y-auto custom-scrollbar">
          {project.description}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {project.tech.map(tech => (
            <span key={tech} className="text-[10px] uppercase font-bold text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-1">
              {tech}
            </span>
          ))}
        </div>
        
        <div className="flex gap-4 mt-auto">
          {project.link && (
            <a href={project.link} className="flex-1 text-center py-2 text-xs font-bold bg-neon-bg border border-neon-cyan/40 hover:bg-neon-cyan hover:text-black hover:border-neon-cyan transition-all uppercase tracking-widest">
              Launch
            </a>
          )}
          {project.repo && (
            <a href={project.repo} className="flex-1 text-center py-2 text-xs font-bold bg-neon-bg border border-neon-pink/40 hover:bg-neon-pink hover:text-black hover:border-neon-pink transition-all uppercase tracking-widest">
              Source
            </a>
          )}
        </div>
      </div>
      
      <div className="absolute inset-0 bg-[linear-gradient(rgba(66,248,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,79,216,0.04)_1px,transparent_1px)] bg-[size:16px_16px] opacity-60 pointer-events-none"></div>
      <div className="absolute inset-0 bg-neon-cyan/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out pointer-events-none" />
    </div>
  );
};
