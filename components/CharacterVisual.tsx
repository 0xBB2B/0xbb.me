import React from 'react';
import { APP_DATA } from '../data';

const { profile: PROFILE } = APP_DATA;

interface CharacterVisualProps {
  className?: string;
}

/**
 * CharacterVisual 渲染移动端角色立绘卡。
 *
 * 设计上采用「像素剪影 + 半色调印刷质感 + 胶贴徽章」语言：
 *  - 立绘本身用 chrome-edge 双色硬色差，告别柔光发散；
 *  - 容器是像素切角 + 紫色硬阴影，呼应整体设计 token；
 *  - 顶部 / 底部叠半色调与扫描线，强化复古印刷视觉。
 */
export const CharacterVisual: React.FC<CharacterVisualProps> = ({ className = '' }) => {
  return (
    <section className={`relative group ${className}`}>
      <div className="relative border-2 border-neon-purple bg-neon-panel p-2 overflow-hidden pixel-clip-sm pixel-shadow-purple">
        {/* 立绘：双色硬色差描边 + 像素采样，去掉柔光发散。 */}
        <img
          src={PROFILE.fullImage}
          alt="Character Visual"
          className="w-full h-auto object-cover saturate-125 contrast-125 chrome-edge-soft"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* 半色调印刷网点叠层。 */}
        <div className="absolute inset-0 halftone-dots-dense opacity-25 mix-blend-screen pointer-events-none"></div>

        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          <span className="sticker-chip sticker-chip-pink text-[8px]">PLAYER LOCKED</span>
        </div>

        <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2">
          <span className="sticker-chip text-[10px] animate-sticker-wiggle">LV.999</span>
          <span className="font-pixel text-[7px] text-neon-cyan tracking-[0.3em]">AETHER EDIT</span>
        </div>

        {/* CRT 扫描线。 */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_3px] pointer-events-none opacity-20"></div>
        {/* 左右色差光带。 */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,79,216,0.12),transparent_24%,transparent_76%,rgba(102,224,255,0.12))] pointer-events-none"></div>
      </div>
    </section>
  );
};
