import { useRef, useState } from "react";
import { Plus, Paperclip, Download, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useStaff } from "@/data/staffStore";
import { documentsStore, useDocuments } from "@/data/documentsStore";
import { downloadDataUrl } from "@/lib/exportCsv";
import { toast } from "sonner";

export const DISCIPLINARY_STAGES = [
  "Informal Action",
  "Investigation",
  "Suspension",
  "Notification to Hearing",
  "Disciplinary Hearing",
  "Decision Outcome",
  "Appeal",
  "Closed",
];

export const DECISION_OUTCOMES = [
  "No Action",
  "Verbal Warning",
  "First Written Warning",
  "Final Written Warning",
  "Dismissal",
  "Summary Dismissal",
];

export interface DisciplinaryCase {
  id: string;
  employeeId: string;
  employeeName: string;
  offence: string;
  category: string;
  reportedBy: string;
  reportedOn: string;
  stage: string;
  outcome: string;
  hearingDate: string;
  appealStatus: string;
  appealFiledOn: string;
  appealGrounds: string;
  appealHearingDate: string;
  appealDecision: string;
  appealDecidedOn: string;
  notes: string;
}

const initial: DisciplinaryCase[] = [
  { id: "DC-001", employeeId: "EMP-003", employeeName: "Peter Ochieng", offence: "Late arrivals (5 occurrences in month)", category: "Misconduct", reportedBy: "Grace Wanjiku", reportedOn: "2026-04-10", stage: "Investigation", outcome: "—", hearingDate: "", appealStatus: "—", appealFiledOn: "", appealGrounds: "", appealHearingDate: "", appealDecision: "—", appealDecidedOn: "", notes: "Pattern began after shift reassignment" },
  { id: "DC-002", employeeId: "EMP-005", employeeName: "David Kimani", offence: "Cash discrepancy KES 12,500", category: "Gross Misconduct", reportedBy: "James Mwangi", reportedOn: "2026-03-25", stage: "Appeal", outcome: "Final Written Warning", hearingDate: "2026-04-02", appealStatus: "Under Review", appealFiledOn: "2026-04-05", appealGrounds: "Procedural irregularity in hearing", appealHearingDate: "2026-04-20", appealDecision: "—", appealDecidedOn: "", notes: "Repaid; final warning issued" },
  { id: "DC-003", employeeId: "EMP-001", employeeName: "James Mwangi", offence: "Customer complaint — rudeness", category: "Misconduct", reportedBy: "Mary Akinyi", reportedOn: "2026-04-15", stage: "Informal Action", outcome: "—", hearingDate: "", appealStatus: "—", appealFiledOn: "", appealGrounds: "", appealHearingDate: "", appealDecision: "—", appealDecidedOn: "", notes: "" },
];

const emptyForm = { employeeId: "", offence: "", category: "Misconduct", reportedBy: "", reportedOn: "", stage: "Informal Action", outcome: "—", hearingDate: "", appealStatus: "—", appealFiledOn: "", appealGrounds: "", appealHearingDate: "", appealDecision: "—", appealDecidedOn: "", notes: "" };

const stageColor: Record<string, string> = {
  "Informal Action": "bg-blue-100 text-blue-800",
  "Investigation": "bg-amber-100 text-amber-800",
  "Suspension": "bg-orange-100 text-orange-800",
  "Notification to Hearing": "bg-purple-100 text-purple-800",
  "Disciplinary Hearing": "bg-pink-100 text-pink-800",
  "Decision Outcome": "bg-indigo-100 text-indigo-800",
  "Appeal": "bg-yellow-100 text-yellow-800",
  "Closed": "bg-green-100 text-green-800",
};

export default function DisciplinaryTab() {
  const staff = useStaff();
  const allDocs = useDocuments();
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DisciplinaryCase | null>(null);
  const [viewing, setViewing] = useState<DisciplinaryCase | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  const attachFile = (caseId: string, employeeId: string, employeeName: string, file: File, docType: string) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    const reader = new FileReader();
    reader.onload = () => {
      documentsStore.add({
        employeeId, employeeName, type: docType, fileName: file.name, fileSize: file.size,
        fileData: reader.result as string, uploadedOn: new Date().toISOString().split("T")[0],
        expiresOn: "—", status: "valid", notes: `Attached to ${caseId}`, caseId,
      });
      toast.success("Document attached to case");
    };
    reader.readAsDataURL(file);
  };

  const stats = {
    open: data.filter(d => d.stage !== "Closed").length,
    investigation: data.filter(d => d.stage === "Investigation").length,
    hearing: data.filter(d => d.stage === "Disciplinary Hearing" || d.stage === "Notification to Hearing").length,
    closed: data.filter(d => d.stage === "Closed").length,
  };

  const columns: Column<DisciplinaryCase>[] = [
    { key: "id", label: "Case ID", sortable: true },
    { key: "employeeName", label: "Employee" },
    { key: "category", label: "Category", render: i => <Badge variant="outline">{i.category}</Badge> },
    { key: "offence", label: "Offence", render: i => <span className="line-clamp-1">{i.offence}</span> },
    { key: "reportedOn", label: "Reported", sortable: true },
    { key: "stage", label: "Stage", render: i => <span className={`px-2 py-0.5 rounded text-xs font-medium ${stageColor[i.stage] || "bg-muted"}`}>{i.stage}</span> },
    { key: "outcome", label: "Outcome" },
  ];

  const filters: FilterOption[] = [
    { key: "stage", label: "Stage", options: DISCIPLINARY_STAGES.map(s => ({ label: s, value: s })) },
    { key: "category", label: "Category", options: ["Misconduct", "Gross Misconduct", "Performance", "Attendance", "Other"].map(c => ({ label: c, value: c })) },
  ];

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, reportedOn: new Date().toISOString().split("T")[0] }); setModalOpen(true); };
  const openEdit = (c: DisciplinaryCase) => { setEditing(c); setForm({ employeeId: c.employeeId, offence: c.offence, category: c.category, reportedBy: c.reportedBy, reportedOn: c.reportedOn, stage: c.stage, outcome: c.outcome, hearingDate: c.hearingDate, appealStatus: c.appealStatus, appealFiledOn: c.appealFiledOn || "", appealGrounds: c.appealGrounds || "", appealHearingDate: c.appealHearingDate || "", appealDecision: c.appealDecision || "—", appealDecidedOn: c.appealDecidedOn || "", notes: c.notes }); setModalOpen(true); };

  const handleSave = () => {
    const emp = staff.find(s => s.id === form.employeeId);
    const employeeName = emp?.name || form.employeeId;
    if (editing) setData(d => d.map(i => i.id === editing.id ? { ...i, ...form, employeeName } : i));
    else setData(d => [...d, { id: `DC-${String(d.length + 1).padStart(3, "0")}`, ...form, employeeName }]);
    setModalOpen(false);
  };
  const handleDelete = (c: DisciplinaryCase) => setData(d => d.filter(i => i.id !== c.id));
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Disciplinary</h3>
          <p className="text-sm text-muted-foreground">Track disciplinary process from informal action through appeal</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Case</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Cases", value: stats.open, color: "text-amber-600" },
          { label: "Under Investigation", value: stats.investigation, color: "text-orange-600" },
          { label: "Pending Hearing", value: stats.hearing, color: "text-pink-600" },
          { label: "Closed", value: stats.closed, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["employeeName", "id", "offence"]} searchPlaceholder="Search cases..." filters={filters} onView={c => setViewing(c)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Case" : "New Disciplinary Case"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Open Case"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={v => set("employeeId", v)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Misconduct", "Gross Misconduct", "Performance", "Attendance", "Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Offence / Incident *</Label><Textarea value={form.offence} onChange={e => set("offence", e.target.value)} /></div>
            <div><Label>Reported By</Label><Input value={form.reportedBy} onChange={e => set("reportedBy", e.target.value)} /></div>
            <div><Label>Reported On</Label><Input type="date" value={form.reportedOn} onChange={e => set("reportedOn", e.target.value)} /></div>
            <div><Label>Stage</Label>
              <Select value={form.stage} onValueChange={v => set("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISCIPLINARY_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Hearing Date</Label><Input type="date" value={form.hearingDate} onChange={e => set("hearingDate", e.target.value)} /></div>
            <div><Label>Decision Outcome</Label>
              <Select value={form.outcome} onValueChange={v => set("outcome", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="—">— Pending —</SelectItem>
                  {DECISION_OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Appeal Status</Label>
              <Select value={form.appealStatus} onValueChange={v => set("appealStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["—", "Not Filed", "Filed", "Under Review", "Upheld", "Overturned"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          </div>

          {/* Appeal flow — only relevant if appeal opened */}
          {form.appealStatus !== "—" && form.appealStatus !== "Not Filed" && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-amber-700">Appeal Process</p>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Appeal Filed On</Label><Input type="date" value={form.appealFiledOn} onChange={e => set("appealFiledOn", e.target.value)} /></div>
                <div><Label>Appeal Hearing Date</Label><Input type="date" value={form.appealHearingDate} onChange={e => set("appealHearingDate", e.target.value)} /></div>
                <div className="col-span-2"><Label>Grounds of Appeal</Label><Textarea value={form.appealGrounds} onChange={e => set("appealGrounds", e.target.value)} placeholder="Reasons given by employee for appealing..." /></div>
                <div><Label>Appeal Decision</Label>
                  <Select value={form.appealDecision} onValueChange={v => set("appealDecision", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["—", "Upheld (original stands)", "Overturned (cleared)", "Reduced sanction", "Increased sanction", "Remitted for re-hearing"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Decision Date</Label><Input type="date" value={form.appealDecidedOn} onChange={e => set("appealDecidedOn", e.target.value)} /></div>
              </div>
            </div>
          )}
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Disciplinary Case" isView>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{viewing.id}</Badge>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${stageColor[viewing.stage] || "bg-muted"}`}>{viewing.stage}</span>
            </div>
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName} ({viewing.employeeId})</div>
            <div><span className="text-muted-foreground">Category:</span> {viewing.category}</div>
            <div><span className="text-muted-foreground">Offence:</span> {viewing.offence}</div>
            <div><span className="text-muted-foreground">Reported:</span> {viewing.reportedOn} by {viewing.reportedBy}</div>
            <div><span className="text-muted-foreground">Hearing:</span> {viewing.hearingDate || "—"}</div>
            <div><span className="text-muted-foreground">Outcome:</span> {viewing.outcome}</div>
            <div><span className="text-muted-foreground">Appeal:</span> {viewing.appealStatus} {viewing.appealDecision !== "—" && viewing.appealDecision && <Badge variant="outline" className="ml-2">{viewing.appealDecision}</Badge>}</div>
            {viewing.appealFiledOn && <div className="text-xs text-muted-foreground pl-3">Filed {viewing.appealFiledOn} · Hearing {viewing.appealHearingDate || "—"} · Decided {viewing.appealDecidedOn || "pending"}</div>}
            {viewing.appealGrounds && <div className="text-xs pl-3 italic">"{viewing.appealGrounds}"</div>}
            {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}

            <div className="pt-3 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Process Timeline</p>
              <ol className="space-y-1">
                {DISCIPLINARY_STAGES.map((s, i) => {
                  const currentIdx = DISCIPLINARY_STAGES.indexOf(viewing.stage);
                  const passed = i <= currentIdx;
                  return (
                    <li key={s} className={`flex items-center gap-2 ${passed ? "" : "text-muted-foreground/50"}`}>
                      <span className={`h-2 w-2 rounded-full ${passed ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      <span className="text-xs">{s}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Paperclip className="h-3 w-3" /> Attached Documents ({allDocs.filter(d => d.caseId === viewing.id).length})</p>
                <div>
                  <input ref={fileRef} type="file" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]; if (!f || !viewing) return;
                    attachFile(viewing.id, viewing.employeeId, viewing.employeeName, f, "Disciplinary Evidence");
                    e.target.value = "";
                  }} />
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileRef.current?.click()}><Upload className="h-3 w-3 mr-1" /> Attach</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                {allDocs.filter(d => d.caseId === viewing.id).map(d => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs">
                    <span className="flex items-center gap-1.5"><Paperclip className="h-3 w-3" /> {d.fileName} <Badge variant="outline" className="text-[9px]">{d.type}</Badge></span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => d.fileData ? downloadDataUrl(d.fileName, d.fileData) : toast.info("No stored file")}><Download className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => documentsStore.remove(d.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
                {allDocs.filter(d => d.caseId === viewing.id).length === 0 && <p className="text-xs text-muted-foreground italic">No documents linked yet</p>}
              </div>
            </div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
