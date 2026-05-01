import React from 'react';
import { APP_DATA } from '../data';

const { profile: PROFILE } = APP_DATA;

interface CharacterVisualProps {
  className?: string;
}

export const CharacterVisual: React.FC<CharacterVisualProps> = ({ className = '' }) => {
  return (
    <section className={`relative group ${className}`}>
      <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan opacity-60 group-hover:opacity-90 blur transition duration-500"></div>
      <div className="relative border border-neon-purple/50 bg-neon-panel/85 p-2 overflow-hidden">
        <img 
          src={PROFILE.fullImage} 
          alt="Character Visual" 
          className="w-full h-auto object-cover saturate-125 contrast-125 transition-all duration-500 mix-blend-screen group-hover:mix-blend-normal"
        />

        <div className="absolute top-4 left-4 flex flex-col gap-1">
          <div className="text-[10px] text-neon-pink font-bold tracking-widest">PLAYER_LOCKED</div>
          <div className="w-12 h-[2px] bg-neon-pink shadow-[0_0_10px_#ff4fd8]"></div>
        </div>

        <div className="absolute bottom-4 right-4 text-right">
          <div className="text-2xl font-cyber text-neon-yellow text-level">LV.999</div>
          <div className="text-[10px] text-neon-cyan tracking-widest">AETHER EDIT</div>
        </div>

        <div className="absolute inset-x-4 top-1/2 h-px bg-neon-cyan/80 shadow-[0_0_14px_#42f8ff]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20"></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,79,216,0.12),transparent_24%,transparent_76%,rgba(66,248,255,0.12))] pointer-events-none"></div>
      </div>
    </section>
  );
};
