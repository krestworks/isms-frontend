import { useRef, useState } from "react";
import { Plus, Download, FileText, Upload } from "lucide-react";
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
import { downloadDataUrl, exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  fileName: string;
  fileSize: number;
  fileData?: string; // data URL for download
  uploadedOn: string;
  expiresOn: string;
  status: string;
  notes: string;
}

export const DOC_TYPES = ["ID Card", "Passport", "KRA PIN Cert.", "NHIF/SHIF Card", "NSSF Card", "Academic Cert.", "Contract", "Driving Licence", "Medical Cert.", "Police Clearance", "Other"];

const initial: EmployeeDocument[] = [
  { id: "DOC-001", employeeId: "EMP-001", employeeName: "James Mwangi", type: "ID Card", fileName: "james_id.pdf", fileSize: 245678, uploadedOn: "2025-01-16", expiresOn: "2030-01-15", status: "valid", notes: "" },
  { id: "DOC-002", employeeId: "EMP-001", employeeName: "James Mwangi", type: "Contract", fileName: "james_contract.pdf", fileSize: 189234, uploadedOn: "2025-01-15", expiresOn: "2026-12-31", status: "expiring", notes: "Renewal due Dec 2026" },
  { id: "DOC-003", employeeId: "EMP-002", employeeName: "Grace Wanjiku", type: "KRA PIN Cert.", fileName: "grace_kra.pdf", fileSize: 87123, uploadedOn: "2024-11-02", expiresOn: "—", status: "valid", notes: "" },
];

const emptyForm = { employeeId: "", type: "ID Card", fileName: "", fileSize: 0, fileData: "", uploadedOn: "", expiresOn: "", status: "valid", notes: "" };

const formatBytes = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${(b / 1024).toFixed(0)}KB`;

export default function DocumentsTab() {
  const staff = useStaff();
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeDocument | null>(null);
  const [viewing, setViewing] = useState<EmployeeDocument | null>(null);
  const [form, setForm] = useState(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = {
    total: data.length,
    valid: data.filter(d => d.status === "valid").length,
    expiring: data.filter(d => d.status === "expiring").length,
    expired: data.filter(d => d.status === "expired").length,
  };

  const columns: Column<EmployeeDocument>[] = [
    { key: "id", label: "Doc ID" },
    { key: "employeeName", label: "Employee" },
    { key: "type", label: "Type", render: d => <Badge variant="outline">{d.type}</Badge> },
    { key: "fileName", label: "File", render: d => <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {d.fileName} <span className="text-[10px] text-muted-foreground">({formatBytes(d.fileSize)})</span></span> },
    { key: "uploadedOn", label: "Uploaded", sortable: true },
    { key: "expiresOn", label: "Expires" },
    { key: "status", label: "Status", render: d => {
      const cls = d.status === "valid" ? "bg-green-100 text-green-800" : d.status === "expiring" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
      return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{d.status}</span>;
    }},
  ];

  const filters: FilterOption[] = [
    { key: "type", label: "Type", options: DOC_TYPES.map(t => ({ label: t, value: t })) },
    { key: "status", label: "Status", options: ["valid", "expiring", "expired"].map(s => ({ label: s, value: s })) },
  ];

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, uploadedOn: new Date().toISOString().split("T")[0] }); setModalOpen(true); };
  const openEdit = (d: EmployeeDocument) => { setEditing(d); setForm({ employeeId: d.employeeId, type: d.type, fileName: d.fileName, fileSize: d.fileSize, fileData: d.fileData || "", uploadedOn: d.uploadedOn, expiresOn: d.expiresOn, status: d.status, notes: d.notes }); setModalOpen(true); };
  const handleSave = () => {
    if (!form.employeeId) return toast.error("Select an employee");
    if (!editing && !form.fileData) return toast.error("Choose a file to upload");
    const emp = staff.find(s => s.id === form.employeeId);
    const employeeName = emp?.name || form.employeeId;
    if (editing) setData(d => d.map(i => i.id === editing.id ? { ...i, ...form, employeeName } : i));
    else setData(d => [...d, { id: `DOC-${String(d.length + 1).padStart(3, "0")}`, ...form, employeeName }]);
    setModalOpen(false);
    toast.success(editing ? "Document updated" : "Document uploaded");
  };
  const handleDelete = (d: EmployeeDocument) => setData(arr => arr.filter(i => i.id !== d.id));
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const handleDownload = (d: EmployeeDocument) => {
    if (d.fileData) downloadDataUrl(d.fileName, d.fileData);
    else toast.info(`No stored file for ${d.fileName} (sample record)`);
  };

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB per file");
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, fileName: file.name, fileSize: file.size, fileData: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleExport = () => exportToCsv("employee-documents.csv", data.map(({ fileData, ...r }) => r));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Management</h3>
          <p className="text-sm text-muted-foreground">Employee documents, expiries & compliance — files stored in browser</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Upload Document</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "" },
          { label: "Valid", value: stats.valid, color: "text-green-600" },
          { label: "Expiring Soon", value: stats.expiring, color: "text-amber-600" },
          { label: "Expired", value: stats.expired, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["employeeName", "fileName", "id"]} searchPlaceholder="Search documents..." filters={filters} onView={d => setViewing(d)} onEdit={openEdit} onDelete={handleDelete} actions={d => <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(d)}><Download className="h-3.5 w-3.5" /></Button>} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Document" : "Upload Document"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Upload"}>
        <div className="space-y-4">
          <div><Label>Employee *</Label>
            <Select value={form.employeeId} onValueChange={v => set("employeeId", v)}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Document Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["valid", "expiring", "expired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Uploaded On</Label><Input type="date" value={form.uploadedOn} onChange={e => set("uploadedOn", e.target.value)} /></div>
            <div><Label>Expires On</Label><Input value={form.expiresOn} onChange={e => set("expiresOn", e.target.value)} placeholder="YYYY-MM-DD or —" /></div>
          </div>
          <div>
            <Label>File Upload {editing ? "(leave to keep existing)" : "*"}</Label>
            <div className="flex gap-2 items-center">
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Choose File</Button>
              {form.fileName && <span className="text-sm text-muted-foreground"><FileText className="h-3.5 w-3.5 inline mr-1" />{form.fileName} ({formatBytes(form.fileSize)})</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Max 5MB. Stored locally in this browser.</p>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Document" isView>
        {viewing && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><Badge variant="outline">{viewing.id}</Badge><Badge>{viewing.type}</Badge></div>
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
            <div><span className="text-muted-foreground">File:</span> {viewing.fileName} ({formatBytes(viewing.fileSize)})</div>
            <div><span className="text-muted-foreground">Uploaded:</span> {viewing.uploadedOn}</div>
            <div><span className="text-muted-foreground">Expires:</span> {viewing.expiresOn}</div>
            <div><span className="text-muted-foreground">Status:</span> {viewing.status}</div>
            {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
            <Button variant="outline" size="sm" className="mt-3" onClick={() => handleDownload(viewing)}><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
