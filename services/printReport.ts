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
