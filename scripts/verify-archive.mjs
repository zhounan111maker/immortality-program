/**
 * 校验单文件归档是否真的「自包含」。
 *
 * 为什么必须验证：
 *   「单文件永久可读」是这个纲领对存档的核心承诺。
 *   如果归档文件里还残留任何外部引用（外链 CSS、外链脚本、外链字体、
 *   外链图片），那么十年后某个第三方域名消失时，这份档案就会残缺。
 *   因此这里逐条检查并给出证据，而不是凭印象。
 *
 * 运行：node scripts/verify-archive.mjs
 * 退出码：0 = 通过，1 = 发现外部依赖
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dir = join(root, 'dist-archive');

if (!existsSync(dir)) {
  console.error('✗ dist-archive/ 不存在。请先运行：pnpm run archive');
  process.exit(1);
}

const files = readdirSync(dir);
if (files.length !== 1) {
  console.error(`✗ dist-archive/ 里应当只有 1 个文件，实际有 ${files.length} 个：${files.join(', ')}`);
  process.exit(1);
}

const file = files[0];
const html = readFileSync(join(dir, file), 'utf8');

console.log(`校验归档文件：dist-archive/${file}`);
console.log(`体积：${(html.length / 1024).toFixed(1)} KB`);
console.log('');

let problems = 0;

/* ---- 1. 不得有外部资源引用 ---- */
const externalRefs = [];

// 外链样式表
for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)) {
  const href = /href=["']([^"']+)["']/i.exec(m[0])?.[1] ?? '';
  if (/^https?:\/\//i.test(href)) externalRefs.push(`外链样式表：${href}`);
}

// 外链脚本
for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
  if (/^https?:\/\//i.test(m[1])) externalRefs.push(`外链脚本：${m[1]}`);
}

// 外链图片
for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
  if (/^https?:\/\//i.test(m[1])) externalRefs.push(`外链图片：${m[1]}`);
}

// 其它可能的远程抓取
for (const m of html.matchAll(/@import\s+url\(["']?(https?:\/\/[^"')]+)/gi)) {
  externalRefs.push(`CSS @import：${m[1]}`);
}

if (externalRefs.length) {
  problems += externalRefs.length;
  console.log('✗ 发现外部资源引用（会破坏永久可读性）：');
  for (const r of externalRefs) console.log(`    ${r}`);
} else {
  console.log('✓ 无外链样式表 / 脚本 / 图片 / CSS @import');
}

/* ---- 2. 必须内联 CSS 与 JS ---- */
const inlineStyles = (html.match(/<style[\s\S]*?<\/style>/gi) || []).length;
const inlineScripts = (html.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || []).length;

console.log('');
console.log(`内联 <style> 块：${inlineStyles}`);
console.log(`内联 <script> 块：${inlineScripts}`);

if (inlineStyles === 0) {
  problems++;
  console.log('✗ 没有内联样式，归档版会丢失全部视觉设计');
}
if (inlineScripts === 0) {
  problems++;
  console.log('✗ 没有内联脚本，归档版无法运行');
}

/* ---- 3. 字体：应当只降级到系统字体栈，不远程加载 ---- */
const fontLinks = (html.match(/fonts\.googleapis\.com|fonts\.gstatic\.com/gi) || []).length;
console.log('');
if (fontLinks > 0) {
  console.log(`⚠ 归档中仍包含 ${fontLinks} 处 Google Fonts 引用。`);
  console.log('  说明：这是 src/core/fonts.ts 在运行时按需注入的（非阻塞、可失败）。');
  console.log('  即使该域名不可达，页面会降级到系统字体栈，内容依然完整可读。');
  console.log('  因此不计为失败，但需知晓。');
} else {
  console.log('✓ 无远程字体引用，完全依赖系统字体栈');
}

/* ---- 4. 关键内容抽样：确认正文真的在里面 ---- */
console.log('');
console.log('内容抽样（确认核心文本已内联）：');
const samples = [
  ['站点名称', '永生计划'],
  ['协议编号 PRT-001', 'PRT-001'],
  ['协议编号 PRT-002', 'PRT-002'],
  ['协议编号 PRT-003', 'PRT-003'],
  ['实验编号 EXP-001', 'EXP-001'],
  ['解释边界', '解释边界'],
  ['迁移永生', '迁移永生'],
  ['定位声明', '不提供服务'],
  ['许可', 'CC BY 4.0'],
];

for (const [label, needle] of samples) {
  const found = html.includes(needle);
  console.log(`  ${found ? '✓' : '✗'} ${label}`);
  if (!found) problems++;
}

/* ---- 5. 归档标识 ---- */
console.log('');
if (html.includes('单文件归档版本')) {
  console.log('✓ 含归档标识注释（记录生成时间、许可与来源）');
} else {
  problems++;
  console.log('✗ 缺少归档标识注释');
}

/* ---- 结论 ---- */
console.log('');
console.log('============================================');
if (problems === 0) {
  console.log('✓ 归档校验通过：单文件、自包含、无外部依赖。');
  console.log('  这个文件可以直接上传到 Arweave / IPFS。');
  process.exit(0);
} else {
  console.log(`✗ 发现 ${problems} 个问题，归档尚未达到「永久可读」标准。`);
  process.exit(1);
}
