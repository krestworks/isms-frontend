import { useState } from "react";
import { Plus, Download, FileText } from "lucide-react";
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

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  fileName: string;
  uploadedOn: string;
  expiresOn: string;
  status: string; // valid | expiring | expired
  notes: string;
}

export const DOC_TYPES = ["ID Card", "Passport", "KRA PIN Cert.", "NHIF/SHIF Card", "NSSF Card", "Academic Cert.", "Contract", "Driving Licence", "Medical Cert.", "Police Clearance", "Other"];

const initial: EmployeeDocument[] = [
  { id: "DOC-001", employeeId: "EMP-001", employeeName: "James Mwangi", type: "ID Card", fileName: "james_id.pdf", uploadedOn: "2025-01-16", expiresOn: "2030-01-15", status: "valid", notes: "" },
  { id: "DOC-002", employeeId: "EMP-001", employeeName: "James Mwangi", type: "Contract", fileName: "james_contract.pdf", uploadedOn: "2025-01-15", expiresOn: "2026-12-31", status: "expiring", notes: "Renewal due Dec 2026" },
  { id: "DOC-003", employeeId: "EMP-002", employeeName: "Grace Wanjiku", type: "KRA PIN Cert.", fileName: "grace_kra.pdf", uploadedOn: "2024-11-02", expiresOn: "—", status: "valid", notes: "" },
  { id: "DOC-004", employeeId: "EMP-004", employeeName: "Mary Akinyi", type: "Driving Licence", fileName: "mary_dl.pdf", uploadedOn: "2024-06-21", expiresOn: "2026-03-10", status: "expired", notes: "Renewal needed" },
  { id: "DOC-005", employeeId: "EMP-003", employeeName: "Peter Ochieng", type: "Police Clearance", fileName: "peter_pcc.pdf", uploadedOn: "2025-03-12", expiresOn: "2026-03-12", status: "expiring", notes: "" },
];

const emptyForm = { employeeId: "", type: "ID Card", fileName: "", uploadedOn: "", expiresOn: "", status: "valid", notes: "" };

export default function DocumentsTab() {
  const staff = useStaff();
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeDocument | null>(null);
  const [viewing, setViewing] = useState<EmployeeDocument | null>(null);
  const [form, setForm] = useState(emptyForm);

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
    { key: "fileName", label: "File", render: d => <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {d.fileName}</span> },
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
  const openEdit = (d: EmployeeDocument) => { setEditing(d); setForm({ employeeId: d.employeeId, type: d.type, fileName: d.fileName, uploadedOn: d.uploadedOn, expiresOn: d.expiresOn, status: d.status, notes: d.notes }); setModalOpen(true); };
  const handleSave = () => {
    const emp = staff.find(s => s.id === form.employeeId);
    const employeeName = emp?.name || form.employeeId;
    if (editing) setData(d => d.map(i => i.id === editing.id ? { ...i, ...form, employeeName } : i));
    else setData(d => [...d, { id: `DOC-${String(d.length + 1).padStart(3, "0")}`, ...form, employeeName }]);
    setModalOpen(false);
  };
  const handleDelete = (d: EmployeeDocument) => setData(arr => arr.filter(i => i.id !== d.id));
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Management</h3>
          <p className="text-sm text-muted-foreground">Employee documents, expiries & compliance</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Upload Document</Button>
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

      <DataTable data={data} columns={columns} searchKeys={["employeeName", "fileName", "id"]} searchPlaceholder="Search documents..." filters={filters} onView={d => setViewing(d)} onEdit={openEdit} onDelete={handleDelete} actions={d => <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => alert(`Downloading ${d.fileName}`)}><Download className="h-3.5 w-3.5" /></Button>} />

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
            <div><Label>File Name</Label><Input value={form.fileName} onChange={e => set("fileName", e.target.value)} placeholder="e.g. id_card.pdf" /></div>
            <div><Label>Uploaded On</Label><Input type="date" value={form.uploadedOn} onChange={e => set("uploadedOn", e.target.value)} /></div>
            <div><Label>Expires On</Label><Input value={form.expiresOn} onChange={e => set("expiresOn", e.target.value)} placeholder="YYYY-MM-DD or —" /></div>
            <div className="col-span-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["valid", "expiring", "expired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>File Upload</Label><Input type="file" /><p className="text-xs text-muted-foreground mt-1">Connect Lovable Cloud to enable real file storage</p></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Document" isView>
        {viewing && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><Badge variant="outline">{viewing.id}</Badge><Badge>{viewing.type}</Badge></div>
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
            <div><span className="text-muted-foreground">File:</span> {viewing.fileName}</div>
            <div><span className="text-muted-foreground">Uploaded:</span> {viewing.uploadedOn}</div>
            <div><span className="text-muted-foreground">Expires:</span> {viewing.expiresOn}</div>
            <div><span className="text-muted-foreground">Status:</span> {viewing.status}</div>
            {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
            <Button variant="outline" size="sm" className="mt-3"><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
