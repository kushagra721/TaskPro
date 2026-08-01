/**
 * CSV export + print helpers for the Kamdhenu ERP list/report pages.
 * `columns` everywhere is `[{ key, label, value? }]` — `value(row)` (when
 * given) wins over `row[key]`, mirroring KamdhenuDataTable's `render`.
 */

const cellValue = (col, row) => {
  const v = col.value ? col.value(row) : row[col.key];
  return v === null || v === undefined ? '' : String(v);
};

const csvQuote = (s) => `"${s.replace(/"/g, '""')}"`;

/** Builds a CSV (BOM-prefixed so Excel opens it as UTF-8) and downloads it. */
export function exportCsv(filename, columns, rows) {
  const head = columns.map((c) => csvQuote(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => csvQuote(cellValue(c, row))).join(','));
  // ﻿ = UTF-8 BOM so Excel opens the file with the right encoding.
  const csv = '﻿' + [head, ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .kerp-print-meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.04em; }
  @media print { body { margin: 8mm; } }
`;

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Opens a print window around an arbitrary pre-built HTML fragment. */
export function printSection(title, html) {
  const win = window.open('', '_blank', 'width=900,height=650');
  if (!win) return; // popup blocked — nothing to do
  win.document.write(
    `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head>` +
      `<body><h1>${escapeHtml(title)}</h1>` +
      `<div class="kerp-print-meta">Kamdhenu ERP · ${escapeHtml(new Date().toLocaleString('en-IN'))}</div>` +
      `${html}</body></html>`
  );
  win.document.close();
  win.focus();
  win.print();
}

/** Renders `columns`/`rows` as a table and prints it. */
export function printTable(title, columns, rows) {
  const head = `<tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>`;
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(cellValue(c, row))}</td>`).join('')}</tr>`)
    .join('');
  printSection(title, `<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
}
