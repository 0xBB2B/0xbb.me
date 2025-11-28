import React from 'react';

interface CyberLogoProps {
  className?: string;
}

export const CyberLogo: React.FC<CyberLogoProps> = ({ className = "w-16 h-16" }) => {
  return (
    <div className={`relative group ${className}`}>
      {/* Glow Effect Layer */}
      <div className="absolute inset-0 bg-neon-cyan/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">
        <defs>
          <filter id="logo-glow">
            <feGaussianBlur stdDeviation="1" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Hexagon Background */}
        <path 
          d="M32 2 L58 17 V47 L32 62 L6 47 V17 Z" 
          fill="#050505" 
          stroke="#333" 
          strokeWidth="2"
          className="group-hover:stroke-neon-cyan/50 transition-colors duration-300"
        />

        {/* Prompt Arrow (Cyan) */}
        <path 
          d="M22 22 L36 32 L22 42" 
          fill="none" 
          stroke="#00ffff" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter="url(#logo-glow)"
          className="group-hover:stroke-white transition-colors duration-300"
        />

        {/* Cursor (Pink) - Animated in CSS via 'animate-pulse' equivalent manually here since SVG animate fits better */}
        <rect 
          x="42" 
          y="36" 
          width="10" 
          height="6" 
          fill="#ff00ff" 
          filter="url(#logo-glow)"
          className="animate-pulse"
        />
        
        {/* Decorative circuit lines */}
        <path d="M58 17 L62 15" stroke="#00ffff" strokeWidth="1" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75"/>
        <path d="M6 47 L2 49" stroke="#ff00ff" strokeWidth="1" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100"/>
      </svg>
    </div>
  );
};