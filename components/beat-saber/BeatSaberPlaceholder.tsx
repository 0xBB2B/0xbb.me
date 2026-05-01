import React from 'react';

/**
 * BeatSaberPlaceholder 是移动端展示的「桌面专属」占位卡。
 *
 * 真正的 BeatSaberGame 组件依赖键盘 8 键操作（W A S D + I J K L），
 * 在触屏设备上完全不可玩；同时它会拉进约 600KB 的 three.js bundle，
 * 移动端流量浪费。所以移动端通过 React.lazy 跳过 BeatSaberGame 的
 * 动态 import，改渲染本组件作为视觉占位。
 *
 * 设计上保持与 BeatSaberGame 容器同样的外框样式（紫罗兰描边 + 紫粉
 * 阴影），让移动端访客一眼能看出这里有一个"游戏区位"，并清楚需要
 * 在桌面浏览器才能体验。
 */
export const BeatSaberPlaceholder: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden border border-neon-purple/55 bg-[#06031a] shadow-[0_0_36px_rgba(155,123,255,0.22)]">
      <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-[#06031a] overflow-hidden">
        {/* 像素网格背景。 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(155,123,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,79,216,0.06)_1px,transparent_1px)] bg-[size:36px_36px]" />
        {/* 远景渐变光晕。 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(155,123,255,0.28),transparent_45%),radial-gradient(circle_at_70%_55%,rgba(102,224,255,0.18),transparent_50%)]" />
        {/* 顶部 / 底部光带。 */}
        <div className="absolute left-0 right-0 top-6 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-70" />
        <div className="absolute left-0 right-0 bottom-6 h-px bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-50" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
          <div className="text-[10px] tracking-[0.4em] text-neon-pink animate-pulse">/// AHA! TIME</div>

          <div className="flex items-center gap-5">
            <PixelCube color="#7c5dff" border="#9b7bff" arrow="↓" tilt="rotateY(18deg) rotateX(-8deg)" />
            <PixelCube color="#3fc7e8" border="#66e0ff" arrow="↑" tilt="rotateY(-18deg) rotateX(-8deg)" />
          </div>

          <div className="font-cyber text-2xl sm:text-3xl text-white tracking-[0.16em]">RHYTHM_BLADE</div>

          <div className="border border-neon-yellow/70 bg-neon-yellow/10 px-3 py-1 text-[10px] tracking-[0.3em] text-neon-yellow shadow-[0_0_14px_rgba(248,255,114,0.3)]">
            DESKTOP ONLY
          </div>

          <div className="font-mono text-[10px] sm:text-[11px] text-gray-400 leading-relaxed">
            <div>
              需要键盘双手操作：
              <span className="ml-1 text-neon-purple">[W A S D]</span>
              <span className="mx-1">/</span>
              <span className="text-neon-cyan">[I J K L]</span>
            </div>
            <div className="mt-1 opacity-80">请在桌面浏览器访问 0xbb.me 体验 3D 节奏光剑。</div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PixelCubeProps {
  color: string;
  border: string;
  arrow: string;
  tilt: string;
}

/**
 * PixelCube 渲染一个紫罗兰/像素青风格的小方块，配 CSS 透视让它略带
 * 3D 倾斜，呼应游戏里飞向判定线的方向块。
 */
const PixelCube: React.FC<PixelCubeProps> = ({ color, border, arrow, tilt }) => (
  <div
    className="relative flex h-16 w-16 items-center justify-center text-3xl font-cyber text-white sm:h-20 sm:w-20"
    style={{
      backgroundColor: color,
      border: `2px solid ${border}`,
      boxShadow: `0 0 24px ${border}66`,
      transform: `perspective(220px) ${tilt}`,
    }}
  >
    <span className="absolute inset-x-2 top-1 h-2 bg-white/30" />
    <span className="relative">{arrow}</span>
  </div>
);

export default BeatSaberPlaceholder;
