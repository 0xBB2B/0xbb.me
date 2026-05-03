import React from 'react';

/**
 * BeatSaberPlaceholder 是移动端展示的「桌面专属」占位卡。
 *
 * 真正的 BeatSaberGame 组件依赖键盘 8 键操作（W A S D + I J K L），
 * 在触屏设备上完全不可玩；同时它会拉进约 600KB 的 three.js bundle，
 * 移动端流量浪费。所以移动端通过 React.lazy 跳过 BeatSaberGame 的
 * 动态 import，改渲染本组件作为视觉占位。
 *
 * 视觉与整体一致：像素切角 + 半色调点阵 + 斜条纹 + 胶贴徽章。
 */
export const BeatSaberPlaceholder: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden bg-[#06031a]">
      <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden">
        {/* 底色光晕。 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(155,123,255,0.32),transparent_45%),radial-gradient(circle_at_70%_55%,rgba(102,224,255,0.22),transparent_50%)]" />
        {/* 半色调印刷网点。 */}
        <div className="absolute inset-0 halftone-dots opacity-90 mix-blend-screen" />
        {/* 紫色对角线条纹。 */}
        <div className="absolute inset-0 diagonal-stripes-strong opacity-70" />
        {/* 顶 / 底 HUD 光带。 */}
        <div className="absolute left-0 right-0 top-6 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-70" />
        <div className="absolute left-0 right-0 bottom-6 h-px bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-50" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
          <span className="sticker-chip sticker-chip-pink text-[8px] animate-pulse">/// AHA! TIME</span>

          <div className="flex items-center gap-5">
            <PixelCube color="#7c5dff" border="#9b7bff" arrow="↓" tilt="rotateY(18deg) rotateX(-8deg)" />
            <PixelCube color="#3fc7e8" border="#66e0ff" arrow="↑" tilt="rotateY(-18deg) rotateX(-8deg)" />
          </div>

          <div className="font-cyber text-2xl sm:text-3xl text-white tracking-[0.16em] chrome-edge-soft">RHYTHM_BLADE</div>

          <span className="sticker-chip text-[9px]">DESKTOP ONLY</span>

          <div className="font-pixel text-[8px] sm:text-[9px] text-gray-300 leading-relaxed">
            <div>
              KEYBOARD ONLY:
              <span className="ml-1 text-neon-purple">[WASD]</span>
              <span className="mx-1">/</span>
              <span className="text-neon-cyan">[IJKL]</span>
            </div>
            <div className="mt-2 opacity-80">VISIT 0xbb.me ON DESKTOP</div>
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
 * 3D 倾斜，呼应游戏里飞向判定线的方向块。硬阴影替代柔光，强化像素观感。
 */
const PixelCube: React.FC<PixelCubeProps> = ({ color, border, arrow, tilt }) => (
  <div
    className="relative flex h-16 w-16 items-center justify-center text-3xl font-cyber text-white sm:h-20 sm:w-20"
    style={{
      backgroundColor: color,
      border: `3px solid ${border}`,
      boxShadow: `4px 4px 0 0 #06031a, 6px 6px 0 0 ${border}`,
      transform: `perspective(220px) ${tilt}`,
      imageRendering: 'pixelated',
    }}
  >
    <span className="absolute inset-x-2 top-1 h-2 bg-white/30" />
    <span className="relative">{arrow}</span>
  </div>
);

export default BeatSaberPlaceholder;
