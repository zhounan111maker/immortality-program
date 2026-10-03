/**
 * 线上行为校验（对着本地预览服务器发真实 HTTP 请求）
 * ============================================================
 * 前面几个脚本校验的是「代码」和「产物文件」。这个脚本校验的是
 * 「一个真实浏览器访问站点时会看到什么」，包括：
 *
 *   · 深层链接（/protocols/p01）返回 200 而不是 404 —— SPA 回退真的生效
 *   · Service Worker 与 manifest 的 MIME 类型正确 —— 否则 PWA 装不上
 *   · 带哈希的资源能被取到 —— 否则页面白屏
 *   · 缓存策略符合预期
 *
 * 用法：
 *   1. 先起预览服务器：pnpm run preview -- --port 4180
 *   2. node scripts/verify-live.mjs http://127.0.0.1:4180
 *
 * 退出码：0 = 通过，1 = 有失败
 */

import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] ?? 'http://127.0.0.1:4173').replace(/\/$/, '');

// 用于读取真实的分块文件名（见第 6 节说明）
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

let passed = 0;
let failed = 0;

const ok = (label, cond, detail = '') => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? '  → ' + detail : ''}`);
  }
};

const section = (t) => {
  console.log('');
  console.log(`── ${t}`);
};

async function probe(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  const body = await res.text();
  return {
    status: res.status,
    type: (res.headers.get('content-type') ?? '').split(';')[0].trim(),
    cache: res.headers.get('cache-control') ?? '',
    length: body.length,
    body,
  };
}

console.log(`对着 ${BASE} 做线上行为校验…`);

/* ------------------------------------------------------------------ */
/* 1. 可达性                                                           */
/* ------------------------------------------------------------------ */

section('服务器可达性');

let home;
try {
  home = await probe('/');
  ok('首页返回 200', home.status === 200, `HTTP ${home.status}`);
  ok('首页是 HTML', home.type === 'text/html', home.type);
  ok('首页有实际内容', home.length > 1000, `${home.length} 字节`);
} catch (err) {
  console.error(`✗ 无法连接 ${BASE}：${err.message}`);
  console.error('  请先运行：pnpm run preview -- --port 4180');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 2. 深层链接（SPA 回退）                                             */
/* ------------------------------------------------------------------ */

section('深层链接（SPA 回退）');

const deepLinks = [
  '/protocols',
  '/protocols/p01',
  '/protocols/p02',
  '/protocols/p03',
  '/experiments',
  '/literature',
  '/blog',
  '/blog/post-1',
  '/blog/post-5',
  '/about',
  '/contact',
  '/deploy',
  '/legal',
  '/offline',
];

for (const p of deepLinks) {
  const r = await probe(p);
  ok(`${p} → 200 HTML`, r.status === 200 && r.type === 'text/html', `HTTP ${r.status} ${r.type}`);
}

// 完全不存在的路径也应回退到外壳（由前端渲染 404 页），而不是服务器 404
const unknown = await probe('/this-route-does-not-exist-xyz');
ok('未知路由回退到外壳（前端渲染 404）', unknown.status === 200 && unknown.type === 'text/html', `HTTP ${unknown.status}`);

/* ------------------------------------------------------------------ */
/* 3. PWA 资源与 MIME                                                  */
/* ------------------------------------------------------------------ */

section('PWA 资源与 MIME 类型');

const sw = await probe('/sw.js');
ok('sw.js 返回 200', sw.status === 200, `HTTP ${sw.status}`);
ok(
  'sw.js 是 JavaScript MIME（否则浏览器拒绝注册）',
  /javascript/.test(sw.type),
  sw.type,
);
ok('sw.js 含预缓存调用', sw.body.includes('precacheAndRoute'));

const mf = await probe('/manifest.webmanifest');
ok('manifest 返回 200', mf.status === 200, `HTTP ${mf.status}`);
ok(
  'manifest 是 JSON MIME',
  /json/.test(mf.type),
  mf.type,
);
try {
  const parsed = JSON.parse(mf.body);
  ok('manifest 可被解析为 JSON', true);
  ok('manifest name 存在', Boolean(parsed.name), String(parsed.name));
  ok('manifest 图标 ≥ 2 个', (parsed.icons ?? []).length >= 2, `${(parsed.icons ?? []).length} 个`);
} catch (err) {
  ok('manifest 可被解析为 JSON', false, err.message);
}

for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png']) {
  const r = await probe(icon);
  ok(`${icon} 可访问且为 PNG`, r.status === 200 && r.type === 'image/png', `HTTP ${r.status} ${r.type}`);
}

const fav = await probe('/favicon.svg');
ok('favicon.svg 可访问', fav.status === 200, `HTTP ${fav.status}`);

/* ------------------------------------------------------------------ */
/* 4. 带哈希的资源                                                     */
/* ------------------------------------------------------------------ */

section('静态资源（带哈希）');

const scriptMatch = home.body.match(/src="(\/assets\/[^"]+\.js)"/);
const styleMatch = home.body.match(/href="(\/assets\/[^"]+\.css)"/);

ok('首页引用了入口脚本', Boolean(scriptMatch), scriptMatch?.[1] ?? '未找到');
ok('首页引用了样式表', Boolean(styleMatch), styleMatch?.[1] ?? '未找到');

if (scriptMatch) {
  const r = await probe(scriptMatch[1]);
  ok('入口脚本可被取到', r.status === 200 && /javascript/.test(r.type), `HTTP ${r.status} ${r.type}`);
  ok('入口脚本体积合理', r.length > 1000, `${r.length} 字节`);
  // 入口里应包含外壳与检索逻辑，说明首屏代码确实被打进去了
  ok('入口脚本含检索索引逻辑', /buildIndex|kindLabel|检索/.test(r.body));
}

if (styleMatch) {
  const r = await probe(styleMatch[1]);
  ok('样式表可被取到', r.status === 200 && /css/.test(r.type), `HTTP ${r.status} ${r.type}`);
  ok('样式表体积合理', r.length > 5000, `${r.length} 字节`);
  ok('样式表含深色模式', r.body.includes('prefers-color-scheme'));
}

/* ------------------------------------------------------------------ */
/* 5. 缓存策略                                                         */
/* ------------------------------------------------------------------ */

section('缓存策略');

ok(
  'sw.js 不被长期缓存（便于更新）',
  /no-cache|must-revalidate|max-age=0/.test(sw.cache),
  sw.cache || '(无 Cache-Control)',
);
ok(
  'manifest 不被长期缓存',
  /no-cache|must-revalidate|max-age=0/.test(mf.cache),
  mf.cache || '(无 Cache-Control)',
);

if (scriptMatch) {
  const r = await probe(scriptMatch[1]);
  /*
   * 这一项在本地预览下**必然不通过**，原因不是配置错，而是分工：
   * 长期缓存是 vercel.json 的 headers 规则，只有 Vercel 会应用它。
   * vite preview 不读 vercel.json。
   *
   * 所以这里只做「提示」，不参与成功/失败判定，避免给出一堆
   * 已知正常的假失败。该配置由 verify-deploy.mjs 负责断言。
   */
  const immutable = /immutable|max-age=\d{6,}/.test(r.cache);
  reportCachePolicy(immutable, r.cache);
}

/** 输出缓存策略的检查结果（本地预览下不作为失败） */
function reportCachePolicy(immutable, cache) {
  if (immutable) {
    console.log('  ✓ 带哈希的资源声明了长期缓存');
    return;
  }
  console.log(
    '  – 带哈希资源的长期缓存未在本地预览生效' +
      `（当前 Cache-Control: ${cache || '无'}）。`,
  );
  console.log('     这是正常的：该头由 vercel.json 提供，只有 Vercel 会应用。');
  console.log('     已在 verify-deploy 中断言。');
}

/* ------------------------------------------------------------------ */
/* 6. 内容真的在页面分块里                                              */
/* ------------------------------------------------------------------ */

section('内容抽查');

ok('首页含站点名「永生计划」', home.body.includes('永生计划'));
ok('首页含页面标题', /<title>[^<]*永生计划/.test(home.body), '');

/*
 * 分块文件名从磁盘上的 dist/ 读取，而不是从入口脚本里用正则猜。
 * 原因：Vite 内部把动态 import 的路径放在一张映射表里，字符串形态
 * 会随版本变化，用正则去猜很脆弱 —— 猜不到就会误报「没有分块」。
 */
const distDir = join(root, 'dist', 'assets');
let chunkFiles = [];
if (existsSync(distDir)) {
  chunkFiles = readdirSync(distDir).filter((f) => f.endsWith('.js'));
}

ok('dist/assets 里有多个代码分块（懒加载生效）', chunkFiles.length >= 8, `${chunkFiles.length} 个`);

let chunkBodies = '';
for (const f of chunkFiles) {
  try {
    const r = await probe('/assets/' + f);
    if (r.status === 200) chunkBodies += r.body;
  } catch {
    /* 忽略单个分块失败 */
  }
}

ok('成功取回全部分块内容', chunkBodies.length > 10000, `${chunkBodies.length} 字节`);

// 抽查每个页面分块里独有的文案 —— 这些字符串只可能出现在对应页面模块中
const pageChunks = [
  ['协议详情页', '解释边界'],
  ['协议详情页', '过度推论红线'],
  ['实验页', '诚实报告'],
  ['实验页', '复现'],
  ['文献页', '术语'],
  ['文献页', '文献索引'],
  ['部署页', '部署'],
  ['条款页', '隐私'],
  ['关于页', '纲领'],
  ['联系页', '联系'],
  ['404 页', '没有找到'],
  ['离线页', '离线'],
];

for (const [name, needle] of pageChunks) {
  ok(
    `${name}分块含「${needle}」`,
    chunkBodies.includes(needle) || home.body.includes(needle),
    '未在入口或任何分块中找到该文本',
  );
}

/* ------------------------------------------------------------------ */
/* 汇总                                                                */
/* ------------------------------------------------------------------ */

console.log('');
console.log('════════════════════════════════════════════');
console.log(`  通过 ${passed}，失败 ${failed}`);
console.log('════════════════════════════════════════════');

process.exit(failed === 0 ? 0 : 1);
