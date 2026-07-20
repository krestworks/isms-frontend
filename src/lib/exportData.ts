import jsPDF from "jspdf";

// Shared export core — every module's "Export" button should go through this,
// not build its own CSV/Blob logic. `columns` is required and takes a `value`
// resolver per column (not a raw object key) specifically so exports can reuse
// the same formatting/name-resolution logic each table already uses on screen
// — this is what keeps raw ids, nested objects, and unformatted dates out of
// exported files.

export interface ExportColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
  /** PDF column width weight (relative). Defaults to 1 — give wide text columns (e.g. "Description") a bigger number. */
  weight?: number;
}

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function escapeCsv(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Builds the raw CSV text — exposed separately so callers needing a Blob for
 * something other than an immediate download (e.g. a future email attachment) can reuse it. */
export function toCsvString<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map(c => escapeCsv(c.label)).join(",");
  const body = rows
    .map(r => columns.map(c => escapeCsv(cell(c.value(r)))).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function exportToCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  if (!rows.length) return;
  const csv = toCsvString(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export interface ExportPdfBranding {
  name?: string | null;
  logo?: string | null;      // base64 data URL
  tagline?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** Station/branch name, shown top-right next to the doc title — mirrors BrandedDocHeader. */
  stationName?: string | null;
}

export interface ExportPdfOptions {
  /** Shown under the title — use this to state the active filter/period/status so the exported file is self-describing. */
  subtitle?: string;
  /** Business/account branding — draws the same logo+name+address header used on receipts and invoices. Omit to fall back to just the title block. */
  branding?: ExportPdfBranding;
}

function logoFormat(dataUrl: string): "PNG" | "JPEG" | null {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  return null;
}

/**
 * Generic table PDF — landscape for wide tables, paginates automatically,
 * repeats the header row on every page. No jspdf-autotable dependency; this
 * is a small manual column-flow renderer sized for this app's report tables.
 */
export function exportToPdf<T>(filename: string, title: string, rows: T[], columns: ExportColumn<T>[], opts: ExportPdfOptions = {}) {
  if (!rows.length) return;
  const landscape = columns.length > 5;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: landscape ? "landscape" : "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const usableW = pageW - margin * 2;
  const rowH = 18;
  const headerH = 22;

  const totalWeight = columns.reduce((s, c) => s + (c.weight ?? 1), 0);
  const colW = columns.map(c => (usableW * (c.weight ?? 1)) / totalWeight);
  const colX: number[] = [];
  let acc = margin;
  for (const w of colW) { colX.push(acc); acc += w; }

  let y = margin;

  function drawHeaderBand() {
    doc.setFillColor(20, 24, 28);
    doc.rect(margin, y, usableW, headerH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    columns.forEach((c, i) => {
      const text = doc.splitTextToSize(c.label, colW[i] - 8)[0] ?? c.label;
      doc.text(text, colX[i] + 5, y + headerH - 7);
    });
    y += headerH;
  }

  // Business/account branding block — same info as the receipt/invoice header
  // (logo, name, tagline, address, contact) on the left, station + doc title
  // on the right — so every exported PDF is traceable to the business that
  // produced it, not just an anonymous data dump.
  function drawBrandingBlock() {
    const b = opts.branding;
    if (!b) return;
    const logoSize = 40;
    const startY = y;
    let leftX = margin;

    const fmt = b.logo ? logoFormat(b.logo) : null;
    if (b.logo && fmt) {
      try { doc.addImage(b.logo, fmt, leftX, y, logoSize, logoSize); } catch { /* corrupt/unsupported image — skip silently */ }
      leftX += logoSize + 10;
    }

    let textY = y + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 24, 28);
    doc.text(b.name || "ISMS", leftX, textY);
    textY += 13;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 114, 120);
    if (b.tagline)  { doc.text(b.tagline, leftX, textY); textY += 11; }
    if (b.address)  { doc.text(b.address, leftX, textY); textY += 11; }
    const contact = [b.contactEmail, b.contactPhone].filter(Boolean).join("  ·  ");
    if (contact)    { doc.text(contact, leftX, textY); textY += 11; }

    // Right side: station + doc title, mirroring BrandedDocHeader
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60, 64, 70);
    doc.text(title.toUpperCase(), pageW - margin, startY + 12, { align: "right" });
    if (b.stationName) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 114, 120);
      doc.text(b.stationName, pageW - margin, startY + 26, { align: "right" });
    }

    y = Math.max(textY, startY + logoSize) + 8;
    doc.setDrawColor(210, 210, 210);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  }

  function drawTitleBlock() {
    if (!opts.branding) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(20, 24, 28);
      doc.text(title, margin, y);
      y += 18;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 114, 120);
    const generated = `Generated ${new Date().toLocaleString()} · ${rows.length} record${rows.length === 1 ? "" : "s"}`;
    doc.text(opts.subtitle ? `${opts.subtitle} · ${generated}` : generated, margin, y);
    y += 16;
  }

  function newPage() {
    doc.addPage();
    y = margin;
    drawHeaderBand();
  }

  drawBrandingBlock();
  drawTitleBlock();
  drawHeaderBand();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  rows.forEach((r, i) => {
    if (y + rowH > pageH - margin) newPage();
    if (i % 2 === 1) {
      doc.setFillColor(244, 243, 239);
      doc.rect(margin, y, usableW, rowH, "F");
    }
    doc.setTextColor(30, 32, 36);
    columns.forEach((c, ci) => {
      const raw = cell(c.value(r));
      const text = doc.splitTextToSize(raw, colW[ci] - 8)[0] ?? raw;
      doc.text(text, colX[ci] + 5, y + rowH - 6);
    });
    y += rowH;
  });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${p} of ${pages}`, pageW - margin - 60, pageH - 16);
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// Generic file download (used by document storage / already-built data URLs)
export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
