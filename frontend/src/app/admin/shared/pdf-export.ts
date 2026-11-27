/**
 * One place that turns an admin table into a PDF. The PDF library is loaded only when someone clicks the button,
 * so it does not weigh on the normal page load. Times are printed in Indian Standard Time.
 */
export interface PdfReport {
  title: string;
  /** Lines under the title, e.g. the filters that were applied. */
  subtitle?: string[];
  /** Small "label: value" summary printed above the table. */
  summary?: [string, string][];
  columns: string[];
  rows: (string | number)[][];
  filename: string;
  landscape?: boolean;
}

/** dd MMM yyyy, hh:mm AM/PM in IST, from an ISO time (a time with no zone is treated as UTC, as the API sends it). */
export function istDateTime(iso?: string | null): string {
  if (!iso) return '';
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(iso);
  const t = new Date(hasZone ? iso : iso + 'Z');
  if (isNaN(t.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(t).replace(',', '') + ' IST';
}

export function inr(n?: number | null): string {
  return 'Rs. ' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export const ORDER_STATUS: Record<number, string> = { 1: 'Pending', 2: 'Confirmed', 3: 'Shipped', 4: 'Delivered', 5: 'Cancelled', 6: 'Returned' };
export const PAYMENT_STATUS: Record<number, string> = { 1: 'Pending', 2: 'Paid', 3: 'Failed', 4: 'Refunded', 5: 'Partial refund' };
export const PAYMENT_METHOD: Record<number, string> = { 1: 'Online (Razorpay)', 2: 'Cash on delivery' };

export async function downloadPdf(r: PdfReport): Promise<void> {
  const [{ jsPDF }, autoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: r.landscape === false ? 'portrait' : 'landscape', unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(22, 101, 52);
  doc.text('Sidham Pharmacy', 40, y);
  doc.setFontSize(13); doc.setTextColor(30, 41, 59);
  y += 22; doc.text(r.title, 40, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  y += 14; doc.text(`Generated ${istDateTime(new Date().toISOString())}`, 40, y);
  for (const line of r.subtitle ?? []) { y += 12; doc.text(line, 40, y); }

  if (r.summary?.length) {
    y += 22; doc.setFontSize(10); doc.setTextColor(30, 41, 59);
    let x = 40;
    for (const [label, value] of r.summary) {
      const text = `${label}: ${value}`;
      const tw = doc.getTextWidth(text) + 24;
      if (x + tw > w - 40) { x = 40; y += 16; }
      doc.setFont('helvetica', 'bold'); doc.text(label + ':', x, y);
      doc.setFont('helvetica', 'normal'); doc.text(' ' + value, x + doc.getTextWidth(label + ':'), y);
      x += tw;
    }
  }

  (autoTable as any).default(doc, {
    startY: y + 16,
    head: [r.columns],
    body: r.rows.length ? r.rows : [[{ content: 'No records for the current filters.', colSpan: r.columns.length, styles: { halign: 'center' } }]],
    styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59], overflow: 'linebreak' },
    headStyles: { fillColor: [22, 101, 52], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 248, 245] },
    margin: { left: 40, right: 40, bottom: 36 },
    didDrawPage: () => {
      doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text(`Page ${doc.getNumberOfPages()}`, w - 40, doc.internal.pageSize.getHeight() - 18, { align: 'right' });
    }
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`${r.filename}-${stamp}.pdf`);
}
