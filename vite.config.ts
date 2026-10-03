// ============================================================
//  永生计划 · 研究纲领平台  —  构建配置
//  产物：纯静态站点（dist/），可直接部署到 Vercel / Netlify /
//        任意静态托管，也可上传 Arweave 永久层。
// ============================================================
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  /*
   * base 使用绝对根路径 '/'。
   * Vercel 部署在自有域名根目录，因此 '/' 是正确值。
   * 若改用 GitHub Pages 的「项目页」(https://user.github.io/repo/)，
   * 请把此处改为 '/repo-name/'，详见 docs/零基础部署指南.md 第十节。
   */
  base: '/',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    outDir: 'dist',
    // 永久档案重视可读性：保留一份未压缩的源码映射，便于未来审计
    sourcemap: true,
    target: 'es2022',
    // 单页应用只有一个 HTML 入口
    rollupOptions: {
      output: {
        // 稳定的产物命名，便于在 Arweave 上长期定位与引用
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    // 内容型站点，单个 chunk 体积可控，放宽告警阈值
    chunkSizeWarningLimit: 900,
  },

  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },

  preview: {
    port: 4173,
    strictPort: false,
  },

  plugins: [
    VitePWA({
      /*
       * prompt：新版本就绪时提示用户刷新，而不是静默替换。
       * 对研究纲领而言，「你正在阅读的内容版本」必须是明确的。
       */
      registerType: 'prompt',
      injectRegister: null, // 由 src/core/pwa.ts 手动注册，以便控制提示时机

      // 让 Service Worker 也能在 dev 环境被观察到
      devOptions: {
        enabled: false,
      },

      includeAssets: ['favicon.svg', 'robots.txt'],

      manifest: {
        name: '永生计划 · 研究纲领平台',
        short_name: '永生计划',
        description:
          '一个以「迁移永生协议」为核心的可检验研究纲领发布平台：协议、实验与文献全部公开、可复现、可证伪。',
        lang: 'zh-CN',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'any',
        background_color: '#F4F1E8',
        theme_color: '#0E5F4F',
        categories: ['education', 'science', 'books', 'productivity'],
        prefer_related_applications: false,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          { name: '协议清单', short_name: '协议', url: '/protocols', description: '浏览全部在册协议' },
          { name: '实验台账', short_name: '实验', url: '/experiments', description: '查看实验状态与复现材料' },
          { name: '研究笔记', short_name: '博客', url: '/blog', description: '阅读最新研究进展' },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2,txt,json}'],
        /*
         * 导航请求回退到应用外壳。离线时客户端路由会渲染 /offline 页面，
         * 因此不需要额外的静态兜底文件。
         */
        navigateFallback: '/index.html',
        // 归档导出目录与静态资源不应被导航回退吞掉
        navigateFallbackDenylist: [/^\/archive\//, /\/[^/?]+\.[^/?]+$/],
        cleanupOutdatedCaches: true,
        /*
         * 由用户决定何时启用新版本（见 src/core/pwa.ts 的 registerType: 'prompt'）。
         * 注意：如果这里设为 false，待激活的新 Service Worker 会阻塞 refresh，
         * 用户点了「立即刷新」也可能仍然看到旧内容 —— 因此保持 true。
         */
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // 本地同源内容：缓存优先，离线可用
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination !== 'document',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ip-static-v1',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // 站点字体（Noto Serif / Sans SC）——网络优先，失败时回退本地缓存，
            // 保证离线和字体服务不可达时仍可读。
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ip-webfonts-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
