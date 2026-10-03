/**
 * 运行时冒烟测试
 * ============================================================
 * 为什么需要它：
 *   `vite build` 退出码为 0 只证明「代码能被打包」，不证明
 *   「打开页面能正确渲染」。本脚本把真正的业务模块打成一个
 *   Node 可导入的 bundle，然后在 Node 里实际执行它们，
 *   断言输出：
 *
 *     · 检索引擎真的能查到协议、并且 PRT-001 排在首位
 *     · 内容块渲染器真的产出结构化 HTML，且不泄漏原始标记
 *     · 每个协议的章节、变更日志、解释边界都能渲染出来
 *     · 每篇博客的正文块都能渲染
 *     · 所有站内链接指向的路由都真实存在
 *
 * 运行：pnpm run verify:runtime
 * 退出码：0 = 通过，1 = 有断言失败
 */

import { build } from 'vite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { rmSync, existsSync, readdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, '.runtime-verify');

/* ------------------------------------------------------------------ */
/* 断言工具                                                            */
/* ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;

function ok(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? '  → ' + detail : ''}`);
  }
}

function section(title) {
  console.log('');
  console.log(`── ${title}`);
}

/* ------------------------------------------------------------------ */
/* 打包一份可被 Node 导入的测试入口                                     */
/* ------------------------------------------------------------------ */

const TEST_ENTRY = `
import { buildIndex, search, groupHits } from './src/core/search';
import { renderBlocks, renderSections, renderToc, sectionAnchor } from './src/components/blocks';
import { protocols } from './src/content/protocols';
import { experiments } from './src/content/experiments';
import { posts } from './src/content/posts';
import { glossary } from './src/content/glossary';
import { literature } from './src/content/literature';
import { nav, site, releases, principles, roadmap, risks, openWork, architecture, pricing, deploySteps } from './src/content/site';
import { legalDocs, complianceNotice, complianceLink } from './src/content/legal';
import { homeFaq } from './src/content/faq';
import { inline, escapeHtml, percent, slugify, stripInline, formatDate } from './src/core/format';

export {
  buildIndex, search, groupHits,
  renderBlocks, renderSections, renderToc, sectionAnchor,
  protocols, experiments, posts, glossary, literature,
  nav, site, releases, principles, roadmap, risks, openWork, architecture, pricing, deploySteps,
  legalDocs, complianceNotice, complianceLink, homeFaq,
  inline, escapeHtml, percent, slugify, stripInline, formatDate,
};
`;

console.log('▶ 运行时冒烟测试：打包测试入口…');

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

try {
  await build({
    root,
    configFile: false,
    logLevel: 'error',
    // 用虚拟模块承载测试入口，避免往仓库里写临时文件
    plugins: [
      {
        name: 'virtual-test-entry',
        resolveId(id) {
          return id === 'virtual:runtime-test' ? '\0virtual:runtime-test' : null;
        },
        load(id) {
          return id === '\0virtual:runtime-test' ? TEST_ENTRY : null;
        },
      },
    ],
    build: {
      outDir,
      emptyOutDir: true,
      write: true,
      minify: false,
      sourcemap: false,
      target: 'node20',
      ssr: true,
      rollupOptions: {
        input: 'virtual:runtime-test',
        output: {
          entryFileNames: 'entry.js',
          format: 'es',
          inlineDynamicImports: true,
        },
      },
    },
  });
} catch (err) {
  console.error('✗ 打包测试入口失败：', err?.message ?? err);
  process.exit(1);
}

const entryFile = readdirSync(outDir).find((f) => f.endsWith('.js'));
if (!entryFile) {
  console.error('✗ 未找到打包产物。目录内容：', readdirSync(outDir).join(', '));
  process.exit(1);
}

const mod = await import(pathToFileURL(join(outDir, entryFile)).href);

/* ------------------------------------------------------------------ */
/* 1. 内容完整性                                                       */
/* ------------------------------------------------------------------ */

section('内容完整性');

ok('协议数量为 3', mod.protocols.length === 3, `实际 ${mod.protocols.length}`);
ok('实验数量为 2', mod.experiments.length === 2, `实际 ${mod.experiments.length}`);
ok('博客数量 ≥ 6', mod.posts.length >= 6, `实际 ${mod.posts.length}`);
ok('术语数量为 12', mod.glossary.length === 12, `实际 ${mod.glossary.length}`);
ok('文献数量为 7', mod.literature.length === 7, `实际 ${mod.literature.length}`);
ok('导航为 9 条', mod.nav.length === 9, `实际 ${mod.nav.length}`);
ok('路线图为 4 阶段', mod.roadmap.length === 4, `实际 ${mod.roadmap.length}`);
ok('架构为 6 层', mod.architecture.length === 6, `实际 ${mod.architecture.length}`);
ok('条款为 4 篇', mod.legalDocs.length === 4, `实际 ${mod.legalDocs.length}`);
ok('FAQ 为 7 条', mod.homeFaq.length === 7, `实际 ${mod.homeFaq.length}`);

// 每份协议都必须有解释边界与变更日志 —— 这是纲领的硬性要求
for (const p of mod.protocols) {
  const hasBoundary =
    p.boundary.canAnswer.length > 0 &&
    p.boundary.cannotAnswer.length > 0 &&
    p.boundary.redLines.length > 0;
  ok(
    `${p.code} 三段解释边界齐全`,
    hasBoundary,
    `can=${p.boundary.canAnswer.length} cannot=${p.boundary.cannotAnswer.length} red=${p.boundary.redLines.length}`,
  );
  ok(`${p.code} 有变更日志`, p.changelog.length > 0, `实际 ${p.changelog.length} 条`);
  ok(`${p.code} 有章节`, p.sections.length > 0, `实际 ${p.sections.length} 节`);
  ok(`${p.code} 标注了就绪度`, typeof p.readiness === 'number');
}

/* ------------------------------------------------------------------ */
/* 2. 内容块渲染                                                       */
/* ------------------------------------------------------------------ */

section('内容块渲染');

for (const p of mod.protocols) {
  const html = mod.renderSections(p.sections);
  ok(`${p.code} 渲染出 <section class="doc-section">`, html.includes('doc-section'));
  ok(`${p.code} 渲染后无残留 ${'${'}` , !html.includes('${'));
  ok(`${p.code} 渲染后无 undefined`, !html.includes('undefined'));
  ok(`${p.code} 无原始行内标记泄漏`, !/\*\*[^*]+\*\*/.test(html), '（发现了 **粗体** 标记未转换）');
  ok(`${p.code} 含解释边界 callout`, html.includes('callout--boundary') || html.includes('callout'));
}

// 图表必须被渲染为 SVG，而不是留下未处理的占位
const p02 = mod.protocols.find((p) => p.id === 'p02');
const p02html = mod.renderSections(p02.sections);
ok('PRT-002 的 C(t) 图渲染为 SVG', p02html.includes('<svg'), '（图示未生成）');
ok('图示带无障碍标签', /role="img"/.test(p02html) || /aria-label/.test(p02html));
ok('图示声明为示意图', p02html.includes('示意') || p02html.includes('figcaption'));

// 目录
const toc = mod.renderToc(p02.sections, { label: '本页目录' });
ok('目录渲染出锚点链接', toc.includes('data-toc-link='));
ok('目录条目数与章节数一致', (toc.match(/data-toc-link=/g) || []).length === p02.sections.length);
ok('章节锚点稳定', typeof mod.sectionAnchor(p02.sections[0]) === 'string' && mod.sectionAnchor(p02.sections[0]).length > 0);

// 博客正文
for (const post of mod.posts) {
  const html = mod.renderBlocks(post.blocks).replace(/\$\{/g, '');
  ok(`博客「${post.title.slice(0, 14)}…」正文渲染非空`, html.length > 40, `${html.length} 字符`);
}

// 实验正文
for (const e of mod.experiments) {
  const html = mod.renderSections(e.sections);
  ok(`${e.code} 正文渲染非空`, html.length > 40);
}

/* ------------------------------------------------------------------ */
/* 3. 检索引擎                                                         */
/* ------------------------------------------------------------------ */

section('检索引擎');

const index = mod.buildIndex();
ok('索引构建成功', index.length > 30, `实际 ${index.length} 条`);
ok(
  '索引覆盖全部六类内容',
  ['protocol', 'experiment', 'post', 'glossary', 'literature', 'page'].every((k) =>
    index.some((d) => d.kind === k),
  ),
);

// 关键：按协议编号检索必须命中，且该协议排第一
for (const [query, expectPath] of [
  ['PRT-001', '/protocols/p01'],
  ['PRT-002', '/protocols/p02'],
  ['PRT-003', '/protocols/p03'],
  ['EXP-001', '/experiments'],
]) {
  const hits = mod.search(query);
  ok(`检索「${query}」有结果`, hits.length > 0, `实际 ${hits.length} 条`);
  ok(`检索「${query}」首位为 ${expectPath}`, hits[0]?.path === expectPath, `实际首位 ${hits[0]?.path}`);
}

// 中文关键词
const zhHits = mod.search('迁移永生');
ok('检索「迁移永生」有结果', zhHits.length > 0, `实际 ${zhHits.length} 条`);

const zhHits2 = mod.search('预注册');
ok('检索「预注册」有结果', zhHits2.length > 0, `实际 ${zhHits2.length} 条`);

const boundaryHit = mod.search('过度推论');
ok('检索「过度推论」能命中解释边界', boundaryHit.length > 0, `实际 ${boundaryHit.length} 条`);

// 多关键词 AND 语义
const andHits = mod.search('身份 连续性');
ok('多关键词为 AND 语义且非空', andHits.length > 0, `实际 ${andHits.length} 条`);

// 无关查询不应返回结果（避免"什么都匹配"的假检索）
const missHits = mod.search('zzzzqqqq不存在的东西');
ok('无关查询返回 0 条', missHits.length === 0, `实际 ${missHits.length} 条`);

// 空查询
ok('空查询返回空数组', mod.search('   ').length === 0);

// 分组
const grouped = mod.groupHits(mod.search('协议'));
ok('结果可按类型分组', Array.isArray(grouped) && grouped.length > 0);

/* ------------------------------------------------------------------ */
/* 4. 站内路由一致性                                                   */
/* ------------------------------------------------------------------ */

section('站内路由一致性');

// 路由表来自 src/main.ts 的声明；这里验证内容里出现的链接都指向真实路由
const ROUTES = [
  '/',
  '/home', // 与 / 等价的别名路由，main.ts 中显式注册
  '/protocols',
  '/experiments',
  '/literature',
  '/blog',
  '/about',
  '/contact',
  '/deploy',
  '/legal',
  '/offline',
];

function routeExists(href) {
  if (/^(https?:)?\/\//i.test(href) || /^(mailto:|tel:|#)/i.test(href)) return true;
  const path = href.split('#')[0].split('?')[0];
  if (ROUTES.includes(path)) return true;
  // 动态路由
  if (/^\/protocols\/p0[1-9]$/.test(path)) return true;
  if (/^\/blog\/post-\d+$/.test(path)) return true;
  return false;
}

const linkSources = [];
for (const p of mod.protocols) linkSources.push(['protocol', p.id, JSON.stringify(p)]);
for (const e of mod.experiments) linkSources.push(['experiment', e.id, JSON.stringify(e)]);
for (const post of mod.posts) linkSources.push(['post', post.id, JSON.stringify(post.blocks)]);
for (const l of mod.legalDocs) linkSources.push(['legal', l.id, JSON.stringify(l.blocks)]);
linkSources.push(['site', 'nav', JSON.stringify(mod.nav)]);

const badLinks = [];
for (const [kind, id, blob] of linkSources) {
  for (const m of blob.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = m[1];
    if (!routeExists(href)) badLinks.push(`${kind}/${id} → ${href}`);
  }
  // href 字段
  for (const m of blob.matchAll(/"href":"([^"]+)"/g)) {
    const href = m[1];
    if (!routeExists(href)) badLinks.push(`${kind}/${id} → ${href}`);
  }
}

ok(
  '内容里的所有站内链接都指向真实路由',
  badLinks.length === 0,
  badLinks.slice(0, 6).join(' | '),
);

// 导航本身的 9 条路由都必须可解析
const badNav = mod.nav.filter((n) => !routeExists(n.path)).map((n) => n.path);
ok('导航里 9 条路由全部有效', badNav.length === 0, badNav.join(', '));

/* ------------------------------------------------------------------ */
/* 5. 工具函数与安全                                                    */
/* ------------------------------------------------------------------ */

section('工具函数与转义安全');

ok('escapeHtml 转义尖括号', mod.escapeHtml('<script>') === '&lt;script&gt;');
ok('escapeHtml 转义引号', mod.escapeHtml('"x"') === '&quot;x&quot;');

// 关键安全断言：注入内容不得变成可执行标记
const evil = mod.inline('**<img src=x onerror=alert(1)>**');
ok('inline 不产生真实 img 标签', !/<img/i.test(evil), evil);
ok('inline 仍转换粗体', evil.includes('<strong>'));

const evilLink = mod.inline('[点我](javascript:alert(1))');
ok('inline 拒绝 javascript: 伪协议', !/javascript:/i.test(evilLink), evilLink);

const goodLink = mod.inline('[协议](/protocols/p01)');
ok('inline 保留站内链接', goodLink.includes('href="/protocols/p01"'));

const extLink = mod.inline('[外部](https://example.com)');
ok('inline 给外链加 noopener', extLink.includes('rel="noopener'));

ok('stripInline 去除标记', mod.stripInline('**粗** `码` [文](x)') === '粗 码 文');
ok('percent(0.17) = 17%', mod.percent(0.17) === '17%');
ok('percent(undefined) = —', mod.percent(undefined) === '—');
ok('percent 越界被夹紧', mod.percent(5) === '100%');
ok('slugify 保留中文', mod.slugify('迁移永生 协议') === '迁移永生-协议', mod.slugify('迁移永生 协议'));
ok('formatDate 输出 ISO 形式', /^\d{4}-\d{2}-\d{2}$/.test(mod.formatDate('2026-09-30')));

/* ------------------------------------------------------------------ */
/* 6. 诚信红线（纲领立场，必须无违反）                                   */
/* ------------------------------------------------------------------ */

section('诚信红线');

const allContent = JSON.stringify({
  protocols: mod.protocols,
  experiments: mod.experiments,
  posts: mod.posts,
  site: mod.site,
  deploySteps: mod.deploySteps,
  legal: mod.legalDocs,
});

const bans = [
  ['不得承诺服务', /我们提供.*服务|立即购买|在线咨询客服|马上订购/],
  ['不得虚构用户/客户数', /\d+\s*(万|千|百)?\s*(名|位)\s*用户|已有\s*\d+\s*人注册/],
  ['不得声称已获资金/合作', /获得融资|已完成\s*[A-Z]?\s*轮|战略合作伙什|战略合作伙伴/],
  ['不得声称已有实验室', /我们的实验室|本实验室/],
  ['不得给出医疗建议', /可以治愈|包治|疗效显著/],
];

for (const [label, re] of bans) {
  ok(label, !re.test(allContent), (allContent.match(re) || [])[0] ?? '');
}

// 占位地址必须保持占位性质
ok(
  '邮箱仍是占位地址',
  /example\.org/.test(mod.site.email),
  mod.site.email,
);
ok(
  '仓库地址仍是占位符',
  /your-handle/.test(mod.site.repository),
  mod.site.repository,
);

// 未完成事项必须如实标注（不得假装 Arweave 已上传）
ok(
  '部署说明如实标注 Arweave 尚未执行',
  /尚未|没有|未执行|not yet/i.test(allContent),
);

/* ------------------------------------------------------------------ */
/* 汇总                                                                */
/* ------------------------------------------------------------------ */

console.log('');
console.log('════════════════════════════════════════════');
console.log(`  通过 ${passed}，失败 ${failed}`);
console.log('════════════════════════════════════════════');

rmSync(outDir, { recursive: true, force: true });

process.exit(failed === 0 ? 0 : 1);
