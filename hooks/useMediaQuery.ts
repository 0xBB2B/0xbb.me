import { useEffect, useState } from 'react';

/**
 * useMediaQuery 订阅一条 CSS 媒体查询，返回当前是否匹配。
 *
 * 首次渲染就同步读取 window.matchMedia 的当前值（lazy initializer），
 * 避免「桌面端首帧返回 false → 闪一下占位 → 切回游戏」的视觉抖动。
 *
 * @example
 *   const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    // 同步一次当前值，处理 query 字符串变化的极端场景。
    setMatches(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
