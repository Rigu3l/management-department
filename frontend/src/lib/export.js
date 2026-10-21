// src/lib/export.js — CSV and PDF report exports (feature: PDF and CSV
// report exports). CSV is built from the same rows the table shows; PDF
// goes through jsPDF + autotable, like a printable management report.

import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { fmtVal } from './format';

const cell = (row, col) => fmtVal(row[col.key], col.format);

export function exportCSV(title, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [
    columns.map((c) => esc(c.label)).join(','),
    ...rows.map((r) => columns.map((c) => esc(cell(r, c))).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replaceAll(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(title, subtitle, columns, rows) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait' });
  doc.setFontSize(15);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(subtitle || '', 14, 23);
  doc.text('Hotel Management System — Management Department', 14, 29);
  autoTable(doc, {
    startY: 34,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => cell(r, c))),
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [199, 91, 135] },
    alternateRowStyles: { fillColor: [250, 244, 234] },
  });
  doc.save(`${title.replaceAll(/\s+/g, '-').toLowerCase()}.pdf`);
}
