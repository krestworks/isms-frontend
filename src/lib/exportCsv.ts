// Tiny CSV export helper — works for any array of objects.
export function exportToCsv<T extends Record<string, any>>(filename: string, rows: T[], columns?: { key: keyof T; label: string }[]) {
  if (!rows.length) return;
  const cols = columns || Object.keys(rows[0]).map(k => ({ key: k as keyof T, label: k }));
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const header = cols.map(c => escape(c.label)).join(",");
  const body = rows.map(r => cols.map(c => escape(r[c.key])).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generic file download (used by document storage)
export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
