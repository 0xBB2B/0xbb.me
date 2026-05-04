import type { MouseEvent } from 'react';

/**
 * handleAnchorClick 拦截站内锚点 `<a href="#xxx">` 的点击，
 * 阻止浏览器默认的 hash 跳转（避免 `#xxx` 出现在 URL 上），
 * 改用 `scrollIntoView` 平滑滚动到目标 section。
 *
 * 仅处理 `href` 以 `#` 开头且能在 DOM 中找到对应 id 的链接；
 * 其余情况（外链、找不到目标）走浏览器原生行为。
 */
export function handleAnchorClick(e: MouseEvent<HTMLAnchorElement>): void {
  const href = e.currentTarget.getAttribute('href');
  if (!href || !href.startsWith('#')) return;

  const target = document.getElementById(href.slice(1));
  if (!target) return;

  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth' });
}
