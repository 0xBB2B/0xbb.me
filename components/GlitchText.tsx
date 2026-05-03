import React from 'react';
import { motion } from 'motion/react';

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

/**
 * GlitchText 渲染 Aether Link 主题的故障文字效果。
 *
 * 在主体文本背后叠加两层错位影子（粉色 / 青色），通过 motion 让两层
 * 沿微小幅度反相抖动，营造模拟 CRT 信号干扰的故障美感。
 *
 * @param text 主体文本
 * @param className 容器类名（用于尺寸与字体）
 * @param as 主体语义标签，默认 h1
 */
export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  className = '',
  as = 'h1',
}) => {
  const Tag = as;

  return (
    <div className={`relative inline-block ${className}`}>
      <Tag className="relative z-10">{text}</Tag>
      <motion.span
        className="absolute top-0 left-0 -z-10 text-game-pink opacity-70"
        animate={{
          x: [0, -2, 2, -1, 0],
          y: [0, 1, -1, 2, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.2,
          ease: 'linear',
        }}
        aria-hidden="true"
      >
        {text}
      </motion.span>
      <motion.span
        className="absolute top-0 left-0 -z-10 text-game-teal opacity-70"
        animate={{
          x: [0, 2, -2, 1, 0],
          y: [0, -1, 1, -2, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.2,
          delay: 0.1,
          ease: 'linear',
        }}
        aria-hidden="true"
      >
        {text}
      </motion.span>
    </div>
  );
};

export default GlitchText;
