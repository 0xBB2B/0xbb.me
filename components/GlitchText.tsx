import React from 'react';

interface GlitchTextProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
}

export const GlitchText: React.FC<GlitchTextProps> = ({ text, as = 'span', className = '' }) => {
  const Tag = as;
  
  return (
    <Tag className={`relative inline-block group hover:text-neon-pink transition-colors duration-300 ${className}`}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-neon-cyan opacity-0 group-hover:opacity-70 animate-glitch translate-x-[2px]">
        {text}
      </span>
      <span className="absolute top-0 left-0 -z-10 w-full h-full text-neon-purple opacity-0 group-hover:opacity-70 animate-glitch -translate-x-[2px] delay-75">
        {text}
      </span>
    </Tag>
  );
};
