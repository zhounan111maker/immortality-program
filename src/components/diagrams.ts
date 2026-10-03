/**
 * 示意figures
 * ============================================================
 * 全部为手工绘制的内联 SVG，无图表库依赖。
 * 颜色一律引用设计令牌（var(--…）），因此自动适配深色模式与打印样式。
 *
 * 说明：这些图都是「示意图」，不是实验数据。图注中必须如实标注这一点 ——
 * 纲领的诚实性要求不允许把示意图伪装成测量结果。
 */

export type DiagramId =
  | 'confidence-curves'
  | 'qtr-gates'
  | 'architecture-layers'
  | 'roadmap'
  | 'migration-map'
  | 'dissonance'
  | 'domain-map';

/* ------------------------------------------------------------------ */
/* 图 1 · 身份置信曲线 C(t) 的两种典型情形                              */
/* ------------------------------------------------------------------ */
function confidenceCurves(): string {
  const axis = `
    <line x1="56" y1="196" x2="796" y2="196" stroke="var(--line-2)" stroke-width="1.4"/>
    <line x1="56" y1="26" x2="56" y2="196" stroke="var(--line-2)" stroke-width="1.4"/>`;

  // 事件窗口
  const window = `
    <rect x="404" y="30" width="34" height="166" fill="var(--gold-soft)" opacity=".55"/>
    <line x1="421" y1="30" x2="421" y2="200" stroke="var(--gold)" stroke-width="1.3" stroke-dasharray="4 5"/>
    <text x="430" y="46" fill="var(--gold-2)" font-size="12">迁移事件窗口</text>`;

  // 连续通过：窗口内短暂扰动后恢复到更高水平
  const pass = `
    <path d="M66 152 C 150 150, 230 148, 310 142 C 366 138, 396 140, 414 152 C 428 162, 452 118, 520 96 C 600 70, 700 54, 782 48"
      fill="none" stroke="var(--brand)" stroke-width="2.6" stroke-linecap="round"/>`;

  // 连续性断裂：窗口后跌到下限且不再恢复
  const fail = `
    <path d="M66 152 C 150 150, 230 148, 310 142 C 366 138, 396 140, 414 154 C 430 166, 466 182, 540 190 C 620 194, 700 194, 782 194"
      fill="none" stroke="var(--alert)" stroke-width="1.8" stroke-dasharray="7 6" stroke-linecap="round" opacity=".95"/>`;

  return `
  <svg viewBox="0 0 820 236" role="img" aria-label="身份置信曲线 C(t) 的两种典型情形示意图">
    ${axis}
    ${window}
    ${pass}
    ${fail}

    <text x="34" y="200" fill="var(--muted)" font-size="12" text-anchor="end">0</text>
    <text x="34" y="34" fill="var(--muted)" font-size="12" text-anchor="end">1</text>
    <text x="426" y="226" fill="var(--muted)" font-size="12" text-anchor="middle">时间 t</text>
    <text x="16" y="118" fill="var(--muted)" font-size="12" text-anchor="middle" transform="rotate(-90 16 118)">C(t)</text>

    <text x="500" y="88" fill="var(--brand)" font-size="12">连续通过：窗口内短暂扰动后恢复</text>
    <text x="500" y="182" fill="var(--alert)" font-size="12">连续性断裂：事件后跌至下限且未恢复</text>

    <circle cx="421" cy="152" r="4" fill="var(--gold)"/>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* 图 2 · QTR 四门验证流程                                             */
/* ------------------------------------------------------------------ */
function qtrGates(): string {
  const box = (x: number, w: number, label: string, sub: string, tone: 'brand' | 'gold') => {
    const fill = tone === 'brand' ? 'var(--brand-soft)' : 'var(--gold-soft)';
    const stroke = tone === 'brand' ? 'var(--brand)' : 'var(--gold)';
    const ink = tone === 'brand' ? 'var(--brand-2)' : 'var(--gold-2)';
    return `
      <rect x="${x}" y="52" width="${w}" height="60" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>
      <text x="${x + w / 2}" y="${sub ? 80 : 87}" text-anchor="middle" fill="${ink}" font-size="12.5">${label}</text>
      ${sub ? `<text x="${x + w / 2}" y="98" text-anchor="middle" fill="${ink}" font-size="12.5">${sub}</text>` : ''}`;
  };

  const arrow = (x1: number, x2: number) => `
    <line x1="${x1}" y1="82" x2="${x2 - 3}" y2="82" stroke="var(--brand)" stroke-width="1.5"/>
    <polygon points="${x2},82 ${x2 - 8},77.5 ${x2 - 8},86.5" fill="var(--brand)"/>`;

  return `
  <svg viewBox="0 0 830 168" role="img" aria-label="QTR 四门验证流程示意图">
    ${box(16, 116, '源系统捕获', '', 'brand')}
    ${box(158, 116, '门 1', '信息完整', 'gold')}
    ${box(300, 116, '门 2', '连续过渡', 'gold')}
    ${box(442, 116, '门 3', '功能等价', 'gold')}
    ${box(584, 116, '门 4', '伦理与同意', 'gold')}
    ${box(726, 88, '验收', '', 'brand')}

    ${arrow(132, 158)}
    ${arrow(274, 300)}
    ${arrow(416, 442)}
    ${arrow(558, 584)}
    ${arrow(700, 726)}

    <text x="421" y="140" text-anchor="middle" fill="var(--muted)" font-size="11.5">
      四门按序通过，迁移过程才被认定为一次可报告的、可检验的事件
    </text>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* 图 3 · 平台分层架构                                                 */
/* ------------------------------------------------------------------ */
function architectureLayers(): string {
  const rows: { name: string; desc: string; tone: 'brand' | 'gold' | 'plain' }[] = [
    { name: '永久层', desc: 'Arweave 静态归档 · 上传即不可删', tone: 'brand' },
    { name: '主站层', desc: 'Vite 静态构建 · 部署于 Vercel 边缘网络', tone: 'plain' },
    { name: '内容层', desc: 'TypeScript 内容模块 · Git 即历史', tone: 'plain' },
    { name: '协作层', desc: 'GitHub issue / pull request / 复现讨论', tone: 'plain' },
    { name: '分发层', desc: 'PWA 离线阅读 · 邮件列表', tone: 'gold' },
    { name: '观察层', desc: '隐私友好统计 · 不采集个人可识别信息', tone: 'plain' },
  ];

  const rowH = 40;
  const top = 40;

  return `
  <svg viewBox="0 0 820 ${top + rows.length * rowH + 30}" role="img" aria-label="平台分层架构示意图">
    <text x="16" y="22" fill="var(--muted)" font-size="12">从下往上：内容 → 交付 → 永久</text>
    ${rows
      .map((r, i) => {
        const y = top + i * rowH;
        const fill =
          r.tone === 'brand' ? 'var(--brand-soft)' : r.tone === 'gold' ? 'var(--gold-soft)' : 'var(--paper-2)';
        const stroke =
          r.tone === 'brand' ? 'var(--brand)' : r.tone === 'gold' ? 'var(--gold)' : 'var(--line-2)';
        const ink = r.tone === 'brand' ? 'var(--brand-2)' : r.tone === 'gold' ? 'var(--gold-2)' : 'var(--ink-2)';
        return `
        <rect x="16" y="${y}" width="788" height="${rowH - 8}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
        <text x="34" y="${y + 21}" fill="${ink}" font-size="12.5" font-weight="600">${r.name}</text>
        <text x="130" y="${y + 21}" fill="var(--ink-2)" font-size="12">${r.desc}</text>
        <text x="788" y="${y + 21}" text-anchor="end" fill="var(--muted)" font-size="11">0${i + 1}</text>`;
      })
      .join('')}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* 图 4 · 路线图                                                       */
/* ------------------------------------------------------------------ */
function roadmapDiagram(): string {
  const phases = ['第一阶段', '第二阶段', '第三阶段', '第四阶段'];
  return `
  <svg viewBox="0 0 820 150" role="img" aria-label="分阶段执行路线图示意">
    <line x1="60" y1="70" x2="770" y2="70" stroke="var(--line-2)" stroke-width="1.4"/>
    ${phases
      .map((p, i) => {
        const x = 90 + i * 200;
        const done = i === 0;
        const active = i === 1;
        const fill = done ? 'var(--brand)' : active ? 'var(--gold)' : 'var(--paper)';
        const stroke = done ? 'var(--brand)' : active ? 'var(--gold)' : 'var(--line-2)';
        return `
        <circle cx="${x}" cy="70" r="9" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
        <text x="${x}" y="44" text-anchor="middle" fill="var(--ink-2)" font-size="12">${p}</text>
        <text x="${x}" y="100" text-anchor="middle" fill="var(--muted)" font-size="11">
          ${done ? '已完成' : active ? '进行中' : '计划中'}
        </text>`;
      })
      .join('')}
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* 图 5 · 迁移映射（源系统 → 迁移后系统）                               */
/* ------------------------------------------------------------------ */
function migrationMap(): string {
  return `
  <svg viewBox="0 0 820 300" role="img" aria-label="源系统到迁移后系统的映射关系示意图">
    <rect x="40" y="40" width="220" height="220" rx="8" fill="var(--paper-2)" stroke="var(--line-2)" stroke-width="1.2"/>
    <text x="150" y="30" text-anchor="middle" fill="var(--ink-2)" font-size="13" font-weight="600">源系统</text>
    <rect x="560" y="40" width="220" height="220" rx="8" fill="var(--brand-soft)" stroke="var(--brand)" stroke-width="1.2"/>
    <text x="670" y="30" text-anchor="middle" fill="var(--brand-2)" font-size="13" font-weight="600">迁移后系统</text>

    ${[
      ['记忆结构', 76],
      ['行为倾向', 116],
      ['自我模型', 156],
      ['环境接口', 196],
      ['价值取向', 236],
    ]
      .map(
        ([label, y]) => `
      <rect x="60" y="${Number(y) - 15}" width="180" height="30" rx="4" fill="var(--paper-3)" stroke="var(--line-2)" stroke-width="1"/>
      <text x="150" y="${Number(y) + 4}" text-anchor="middle" fill="var(--ink-2)" font-size="12">${label}</text>
      <rect x="580" y="${Number(y) - 15}" width="180" height="30" rx="4" fill="var(--paper-3)" stroke="var(--brand-3)" stroke-width="1"/>
      <text x="670" y="${Number(y) + 4}" text-anchor="middle" fill="var(--ink-2)" font-size="12">${label}</text>
      <path d="M240 ${y} C 340 ${Number(y) - 22}, 440 ${Number(y) + 22}, 580 ${y}" fill="none" stroke="var(--brand-3)" stroke-width="1.1" opacity=".6"/>
      <polygon points="580,${y} 571,${Number(y) - 4} 571,${Number(y) + 4}" fill="var(--brand-3)" opacity=".8"/>`,
      )
      .join('')}

    <text x="410" y="272" text-anchor="middle" fill="var(--gold-2)" font-size="12">
      门 1 信息完整 · 门 2 连续过渡 · 门 3 功能等价 · 门 4 伦理与同意
    </text>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* 图 6 · 连续性断裂的两种失败模式                                      */
/* ------------------------------------------------------------------ */
function dissonance(): string {
  const gauge = (x: number, label: string, value: number, tone: string) => {
    const w = 150;
    return `
      <text x="${x}" y="52" fill="var(--ink-2)" font-size="12" font-weight="600">${label}</text>
      <rect x="${x}" y="62" width="${w}" height="12" rx="6" fill="var(--paper-2)" stroke="var(--line-2)" stroke-width="1"/>
      <rect x="${x}" y="62" width="${Math.round(w * value)}" height="12" rx="6" fill="${tone}"/>
      <text x="${x + w + 12}" y="73" fill="var(--muted)" font-size="11">${Math.round(value * 100)}%</text>`;
  };

  return `
  <svg viewBox="0 0 820 210" role="img" aria-label="单维度高分与综合置信偏低的差异示意">
    <text x="40" y="26" fill="var(--ink)" font-size="13" font-weight="600">情形 A · 各维度均高 → 综合置信高</text>
    ${gauge(40, '记忆一致性', 0.92, 'var(--brand)')}
    ${gauge(40, '行为预测一致性', 0.88, 'var(--brand)')}
    ${gauge(40, '自我报告一致性', 0.9, 'var(--brand)')}
    ${gauge(40, '环境交互保真度', 0.86, 'var(--brand)')}

    <line x1="400" y1="20" x2="400" y2="196" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="4 4"/>

    <text x="440" y="26" fill="var(--ink)" font-size="13" font-weight="600">情形 B · 单维度高但综合置信低</text>
    ${gauge(440, '记忆一致性', 0.95, 'var(--gold)')}
    ${gauge(440, '行为预测一致性', 0.34, 'var(--alert)')}
    ${gauge(440, '自我报告一致性', 0.42, 'var(--alert)')}
    ${gauge(440, '环境交互保真度', 0.55, 'var(--gold)')}

    <text x="40" y="196" fill="var(--muted)" font-size="11.5">
      综合置信不是各维度的简单平均：任一维度跌破阈值即触发连续性存疑
    </text>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* 图 7 · 永生研究的方向地图与本站位置                                  */
/* ------------------------------------------------------------------ */
function domainMap(): string {
  const nodes: { label: string; x: number; y: number; kind: 'peer' | 'self' }[] = [
    { label: '保存\n冷冻保存', x: 130, y: 90, kind: 'peer' },
    { label: '延长\n抗衰老', x: 130, y: 200, kind: 'peer' },
    { label: '倡导\n超人类主义', x: 660, y: 90, kind: 'peer' },
    { label: '分析\n哲学伦理', x: 660, y: 200, kind: 'peer' },
    { label: '迁移永生\n本站', x: 395, y: 145, kind: 'self' },
  ];

  return `
  <svg viewBox="0 0 800 290" role="img" aria-label="永生研究四个既有方向与本平台位置的示意图">
    <ellipse cx="395" cy="145" rx="330" ry="124" fill="none" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="5 6"/>
    ${nodes
      .map((n) => {
        const self = n.kind === 'self';
        const r = self ? 62 : 52;
        const fill = self ? 'var(--brand)' : 'var(--paper-3)';
        const stroke = self ? 'var(--brand-2)' : 'var(--line-2)';
        const ink = self ? 'var(--on-dark)' : 'var(--ink-2)';
        const lines = n.label.split('\n');
        return `
        <circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${self ? 2 : 1.2}"/>
        ${lines
          .map(
            (l, i) =>
              `<text x="${n.x}" y="${n.y + (i - (lines.length - 1) / 2) * 17 + 4}" text-anchor="middle" fill="${ink}" font-size="${self ? 14 : 12.5}" font-weight="${self ? 700 : 400}">${l}</text>`,
          )
          .join('')}`;
      })
      .join('')}

    <text x="395" y="272" text-anchor="middle" fill="var(--gold-2)" font-size="12">
      四个既有方向都不发布「迁移」的可检验协议 —— 这个空位就是本站的位置
    </text>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/* 渲染入口                                                            */
/* ------------------------------------------------------------------ */

const RENDERERS: Record<DiagramId, () => string> = {
  'confidence-curves': confidenceCurves,
  'qtr-gates': qtrGates,
  'architecture-layers': architectureLayers,
  roadmap: roadmapDiagram,
  'migration-map': migrationMap,
  dissonance: dissonance,
  'domain-map': domainMap,
};

/**
 * 渲染一个图示（含图注与出处说明）。
 * 图注默认声明这是示意图 —— 请勿移除这一诚实性标注。
 */
export function renderDiagram(diagram: DiagramId, opts: { id?: string; caption?: string } = {}): string {
  const svg = (RENDERERS[diagram] ?? qtrGates)();
  const caption =
    opts.caption ?? '示意图，用于说明结构关系，不代表任何实验数据或测量结果';
  return `
    <figure class="figure"${opts.id ? ` id="${opts.id}"` : ''}>
      <div class="figure-canvas">${svg}</div>
      <figcaption>${caption}</figcaption>
    </figure>`;
}
