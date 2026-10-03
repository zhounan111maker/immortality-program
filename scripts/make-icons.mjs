#!/usr/bin/env node
/**
 * 生成 PWA 应用图标。
 *
 * 无第三方图形依赖：直接用 zlib 输出 PNG。
 * 设计沿用站点档案学视觉：深档案绿底 + 档案金同心圆标记。
 *
 * 用法：node scripts/make-icons.mjs
 * 产物：public/icons/icon-192.png、icon-512.png、icon-maskable-512.png
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BRAND = [0x0e, 0x5f, 0x4f]; // --brand
const BRAND_DEEP = [0x0a, 0x45, 0x39]; // --brand-2
const GOLD = [0xe3, 0xcd, 0x9b]; // 档案金
const PAPER = [0xf4, 0xf1, 0xe8];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** 把 RGBA 像素数组编码为 PNG Buffer */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/**
 * 渲染一枚图标。
 * @param size 边长
 * @param maskable 安全区模式：图形缩小到 60%，四周留出可裁切余量
 */
function renderIcon(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const S = size / 64; // 基准坐标系 64x64
  // maskable 图标需要把重要内容收进中心 ~80% 圆形安全区
  const scale = maskable ? 0.62 : 1;

  const radiusOuter = 15.5 * S * scale;
  const widthRing = 3.6 * S * scale;
  const radiusCore = 5 * S * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // 底：从左上到右下的品牌绿渐变
      const t = Math.min(1, Math.max(0, (x / size) * 0.45 + (y / size) * 0.55));
      let col = mix(BRAND, BRAND_DEEP, t);

      // 圆角遮罩（非 maskable 时使用圆角方形；maskable 填满整块）
      let inside = true;
      if (!maskable) {
        const r = 13 * S;
        const dx = Math.max(r - x, 0, x - (size - r));
        const dy = Math.max(r - y, 0, y - (size - r));
        if (dx > 0 && dy > 0 && Math.hypot(dx, dy) > r) inside = false;
      }

      if (inside) {
        const d = Math.hypot(x - c, y - c);

        // 外圈：档案金细环
        const ringDelta = Math.abs(d - radiusOuter);
        if (ringDelta < widthRing / 2) {
          col = GOLD;
        } else if (ringDelta < widthRing / 2 + 1.1 * S) {
          const a = 1 - (ringDelta - widthRing / 2) / (1.1 * S);
          col = mix(col, GOLD, a * 0.5);
        }

        // 内芯：档案金实心圆点
        if (d < radiusCore) col = GOLD;
        else if (d < radiusCore + 1.1 * S) {
          const a = 1 - (d - radiusCore) / (1.1 * S);
          col = mix(col, GOLD, a * 0.65);
        }

        // 右上弧：纸白高光，呼应站点 logo 的断续弧
        if (!maskable) {
          const ang = Math.atan2(y - c, x - c);
          const inArc = ang > -Math.PI * 0.62 && ang < -Math.PI * 0.06;
          const arcDelta = Math.abs(d - radiusOuter * 1.0);
          if (inArc && arcDelta < 1.1 * S) col = mix(col, PAPER, 0.55);
        }

        rgba[i] = col[0];
        rgba[i + 1] = col[1];
        rgba[i + 2] = col[2];
        rgba[i + 3] = 255;
      } else {
        // 圆角外：完全透明
        rgba[i] = 0;
        rgba[i + 1] = 0;
        rgba[i + 2] = 0;
        rgba[i + 3] = 0;
      }
    }
  }
  return encodePng(size, size, rgba);
}

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];

for (const t of targets) {
  const png = renderIcon(t.size, t.maskable);
  writeFileSync(join(outDir, t.file), png);
  console.log(`  ✓ ${t.file}  ${t.size}×${t.size}  ${png.length} bytes`);
}
console.log('图标生成完成 →', outDir);
