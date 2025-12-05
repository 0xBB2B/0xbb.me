import React from 'react';
import { APP_DATA } from '../data';

const { profile: PROFILE } = APP_DATA;

interface CharacterVisualProps {
  className?: string;
}

export const CharacterVisual: React.FC<CharacterVisualProps> = ({ className = '' }) => {
  return (
    <section className={`relative group ${className}`}>
      <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink via-purple-500 to-neon-cyan opacity-50 group-hover:opacity-80 blur transition duration-500"></div>
      <div className="relative border border-gray-800 bg-black/80 p-2 overflow-hidden">
        <img 
          src={PROFILE.fullImage} 
          alt="Character Visual" 
          className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-500 mix-blend-luminosity hover:mix-blend-normal" 
        />
        
        {/* Overlay UI Elements */}
        <div className="absolute top-4 left-4 flex flex-col gap-1">
          <div className="text-[10px] text-neon-pink font-bold tracking-widest">TARGET_LOCKED</div>
          <div className="w-12 h-[2px] bg-neon-pink"></div>
        </div>
        
        {/* <div className="absolute bottom-4 right-4 text-right">
          <div className="text-xs text-neon-cyan font-mono">{(PROFILE as any).codeName || "OPERATIVE_01"}</div>
          <div className="text-[10px] text-gray-500">SYNC_RATE: 98.4%</div>
        </div> */}

        {/* Scanline effect */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] pointer-events-none opacity-20"></div>
      </div>
    </section>
  );
};
