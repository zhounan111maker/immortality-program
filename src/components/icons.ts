/**
 * 图标集
 * ============================================================
 * 全部为内联 SVG，无图标字体、无外部请求。
 * 统一 24×24 视窗、currentColor 描边，可随文字颜色变化。
 */

const wrap = (path: string, opts: { fill?: boolean; size?: number } = {}): string => {
  const size = opts.size ?? 24;
  const attrs = opts.fill
    ? `fill="currentColor"`
    : `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" ${attrs} aria-hidden="true" focusable="false">${path}</svg>`;
};

export const icons = {
  arrowRight: () => wrap(`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  arrowLeft: () => wrap(`<path d="M19 12H5M11 18l-6-6 6-6"/>`),
  arrowUp: () => wrap(`<path d="M12 19V5M5 12l7-7 7 7"/>`),
  external: () => wrap(`<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>`),
  search: () => wrap(`<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>`),
  menu: () => wrap(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
  close: () => wrap(`<path d="M6 6l12 12M18 6 6 18"/>`),
  check: () => wrap(`<path d="M20 6 9 17l-5-5"/>`),
  chevronDown: () => wrap(`<path d="m6 9 6 6 6-6"/>`),
  chevronRight: () => wrap(`<path d="m9 6 6 6-6 6"/>`),
  sun: () => wrap(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
  moon: () => wrap(`<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>`),
  contrast: () => wrap(`<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" stroke="none"/>`),
  bookmark: () => wrap(`<path d="M6 4h12v17l-6-4-6 4z"/>`),
  bookmarkFilled: () => wrap(`<path d="M6 4h12v17l-6-4-6 4z" fill="currentColor" stroke="none"/>`),
  copy: () => wrap(`<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>`),
  download: () => wrap(`<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/>`),
  printer: () => wrap(`<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 17h10v4H7z"/>`),
  home: () => wrap(`<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>`),
  book: () => wrap(`<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M9 3v18"/>`),
  flask: () => wrap(`<path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9"/>`),
  library: () => wrap(`<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16.5 5 3.4 15"/>`),
  note: () => wrap(`<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>`),
  info: () => wrap(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>`),
  shield: () => wrap(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`),
  layers: () => wrap(`<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>`),
  mail: () => wrap(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>`),
  code: () => wrap(`<path d="m8 6-5 6 5 6M16 6l5 6-5 6"/>`),
  users: () => wrap(`<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.4M17 20a6 6 0 0 0-2-4.5"/>`),
  compass: () => wrap(`<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>`),
  target: () => wrap(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>`),
  scale: () => wrap(`<path d="M12 3v18"/><path d="M6 7h12"/><path d="m6 7-3 7h6zM18 7l-3 7h6z"/>`),
  gitBranch: () => wrap(`<circle cx="6" cy="5" r="2.4"/><circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="9" r="2.4"/><path d="M6 7.4v9.2"/><path d="M18 11.4a6 6 0 0 1-6 6H6"/>`),
  archive: () => wrap(`<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>`),
  refresh: () => wrap(`<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>`),
  warning: () => wrap(`<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/>`),
  wifiOff: () => wrap(`<path d="M2 2l20 20"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 3-1.9M19 12.9a10 10 0 0 0-6-2.8"/><path d="M2 8.8a15 15 0 0 1 4.5-2.3M22 8.8a15 15 0 0 0-11-2.7"/><path d="M12 20h.01"/>`),
  install: () => wrap(`<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 8v6M9.5 11.5 12 14l2.5-2.5"/>`),
  filter: () => wrap(`<path d="M3 5h18l-7 8v6l-4 2v-8z"/>`),
  list: () => wrap(`<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>`),
  clock: () => wrap(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>`),
  tag: () => wrap(`<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>`),
  file: () => wrap(`<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>`),
  infinity: () => wrap(`<path d="M7 9a3 3 0 1 0 0 6c2.5 0 3.5-6 6-6a3 3 0 1 1 0 6c-2.5 0-3.5-6-6-6z"/>`),
  hash: () => wrap(`<path d="M9 3 7 21M17 3l-2 18M4 9h16M3 15h16"/>`),
  activity: () => wrap(`<path d="M3 12h4l3 8 4-16 3 8h4"/>`),
  eye: () => wrap(`<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/>`),
};

export type IconName = keyof typeof icons;

/** 便捷渲染：icon('search') */
export function icon(name: IconName): string {
  return icons[name]();
}
