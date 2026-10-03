#!/usr/bin/env node
/**
 * 单文件归档构建
 * ============================================================
 * 为什么需要它？
 *
 *   主站交付形态是工程化的多文件构建（dist/）—— 便于维护、利于缓存。
 *   但一个研究纲领的承诺是「内容不会因为托管方消失而消失」。
 *   多文件构建依赖目录结构、依赖服务器正确配置 MIME 类型、依赖相对路径。
 *   把它压成一个自包含 HTML 文件后，这份内容就变成：
 *
 *     · 双击即开，不需要服务器
 *     · 可以作为一个文件上传到 Arweave 等永久存储
 *     · 十年后即使所有托管服务都不在了，文件本身依然可读
 *
 * 两个产物来自同一份内容源（src/content/），因此不存在内容分歧。
 *
 * 用法：pnpm run archive
 * 产物：dist-archive/immortality-program-archive.html
 */

import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'dist-archive');
const finalName = 'immortality-program-archive.html';

console.log('▶ 构建单文件归档版本…');

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

try {
  await build({
    root,
    /*
     * configFile: false —— 刻意不使用 vite.config.ts。
     * 归档版不注册 Service Worker：单文件本身已经是离线的。
     * 若启用 PWA 插件会额外产出 sw.js / manifest.webmanifest，
     * 那就破坏了「单文件」的定义。
     */
    configFile: false,
    // 归档版可能被放在任意路径下打开，因此用相对路径
    base: './',
    resolve: {
      alias: {
        /*
         * 归档构建不启用 PWA 插件，因此没有 virtual:pwa-register
         * 这个虚拟模块。用同形状的空实现替代，让业务代码无需分支。
         */
        'virtual:pwa-register': join(here, 'pwa-register-stub.ts'),
      },
    },
    plugins: [viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir,
      emptyOutDir: true,
      // 归档版优先「小而自包含」，不做代码分割、不产出额外资源
      cssCodeSplit: false,
      assetsInlineLimit: 100_000_000,
      sourcemap: false,
      target: 'es2022',
      modulePreload: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    logLevel: 'warn',
  });
} catch (err) {
  console.error('✗ 归档构建失败：', err);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 后处理：重命名、加入归档标识、清理中间产物                            */
/* ------------------------------------------------------------------ */

const produced = readdirSync(outDir);
const htmlFile = produced.find((f) => f.endsWith('.html'));

if (!htmlFile) {
  console.error('✗ 未找到构建产物 HTML。产出文件：', produced.join(', ') || '(空目录)');
  process.exit(1);
}

let html = readFileSync(join(outDir, htmlFile), 'utf8');

/*
 * 在 <head> 前插入归档标识。
 * 这段注释是档案的一部分：它记录了「这是什么、从哪来、什么时候生成」，
 * 十年后打开这个文件的人（可能是未来的自己）会需要这些信息。
 */
const banner = `
<!--
  ============================================================
  永生计划 · 研究纲领平台 — 单文件归档版本
  ------------------------------------------------------------
  本文件是自包含的：CSS 与 JavaScript 全部内联，无外部依赖。
  双击即可在任意现代浏览器中打开，不需要服务器、不需要联网。

  归档时间：${new Date().toISOString()}
  许可证：CC BY 4.0
  说明：本文件由「pnpm run archive」从与主站相同的 TypeScript
        内容源生成，因此内容与主站一致。

  注意：本文件是一个静态快照。若要获取后续修订，请访问主站
        或重新运行构建命令。
  ============================================================
-->
`;

html = html.replace('<!doctype html>', `<!doctype html>${banner}`);
writeFileSync(join(outDir, finalName), html, 'utf8');

// 清理中间产物，确保目录里只剩这一个文件
for (const f of readdirSync(outDir)) {
  if (f !== finalName) rmSync(join(outDir, f), { recursive: true, force: true });
}

const size = statSync(join(outDir, finalName)).size;
const remaining = readdirSync(outDir);

console.log('');
console.log('✓ 归档完成');
console.log(`  文件：dist-archive/${finalName}`);
console.log(`  体积：${(size / 1024).toFixed(1)} KB（单文件，含全部 CSS 与 JS）`);
console.log(`  目录内容：${remaining.join(', ')}（应只有这一个文件）`);
console.log('');
console.log('  下一步：把该文件上传到 Arweave / IPFS 等永久存储。');
console.log('  它不依赖任何外部资源，因此可以长期独立存在。');

if (remaining.length !== 1) {
  console.warn('  ⚠ 目录中仍有额外文件，单文件归档可能不完整。');
}
