import jsPDF from "jspdf";
import type { AccountBranding } from "@/data/brandingStore";

function logoFormat(dataUrl: string): "PNG" | "JPEG" | null {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  return null;
}

export interface ReportTable {
  headers: string[];
  rows: (string | number)[][];
  /** Relative column width weights — defaults to equal width. */
  weights?: number[];
}

export interface ReportSection {
  heading: string;
  table?: ReportTable;
  /** Simple label/value pairs, rendered as a two-column list. */
  kv?: [string, string][];
  /** Free-form lines (e.g. a closing-notes paragraph). */
  lines?: string[];
}

export interface SessionReportDoc {
  reportTitle: string;
  branding: AccountBranding | null;
  stationName?: string;
  sessionNo: number;
  cashier: string;
  tillNumber?: string;
  openedAt: string;
  closedAt?: string;
  sections: ReportSection[];
}

/** Renders a POS session report (raw/sales/recon/consolidated) as a branded PDF —
 *  replaces the old plain-text .txt downloads with a proper printable document. */
export function buildSessionReportPdf(doc: SessionReportDoc): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const usableW = pageW - margin * 2;
  let y = margin;

  function ensureRoom(h: number) {
    if (y + h > pageH - margin) { pdf.addPage(); y = margin; }
  }

  // ── Branding header ──────────────────────────────────────────────────────
  const b = doc.branding;
  const logoSize = 36;
  let leftX = margin;
  if (b?.logo) {
    const fmt = logoFormat(b.logo);
    if (fmt) {
      try { pdf.addImage(b.logo, fmt, leftX, y, logoSize, logoSize); leftX += logoSize + 10; } catch { /* skip */ }
    }
  }
  let textY = y + 11;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(20, 24, 28);
  pdf.text(b?.name || "ISMS", leftX, textY);
  textY += 13;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(110, 114, 120);
  if (b?.address) { pdf.text(b.address, leftX, textY); textY += 11; }

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(60, 64, 70);
  pdf.text(doc.reportTitle.toUpperCase(), pageW - margin, y + 12, { align: "right" });
  if (doc.stationName) {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(110, 114, 120);
    pdf.text(doc.stationName, pageW - margin, y + 26, { align: "right" });
  }

  y = Math.max(textY, y + logoSize) + 10;
  pdf.setDrawColor(210); pdf.line(margin, y, pageW - margin, y);
  y += 16;

  // ── Session meta ─────────────────────────────────────────────────────────
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60, 64, 70);
  const metaLine = [
    `Session #${doc.sessionNo}`,
    `Cashier: ${doc.cashier}`,
    doc.tillNumber ? `Till: ${doc.tillNumber}` : null,
    `Opened: ${doc.openedAt}`,
    doc.closedAt ? `Closed: ${doc.closedAt}` : null,
  ].filter(Boolean).join("   ·   ");
  pdf.text(metaLine, margin, y);
  y += 20;

  // ── Sections ─────────────────────────────────────────────────────────────
  for (const section of doc.sections) {
    ensureRoom(24);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5); pdf.setTextColor(20, 24, 28);
    pdf.text(section.heading, margin, y);
    y += 8;
    pdf.setDrawColor(225); pdf.line(margin, y, pageW - margin, y);
    y += 14;

    if (section.kv) {
      pdf.setFontSize(9);
      for (const [label, value] of section.kv) {
        ensureRoom(16);
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(110, 114, 120);
        pdf.text(label, margin, y);
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(20, 24, 28);
        pdf.text(value, pageW - margin, y, { align: "right" });
        y += 15;
      }
      y += 6;
    }

    if (section.lines) {
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(60, 64, 70);
      for (const line of section.lines) {
        const wrapped = pdf.splitTextToSize(line, usableW);
        ensureRoom(wrapped.length * 12);
        pdf.text(wrapped, margin, y);
        y += wrapped.length * 12 + 4;
      }
      y += 4;
    }

    if (section.table) {
      const { headers, rows, weights } = section.table;
      const totalWeight = (weights ?? headers.map(() => 1)).reduce((s, w) => s + w, 0);
      const colW = headers.map((_, i) => (usableW * (weights?.[i] ?? 1)) / totalWeight);
      const colX: number[] = [];
      let acc = margin;
      for (const w of colW) { colX.push(acc); acc += w; }

      ensureRoom(20);
      pdf.setFillColor(20, 24, 28);
      pdf.rect(margin, y, usableW, 18, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5);
      headers.forEach((h, i) => pdf.text(h, colX[i] + 5, y + 12, { align: i === 0 ? "left" : "right" }));
      y += 18;

      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
      rows.forEach((row, ri) => {
        ensureRoom(16);
        if (ri % 2 === 1) { pdf.setFillColor(244, 243, 239); pdf.rect(margin, y, usableW, 16, "F"); }
        pdf.setTextColor(30, 32, 36);
        row.forEach((cell, ci) => {
          const text = pdf.splitTextToSize(String(cell), colW[ci] - 8)[0] ?? String(cell);
          pdf.text(text, ci === 0 ? colX[ci] + 5 : colX[ci] + colW[ci] - 5, y + 11, { align: ci === 0 ? "left" : "right" });
        });
        y += 16;
      });
      y += 10;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated ${new Date().toLocaleString()}`, margin, pageH - 16);
    pdf.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 16, { align: "right" });
  }

  return pdf;
}
