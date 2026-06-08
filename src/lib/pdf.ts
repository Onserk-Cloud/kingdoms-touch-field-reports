import { jsPDF } from 'jspdf';
import type { OfflinePhoto, OfflineReport } from './types';
import { formatDateTime, formatGps, shortReportId } from './format';
import { translations } from './locales';
import type { Locale } from './locales/types';

interface ExportOptions {
  employeeName: string;
  approverName?: string;
  approvedAt?: number;
  reviewerSignature?: string;
  /** UI language for the PDF labels (defaults to English). */
  locale?: Locale;
}

/**
 * Generate a printable PDF for a report. Photos are embedded as JPEG.
 * Triggers a browser download.
 */
export async function exportReportPdf(
  report: OfflineReport,
  photos: OfflinePhoto[],
  opts: ExportOptions,
): Promise<void> {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
    orientation: 'portrait',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Localized label lookup (PDF is generated outside React, so we read the
  // translation tables directly instead of the useI18n hook).
  const loc: Locale = opts.locale ?? 'en';
  const tr = translations[loc] ?? translations.en;
  const L = (k: string) => tr[`pdf.${k}`] ?? translations.en[`pdf.${k}`] ?? k;

  // ─── Header band ───────────────────────────────────────────
  doc.setFillColor(31, 61, 43); // forest
  doc.rect(0, 0, pageWidth, 80, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KINGDOMS TOUCH SERVICES', margin, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(196, 152, 76);
  doc.text(L('fieldReport').toUpperCase(), margin, 54);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  const idLabel = shortReportId(report.remoteId ?? report.id);
  doc.text(idLabel, pageWidth - margin, 38, { align: 'right' });
  doc.setFontSize(8);
  doc.text(formatDateTime(Date.now()), pageWidth - margin, 54, {
    align: 'right',
  });

  y = 110;

  // ─── Title ─────────────────────────────────────────────────
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(report.jobType || 'Field Report', margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(111, 108, 99);
  doc.text(report.location || '—', margin, y);
  y += 28;

  // ─── Data table ────────────────────────────────────────────
  const rows: [string, string][] = [
    [L('employee'), opts.employeeName],
    [L('submitted'), formatDateTime(report.createdAt)],
    [
      L('gps'),
      report.gps
        ? `${formatGps(report.gps.lat, report.gps.lng)} (±${Math.round(report.gps.accuracy)}m)`
        : L('notCaptured'),
    ],
    [L('photos'), String(photos.length)],
    [L('status'), L(`status_${report.status ?? 'submitted'}`).toUpperCase()],
    [
      L('completion'),
      report.completionConfirmed ? L('confirmed') : L('notConfirmed'),
    ],
  ];

  doc.setFontSize(9);
  for (const [k, v] of rows) {
    doc.setTextColor(160, 128, 47);
    doc.setFont('helvetica', 'bold');
    doc.text(k.toUpperCase(), margin, y);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 110, y, {
      maxWidth: pageWidth - margin * 2 - 110,
    });
    y += 16;
  }
  y += 8;

  // ─── Description & notes ───────────────────────────────────
  const block = (label: string, body: string) => {
    if (!body) return;
    doc.setTextColor(160, 128, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), margin, y);
    y += 14;
    doc.setTextColor(42, 38, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const split = doc.splitTextToSize(body, pageWidth - margin * 2);
    doc.text(split, margin, y);
    y += split.length * 13 + 12;
  };

  block(L('description'), report.description);
  if (report.notes) block(L('notes'), report.notes);

  // ─── Photos grid ───────────────────────────────────────────
  if (photos.length) {
    doc.setTextColor(160, 128, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${L('photos').toUpperCase()} · ${photos.length}`, margin, y);
    y += 14;

    const tileW = (pageWidth - margin * 2 - 16) / 3;
    const tileH = tileW * 0.75;
    let col = 0;

    for (const p of photos) {
      const dataUrl = await blobToDataUrl(p.blob);
      if (y + tileH > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        y = margin;
      }
      try {
        doc.addImage(
          dataUrl,
          'JPEG',
          margin + col * (tileW + 8),
          y,
          tileW,
          tileH,
          undefined,
          'FAST',
        );
      } catch {
        // Some image types may fail; skip.
      }
      col++;
      if (col === 3) {
        col = 0;
        y += tileH + 8;
      }
    }
    if (col !== 0) y += tileH + 8;
    y += 16;
  }

  // ─── Signature block ───────────────────────────────────────
  if (y + 110 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = margin;
  }
  doc.setDrawColor(220, 215, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(160, 128, 47);
  doc.text(L('employeeSignature').toUpperCase(), margin, y);
  doc.text(L('supervisorApproval').toUpperCase(), pageWidth / 2, y);
  y += 28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 26);
  doc.text(opts.employeeName, margin, y);
  doc.text(opts.approverName ?? '—', pageWidth / 2, y);
  y += 12;

  doc.setFontSize(8);
  doc.setTextColor(111, 108, 99);
  doc.text(formatDateTime(report.createdAt), margin, y);
  if (opts.approvedAt) {
    doc.text(formatDateTime(opts.approvedAt), pageWidth / 2, y);
  }

  // ─── Footer ────────────────────────────────────────────────
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(143, 165, 139);
  doc.text(L('footer'), pageWidth / 2, ph - 24, { align: 'center' });

  // ─── Save ──────────────────────────────────────────────────
  const datePart = new Date(report.createdAt).toISOString().slice(0, 10);
  const filename = `KT-Report-${idLabel}-${datePart}.pdf`;
  doc.save(filename);
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(b);
  });
}
