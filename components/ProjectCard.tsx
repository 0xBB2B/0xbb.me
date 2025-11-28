import React from 'react';
import { Project } from '../types';
import { GlitchText } from './GlitchText.tsx';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <div className="group relative bg-neon-panel border border-gray-800 hover:border-neon-cyan/50 transition-all duration-300 overflow-hidden">
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-neon-pink opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-neon-pink opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-neon-pink opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-neon-pink opacity-50 group-hover:opacity-100 transition-opacity" />

      <div className="p-6 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <GlitchText as="h3" text={project.title} className="text-xl font-bold font-cyber text-white" />
          <span className={`text-xs px-2 py-1 font-mono border ${
            project.status === 'ONLINE' ? 'border-green-500 text-green-500 shadow-[0_0_5px_rgba(34,197,94,0.3)]' :
            project.status === 'DEVELOPMENT' ? 'border-yellow-500 text-yellow-500' :
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
            <span key={tech} className="text-[10px] uppercase font-bold text-neon-cyan bg-neon-cyan/10 px-2 py-1 rounded-sm">
              {tech}
            </span>
          ))}
        </div>
        
        <div className="flex gap-4 mt-auto">
          {project.link && (
            <a href={project.link} className="flex-1 text-center py-2 text-xs font-bold bg-gray-900 border border-gray-700 hover:bg-neon-cyan hover:text-black hover:border-neon-cyan transition-all uppercase tracking-widest">
              Launch
            </a>
          )}
          {project.repo && (
            <a href={project.repo} className="flex-1 text-center py-2 text-xs font-bold bg-gray-900 border border-gray-700 hover:bg-neon-pink hover:text-black hover:border-neon-pink transition-all uppercase tracking-widest">
              Source
            </a>
          )}
        </div>
      </div>
      
      {/* Background Grid Hover Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-neon-cyan/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out pointer-events-none" />
    </div>
  );
};
