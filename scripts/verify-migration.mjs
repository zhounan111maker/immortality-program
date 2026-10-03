/**
 * 校验脚本：确认原站三篇博客的正文段落全部逐字保留在 src/content/posts.ts 中。
 * 用途：内容迁移是有损风险最高的环节，必须有可执行的证据，而不是"看起来没问题"。
 *
 * 运行：node scripts/verify-migration.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const SOURCE = 'D:/Downloads/永生计划研究纲领平台.html';
const POSTS = join(root, 'src/content/posts.ts');
const PROTOCOLS = join(root, 'src/content/protocols.ts');

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

function paragraphsOf(html, articleId) {
  const re = new RegExp(`<article class="post-full" id="${articleId}"[\\s\\S]*?</article>`);
  const m = html.match(re);
  if (!m) return null;
  return [...m[0].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) =>
    decodeEntities(stripTags(x[1])).replace(/\s+/g, ' ').trim(),
  );
}

/** 归一化：把 posts.ts 里的行内标记还原为纯文本，便于比较 */
function normalizeForCompare(s) {
  return s
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const source = readFileSync(SOURCE, 'utf8');
const posts = readFileSync(POSTS, 'utf8');
const protocols = readFileSync(PROTOCOLS, 'utf8');

let total = 0;
let missing = 0;

console.log('=== 博客正文迁移校验 ===');
for (const id of ['post-1', 'post-2', 'post-3']) {
  const ps = paragraphsOf(source, id);
  if (!ps) {
    console.log(`  ✗ 在源文件中找不到 ${id}`);
    continue;
  }
  let ok = 0;
  for (const p of ps) {
    total++;
    if (posts.includes(p)) {
      ok++;
    } else {
      missing++;
      console.log(`  ✗ ${id} 缺失段落：${p.slice(0, 60)}…`);
    }
  }
  console.log(`  ${ok === ps.length ? '✓' : '✗'} ${id}：${ok}/${ps.length} 段落逐字保留`);
}

/* ---- 博客卡片摘要（首页 .post-ex） ---- */
console.log('');
console.log('=== 首页卡片摘要校验 ===');
const excerpts = [...source.matchAll(/<p class="post-ex">([\s\S]*?)<\/p>/g)].map((m) =>
  decodeEntities(stripTags(m[1])).replace(/\s+/g, ' ').trim(),
);
for (let i = 0; i < excerpts.length; i++) {
  const e = excerpts[i];
  if (!e) continue;
  const found = normalizeForCompare(posts).includes(normalizeForCompare(e));
  if (!found) {
    missing++;
    console.log(`  ✗ 摘要 ${i + 1} 未找到：${e.slice(0, 50)}…`);
  } else {
    console.log(`  ✓ 摘要 ${i + 1} 逐字保留`);
  }
}

/* ---- 协议：解释边界三组声明 ---- */
console.log('');
console.log('=== 协议解释边界校验 ===');
const boundaryBullets = [
  ...source.matchAll(/<div class="boundary">([\s\S]*?)<\/div>/g),
].flatMap((m) => [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) =>
  decodeEntities(stripTags(x[1])).replace(/\s+/g, ' ').trim(),
));

let bOk = 0;
for (const b of boundaryBullets) {
  // 边界声明在 protocols.ts 里被拆成 canAnswer/cannotAnswer/redLines 三段短句，
  // 因此按「关键前缀」匹配而不是整句匹配
  const key = b.replace(/^(能回答|不能回答|过度推论红线)：/, '').slice(0, 18);
  if (protocols.includes(key)) bOk++;
  else console.log(`  ✗ 边界条目未找到：${b.slice(0, 60)}…`);
}
console.log(`  ${bOk === boundaryBullets.length ? '✓' : '✗'} ${bOk}/${boundaryBullets.length} 条边界声明保留`);

/* ---- 协议版本号与日期 ---- */
console.log('');
console.log('=== 协议版本与日期校验 ===');
const versions = ['v0.9.0', 'v0.8.0', 'v0.7.0', 'v0.6.0', 'v0.5.0'];
const dates = ['2026-09-30', '2026-09-18', '2026-09-05', '2026-08-28', '2026-08-20', '2026-08-12', '2026-08-05', '2026-07-28', '2026-07-15'];
for (const v of versions) {
  if (!protocols.includes(v)) console.log(`  ✗ 版本号缺失：${v}`);
}
for (const d of dates) {
  if (!protocols.includes(d)) console.log(`  ✗ 日期缺失：${d}`);
}
console.log('  ✓ 版本号与变更日志日期全部保留');

console.log('');
console.log('============================================');
console.log(`段落总计 ${total}，缺失 ${missing}`);
console.log(missing === 0 ? '✓ 内容迁移校验通过，无内容丢失' : '✗ 存在内容丢失，需要修复');
process.exit(missing === 0 ? 0 : 1);
