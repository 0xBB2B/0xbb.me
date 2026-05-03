import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PROFILE } from '../../constants';

/**
 * Terminal 渲染 Aether Link 主题入站时的 boot 序列。
 *
 * 按 400ms 节奏逐行打印固定文案，全部打印完毕后停留 1s 自动淡出。
 * 文案借助 PROFILE.name 拼出当前用户身份，让序列与作品集主体保持一致。
 */
export const Terminal: React.FC = () => {
  const [lines, setLines] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);

  // boot 序列文案：保持 Aether Link 原版节奏，引入用户身份。
  const fullText = [
    '> initializing_aether_link...',
    '> scanning_user_sector...',
    `> permission_granted: [${PROFILE.name.toLowerCase()}]`,
    '> downloading_reality_patch...',
    '> patches_applied_successfully.',
    '> welcome_to_level_999.',
  ];

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < fullText.length) {
        setLines((prev) => [...prev, fullText[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(() => setComplete(true), 1000);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {!complete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-[200] bg-game-dark flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg font-mono text-game-teal space-y-2 pixel-card border-game-teal/50">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            {lines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm md:text-base"
              >
                {line}
              </motion.p>
            ))}
            <motion.div
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-2 h-5 bg-game-teal align-middle ml-1"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Terminal;
