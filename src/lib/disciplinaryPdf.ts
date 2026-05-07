import jsPDF from "jspdf";
import type { DisciplinaryCase } from "@/components/hr/DisciplinaryTab";
import { documentsStore } from "@/data/documentsStore";
import { DISCIPLINARY_STAGES } from "@/components/hr/DisciplinaryTab";

export function generateDisciplinaryPdf(c: DisciplinaryCase) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const line = (text: string, opts: { size?: number; bold?: boolean; color?: [number,number,number]; gap?: number } = {}) => {
    const { size = 11, bold = false, color = [30,30,30], gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, W - margin * 2);
    if (y + wrapped.length * (size + 2) > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
    doc.text(wrapped, margin, y);
    y += wrapped.length * (size + 2) + gap;
  };
  const hr = () => { doc.setDrawColor(220); doc.line(margin, y, W - margin, y); y += 10; };

  // Header
  doc.setFillColor(43, 158, 143); doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("Disciplinary Case Report", margin, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Case ${c.id} · Generated ${new Date().toLocaleString()}`, margin, 50);
  y = 100;

  line("Case Summary", { size: 13, bold: true, color: [43,158,143] });
  hr();
  line(`Employee: ${c.employeeName} (${c.employeeId})`);
  line(`Category: ${c.category}`);
  line(`Offence: ${c.offence}`);
  line(`Reported: ${c.reportedOn} by ${c.reportedBy}`);
  line(`Current Stage: ${c.stage}`);
  line(`Outcome: ${c.outcome || "—"}`);
  if (c.hearingDate) line(`Hearing Date: ${c.hearingDate}`);
  y += 6;

  // Stage timeline
  line("Process Timeline", { size: 13, bold: true, color: [43,158,143] });
  hr();
  const currentIdx = DISCIPLINARY_STAGES.indexOf(c.stage);
  DISCIPLINARY_STAGES.forEach((s, i) => {
    const passed = i <= currentIdx;
    line(`${passed ? "●" : "○"}  ${s}${i === currentIdx ? "  ← current" : ""}`, { color: passed ? [30,30,30] : [160,160,160], gap: 2 });
  });
  y += 6;

  // Appeal
  if (c.appealStatus && c.appealStatus !== "—" && c.appealStatus !== "Not Filed") {
    line("Appeal", { size: 13, bold: true, color: [43,158,143] });
    hr();
    line(`Status: ${c.appealStatus}`);
    if (c.appealFiledOn) line(`Filed: ${c.appealFiledOn}`);
    if (c.appealHearingDate) line(`Hearing: ${c.appealHearingDate}`);
    if (c.appealGrounds) line(`Grounds: ${c.appealGrounds}`);
    if (c.appealDecision && c.appealDecision !== "—") line(`Decision: ${c.appealDecision}`);
    if (c.appealDecidedOn) line(`Decided: ${c.appealDecidedOn}`);
    y += 6;
  }

  // Notes
  if (c.notes) {
    line("Notes", { size: 13, bold: true, color: [43,158,143] });
    hr();
    line(c.notes);
    y += 6;
  }

  // Documents
  const linked = documentsStore.byCase(c.id);
  line(`Linked Documents (${linked.length})`, { size: 13, bold: true, color: [43,158,143] });
  hr();
  if (linked.length === 0) line("No documents linked.", { color: [120,120,120] });
  else linked.forEach((d, i) => line(`${i + 1}. ${d.fileName} — ${d.type} · uploaded ${d.uploadedOn}`, { gap: 2 }));

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`ISMS — Confidential · Page ${p} of ${pages}`, margin, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`${c.id}-${c.employeeName.replace(/\s+/g, "_")}-disciplinary.pdf`);
}
