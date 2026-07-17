// Fetches server-generated PDFs (invoices, receipts, payslips) — a raw blob
// fetch rather than the JSON-only `api` client, but reusing its same auth
// headers so permission-gated PDF routes work identically to any other call.
import { getAccessToken, getActiveStationId, BASE_URL } from "@/lib/api";

async function fetchPdfBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const stationId = getActiveStationId();
  if (stationId) headers["x-station-id"] = stationId;

  const res = await fetch(`${BASE_URL}${path}`, { headers, credentials: "include" });
  if (!res.ok) {
    let message = "Failed to generate PDF";
    try { message = (await res.json())?.message || message; } catch { /* non-JSON error body */ }
    throw new Error(message);
  }
  return res.blob();
}

/** Opens the PDF in a new tab — used for the "Print" action (the browser's own print dialog takes it from there). */
export async function openPdfInNewTab(path: string): Promise<void> {
  const blob = await fetchPdfBlob(path);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Downloads the PDF to disk under the given filename. */
export async function downloadPdf(path: string, filename: string): Promise<void> {
  const blob = await fetchPdfBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
