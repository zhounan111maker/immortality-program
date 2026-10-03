/**
 * 部署就绪校验
 * ============================================================
 * 上线前最后一道检查：确认「本地构建出来的东西」和
 * 「Vercel 上的配置」彼此一致，不会出现
 * 「本地跑得通、线上 404」这类问题。
 *
 * 检查项：
 *   1. vercel.json 是合法 JSON 且是当前推荐的 rewrites 形式
 *   2. SPA 回退规则存在，且没有把静态资源也吞掉
 *   3. 关键响应头（sw.js / manifest 的 Content-Type 与缓存）齐备
 *   4. 产物目录与 Vercel 的 outputDirectory 一致
 *   5. 构建产物里存在 Service Worker 与 manifest（PWA 可安装的前提）
 *   6. 深层链接所需的入口文件存在
 *   7. 文档里引用的 npm 脚本都真实存在（避免指南教了不存在的命令）
 *
 * 运行：pnpm run verify:deploy
 * 退出码：0 = 可以部署，1 = 有问题
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/* ------------------------------------------------------------------ */
/* 1. vercel.json                                                      */
/* ------------------------------------------------------------------ */

section('vercel.json');

const vercelPath = join(root, 'vercel.json');
ok('vercel.json 存在', existsSync(vercelPath));

let vercel = null;
try {
  vercel = JSON.parse(readFileSync(vercelPath, 'utf8'));
  ok('vercel.json 是合法 JSON', true);
} catch (err) {
  ok('vercel.json 是合法 JSON', false, err.message);
}

if (vercel) {
  ok('声明了 framework', typeof vercel.framework === 'string', String(vercel.framework));
  ok(
    'buildCommand 使用 pnpm run build',
    vercel.buildCommand === 'pnpm run build',
    String(vercel.buildCommand),
  );
  ok('outputDirectory 为 dist', vercel.outputDirectory === 'dist', String(vercel.outputDirectory));

  // 这是最容易踩的坑：给 pnpm 设 Install Command 会让 Vercel 用最老的 pnpm
  ok(
    '未设置 installCommand（避免 Vercel 回落到 pnpm 6）',
    vercel.installCommand === undefined,
    String(vercel.installCommand),
  );

  // 推荐使用 rewrites，而不是旧的 routes + handle: filesystem
  ok('使用推荐的 rewrites 形式', Array.isArray(vercel.rewrites) && vercel.rewrites.length > 0);
  ok('未使用已过时的 routes', vercel.routes === undefined);

  if (Array.isArray(vercel.rewrites)) {
    const toIndex = vercel.rewrites.find((r) => r.destination === '/index.html');
    ok('存在指向 index.html 的 SPA 回退', Boolean(toIndex), JSON.stringify(vercel.rewrites));

    if (toIndex) {
      // 回退规则必须排除静态资源，否则 sw.js 会被喂成 HTML
      const src = toIndex.source ?? '';
      for (const needed of ['assets/', 'icons/', 'sw\\.js', 'manifest\\.webmanifest']) {
        ok(
          `回退规则排除了 ${needed.replace('\\\\', '')}`,
          src.includes(needed),
          src,
        );
      }
    }
  }

  // 关键响应头
  const headers = Array.isArray(vercel.headers) ? vercel.headers : [];
  const findHeader = (srcFragment, key) =>
    headers.some(
      (h) =>
        (h.source ?? '').includes(srcFragment) &&
        Array.isArray(h.headers) &&
        h.headers.some((x) => (x.key ?? '').toLowerCase() === key.toLowerCase()),
    );

  ok('sw.js 声明了 Content-Type', findHeader('sw.js', 'Content-Type'));
  ok('sw.js 声明了不缓存', findHeader('sw.js', 'Cache-Control'));
  ok('manifest 声明了 Content-Type', findHeader('manifest', 'Content-Type'));
  ok('assets 声明了长期不可变缓存', findHeader('assets', 'Cache-Control'));
  ok('声明了 X-Content-Type-Options', findHeader('/', 'X-Content-Type-Options'));
}

/* ------------------------------------------------------------------ */
/* 2. package.json 与文档一致性                                        */
/* ------------------------------------------------------------------ */

section('package.json 与文档一致性');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const scripts = pkg.scripts ?? {};

ok('build 脚本会先做类型检查', /tsc --noEmit/.test(scripts.build ?? ''), scripts.build);
ok('engines.node 满足 Vite 8 要求', />=20\.19/.test(pkg.engines?.node ?? ''), pkg.engines?.node);

// 指南里教用户的命令必须真实存在
const bannedMention = ['verify:runtime', 'verify:deploy', 'archive', 'typecheck', 'preview', 'dev', 'build'];
for (const s of bannedMention) {
  ok(`脚本 ${s} 存在`, typeof scripts[s] === 'string');
}

const guidePath = join(root, 'docs', '零基础部署指南.md');
ok('部署指南存在', existsSync(guidePath));

if (existsSync(guidePath)) {
  const guide = readFileSync(guidePath, 'utf8');
  ok('指南篇幅充分（>1200 行）', guide.split('\n').length > 1200, `${guide.split('\n').length} 行`);

  // 代码围栏必须成对
  const fences = (guide.match(/^```/gm) || []).length;
  ok('指南代码围栏成对', fences % 2 === 0, `${fences} 个围栏标记`);

  // 指南里出现的 pnpm 脚本都必须在 package.json 里。
  // 只匹配真正的子命令，跳过：
  //   · 标志（--frozen-lockfile 等）
  //   · 版本号（`pnpm v9.15.9` 这样的输出样本）
  //   · 已知的 pnpm 内建子命令
  const referenced = new Set();
  for (const m of guide.matchAll(/pnpm\s+(?:run\s+)?([a-z][a-z0-9:_-]*)/gi)) {
    const cmd = m[1];
    if (/^v\d+$/.test(cmd)) continue; // 版本号，如 v9
    referenced.add(cmd);
  }
  const builtin = [
    'install', 'add', 'remove', 'update', 'dlx', 'exec', 'store', 'config',
    'why', 'list', 'ls', 'outdated', 'prune', 'link', 'patch', 'publish',
    'run', 'test', 'start', 'deploy', 'licenses', 'audit', 'root', 'bin',
    'setup', 'doctor', 'create', 'init', 'import', 'rebuild', 'fetch',
  ];
  const known = new Set([...Object.keys(scripts), ...builtin]);
  const unknown = [...referenced].filter((r) => !known.has(r));
  ok('指南引用的 pnpm 命令都真实存在', unknown.length === 0, unknown.join(', '));

  // 指南必须包含关键章节
  for (const kw of ['Root Directory', 'Install Command', 'vercel.json', '.npmrc', 'Node.js', '自定义域名', '报错']) {
    ok(`指南涵盖「${kw}」`, guide.includes(kw));
  }

  // 必须提醒 Node 版本下限
  ok('指南提醒了 Node 20.19+ 下限', /20\.19/.test(guide));
}

/* ------------------------------------------------------------------ */
/* 3. 构建产物                                                         */
/* ------------------------------------------------------------------ */

section('构建产物');

const dist = join(root, 'dist');
ok('dist/ 存在（已构建）', existsSync(dist), '请先运行 pnpm run build');

if (existsSync(dist)) {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dist);

  const rel = files.map((f) => f.slice(dist.length + 1).replace(/\\/g, '/'));

  ok('产出 index.html（SPA 入口）', rel.includes('index.html'));
  ok('产出 manifest.webmanifest（可安装前提）', rel.includes('manifest.webmanifest'));
  ok('产出 sw.js（离线前提）', rel.includes('sw.js'));
  ok('产出 PWA 图标 192', rel.some((r) => r.includes('icon-192')));
  ok('产出 PWA 图标 512', rel.some((r) => r.includes('icon-512')));
  ok('产出 maskable 图标', rel.some((r) => r.includes('maskable')));
  ok('产出 favicon', rel.includes('favicon.svg'));
  ok('产出 robots.txt', rel.includes('robots.txt'));
  ok('含有带哈希的静态资源', rel.some((r) => /^assets\/.+-[A-Za-z0-9_-]{8}\.js$/.test(r)));
  ok('产出了按页面拆分的代码块（懒加载生效）', rel.filter((r) => /^assets\/.+\.js$/.test(r)).length >= 8,
     `${rel.filter((r) => /^assets\/.+\.js$/.test(r)).length} 个 js`);

  // index.html 必须引用 manifest 与入口脚本
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  ok('index.html 引用 manifest', /rel=["']manifest["']/.test(html));
  ok('index.html 有 viewport（移动端前提）', /name=["']viewport["']/.test(html));
  ok('index.html 声明 lang=zh-CN', /lang=["']zh-CN["']/.test(html));
  ok('index.html 有 noscript 兜底', /<noscript>/i.test(html));
  ok('index.html 引用了模块脚本', /type=["']module["']/.test(html));
  ok('index.html 有 theme-color', /name=["']theme-color["']/.test(html));

  // manifest 内容
  const mf = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
  ok('manifest 有 start_url = /', mf.start_url === '/', String(mf.start_url));
  ok('manifest 有 scope = /', mf.scope === '/', String(mf.scope));
  ok('manifest display 为 standalone', mf.display === 'standalone', String(mf.display));
  ok('manifest 关闭 prefer_related_applications', mf.prefer_related_applications === false);
  ok(
    'manifest 图标含 192 与 512',
    mf.icons.some((i) => i.sizes === '192x192') && mf.icons.some((i) => i.sizes === '512x512'),
  );

  // 移动端：CSS 必须包含响应式断点
  const cssFile = rel.find((r) => r.startsWith('assets/') && r.endsWith('.css'));
  if (cssFile) {
    const css = readFileSync(join(dist, cssFile), 'utf8');
    ok('CSS 含移动端断点', /@media[^{]*max-width/.test(css));
    ok('CSS 含桌面端断点', /@media[^{]*min-width/.test(css));
    ok('CSS 含深色模式', /prefers-color-scheme:\s*dark/.test(css));
    ok('CSS 含打印样式', /@media\s+print/.test(css));
    ok('CSS 尊重减少动效偏好', /prefers-reduced-motion/.test(css));
    ok('CSS 处理了安全区（刘海屏）', /env\(safe-area-inset/.test(css) || /safe-area/.test(css));
  } else {
    ok('找到并检查了 CSS 产物', false);
  }
}

/* ------------------------------------------------------------------ */
/* 4. 归档产物                                                         */
/* ------------------------------------------------------------------ */

section('单文件归档产物');

const archiveDir = join(root, 'dist-archive');
if (existsSync(archiveDir)) {
  const af = readdirSync(archiveDir);
  ok('归档目录只含 1 个文件', af.length === 1, af.join(', '));
} else {
  ok('dist-archive/ 存在', false, '请先运行 pnpm run archive');
}

/* ------------------------------------------------------------------ */
/* 汇总                                                                */
/* ------------------------------------------------------------------ */

console.log('');
console.log('════════════════════════════════════════════');
console.log(`  通过 ${passed}，失败 ${failed}`);
console.log('════════════════════════════════════════════');

process.exit(failed === 0 ? 0 : 1);
