import React from 'react';
import { motion } from 'motion/react';

/**
 * AetherBackground 渲染 Aether Link 主题的浮动方块背景。
 *
 * 在 fixed 全屏层叠上随机分布两组方块：
 *  - 青色组：垂直上升，伴随旋转与淡入淡出；
 *  - 紫罗兰组：水平横移，旋转角度差异形成视觉错落。
 *
 * 所有方块均位于负 z-index 与 pointer-events: none 之下，不影响交互。
 */
export const AetherBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={`teal-${i}`}
          className="absolute bg-game-teal/20 backdrop-blur-sm border border-game-teal/30"
          initial={{
            width: Math.random() * 40 + 10,
            height: Math.random() * 40 + 10,
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
            opacity: 0,
            rotate: 0,
          }}
          animate={{
            y: [null, '-120%'],
            opacity: [0, 1, 1, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 10,
            ease: 'linear',
          }}
        />
      ))}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`purple-${i}`}
          className="absolute bg-game-purple/20 backdrop-blur-sm border border-game-purple/30"
          initial={{
            width: Math.random() * 60 + 20,
            height: Math.random() * 60 + 20,
            x: Math.random() * 100 + '%',
            y: Math.random() * 100 + '%',
            opacity: 0,
            rotate: 45,
          }}
          animate={{
            x: [null, '120%'],
            opacity: [0, 0.8, 0.8, 0],
            rotate: [45, 405],
          }}
          transition={{
            duration: Math.random() * 15 + 15,
            repeat: Infinity,
            delay: Math.random() * 10,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
};

export default AetherBackground;
