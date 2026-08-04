// Escapa texto para montar HTML de relatório/PDF com segurança
export const escapeHtml = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// Imprime um HTML isolado num iframe oculto → o usuário escolhe "Salvar como PDF".
// Sem dependência externa: usa o próprio diálogo de impressão do navegador.
export const printHtml = (bodyHtml: string, title: string, extraStyle = ''): void => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
      h1 { font-size: 18px; margin: 0 0 2px; }
      h2 { font-size: 14px; margin: 20px 0 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
      h2:first-of-type { border-top: none; padding-top: 0; }
      .sub { font-size: 12px; color: #475569; margin: 0 0 14px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
      th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
      td.num, th.num { text-align: center; width: 34px; }
      td.size, th.size { text-align: center; }
      .sig { width: 150px; }
      tr:nth-child(even) td { background: #f8fafc; }
      tfoot td { font-weight: bold; background: #f1f5f9; }
      .total-col { text-align: center; font-weight: bold; }
      ${extraStyle}
    </style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch { /* ignora: alguns ambientes bloqueiam impressão */ }
    setTimeout(() => iframe.remove(), 1500);
  }, 300);
};

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

// Gráfico de rosca em SVG puro (sem lib externa) — imprime bem e escala sem perder nitidez.
// Usa a técnica clássica de stroke-dasharray por segmento de círculo.
export const svgDonut = (segments: ChartSlice[], size = 176, strokeWidth = 26): string => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  if (total === 0) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${strokeWidth}" /></svg>`;
  }
  let offset = 0;
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const dash = (s.value / total) * circumference;
    const el = `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${s.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${center} ${center})" />`;
    offset += dash;
    return el;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${arcs}
    <text x="${center}" y="${center - 3}" text-anchor="middle" font-size="26" font-weight="900" fill="#0f172a">${total}</text>
    <text x="${center}" y="${center + 16}" text-anchor="middle" font-size="9" fill="#64748b" letter-spacing="1.5">TOTAL</text>
  </svg>`;
};

// Legenda HTML para acompanhar um svgDonut (mesma lista de segmentos)
export const donutLegend = (segments: ChartSlice[]): string => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return segments.map(s => `
    <div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:7px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${s.color};display:inline-block;flex-shrink:0;"></span>
      <span style="flex:1;color:#334155;">${escapeHtml(s.label)}</span>
      <span style="font-weight:700;color:#0f172a;">${s.value} <span style="color:#94a3b8;font-weight:400;">(${total ? Math.round((s.value / total) * 100) : 0}%)</span></span>
    </div>
  `).join('');
};

// Gráfico de barras horizontal em SVG puro. Cada item pode ter cor própria
// (item.color) ou usa a cor padrão passada em opts.color.
export const svgBars = (
  items: { label: string; value: number; color?: string }[],
  opts: { width?: number; barHeight?: number; gap?: number; color?: string; labelWidth?: number; valueWidth?: number; valueFormatter?: (v: number) => string } = {}
): string => {
  const { width = 560, barHeight = 22, gap = 10, color = '#6366f1', labelWidth = 140, valueWidth = 40, valueFormatter = (v: number) => String(v) } = opts;
  if (items.length === 0) return '<p style="color:#94a3b8;font-size:12px;">Sem dados.</p>';
  const max = Math.max(...items.map(i => i.value), 1);
  const chartWidth = width - labelWidth - valueWidth;
  const height = items.length * (barHeight + gap);
  const rows = items.map((it, i) => {
    const y = i * (barHeight + gap);
    const w = Math.max(3, (it.value / max) * chartWidth);
    return `
      <text x="${labelWidth - 10}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="11" fill="#334155">${escapeHtml(it.label)}</text>
      <rect x="${labelWidth}" y="${y}" width="${w.toFixed(1)}" height="${barHeight}" rx="5" fill="${it.color || color}" />
      <text x="${labelWidth + w + 8}" y="${y + barHeight / 2 + 4}" font-size="11" font-weight="700" fill="#0f172a">${escapeHtml(valueFormatter(it.value))}</text>
    `;
  }).join('');
  return `<svg width="${width}" height="${Math.max(height, 1)}" viewBox="0 0 ${width} ${Math.max(height, 1)}">${rows}</svg>`;
};
