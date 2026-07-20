import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Download, FileText, Upload, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";
import { toast } from "sonner";
import { hrApi, ApiDocument, ApiEmployee } from "@/lib/hrApi";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";

export const DOC_TYPES = [
  "ID Card", "Passport", "KRA PIN Cert.", "SHA Card", "NSSF Card",
  "Academic Cert.", "Contract", "Driving Licence", "Medical Cert.",
  "Police Clearance", "Disciplinary Evidence", "Hearing Notice", "Appeal Letter", "Other",
];

const formatBytes = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${(b / 1024).toFixed(0)}KB`;

const emptyForm = {
  employeeId: "", type: "ID Card", fileName: "", fileSize: 0,
  fileData: "", expiresOn: "", status: "valid", notes: "", caseId: "",
};

export default function DocumentsTab() {
  const [data, setData] = useState<ApiDocument[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("EmployeeDocument", null, data.length);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiDocument | null>(null);
  const [viewing, setViewing] = useState<ApiDocument | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; onConfirm: () => void } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [visibleData, setVisibleData] = useState<ApiDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const can = usePermissions();
  const canManage = can("hr.staff.edit");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, empRes] = await Promise.allSettled([
        hrApi.documents.list(),
        hrApi.employees.list({ limit: 200 } as any),
      ]);
      if (docRes.status === "fulfilled") setData(docRes.value.data ?? []);
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load documents"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total:    visibleData.length,
    valid:    visibleData.filter(d => d.status === "valid").length,
    expiring: visibleData.filter(d => d.status === "expiring").length,
    expired:  visibleData.filter(d => d.status === "expired").length,
  };

  const columns: Column<ApiDocument>[] = [
    { key: "employee", label: "Employee", render: d => (d.employee?.user?.name ?? d.employee?.name) || "—" },
    { key: "type",     label: "Type",     render: d => <Badge variant="outline">{d.type}</Badge> },
    { key: "fileName", label: "File",     render: d => <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {d.fileName} <span className="text-[10px] text-muted-foreground">({formatBytes(d.fileSize)})</span></span> },
    { key: "uploadedAt", label: "Uploaded", sortable: true, render: d => d.uploadedAt?.split("T")[0] },
    { key: "expiresOn",  label: "Expires",  render: d => d.expiresOn || "—" },
    { key: "caseId",   label: "Case",     render: d => d.caseId ? <Badge variant="outline" className="text-[10px]">Linked</Badge> : "—" },
    { key: "status",   label: "Status",   render: d => {
      const cls = d.status === "valid" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : d.status === "expiring" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
      return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{d.status}</span>;
    }},
  ];

  const filters: FilterOption[] = [
    { key: "type",   label: "Type",   options: DOC_TYPES.map(t => ({ label: t, value: t })) },
    { key: "status", label: "Status", options: ["valid", "expiring", "expired"].map(s => ({ label: s, value: s })) },
  ];

  const exportColumns: ExportColumn<ApiDocument>[] = [
    { label: "Employee",   value: d => (d.employee?.user?.name ?? d.employee?.name) || "—" },
    { label: "Type",       value: d => d.type },
    { label: "File",       value: d => d.fileName },
    { label: "Size",       value: d => formatBytes(d.fileSize) },
    { label: "Uploaded",   value: d => d.uploadedAt?.split("T")[0] || "—" },
    { label: "Uploaded By",value: d => d.uploadedBy || "—" },
    { label: "Expires",    value: d => d.expiresOn || "—" },
    { label: "Linked Case",value: d => d.caseId ? "Yes" : "No" },
    { label: "Status",     value: d => d.status },
    { label: "Notes",      value: d => d.notes || "—" },
  ];

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (d: ApiDocument) => {
    setEditing(d);
    setForm({ employeeId: d.employeeId, type: d.type, fileName: d.fileName, fileSize: d.fileSize, fileData: "", expiresOn: d.expiresOn || "", status: d.status, notes: d.notes || "", caseId: d.caseId || "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeId) return toast.error("Select an employee");
    if (!editing && !form.fileData) return toast.error("Choose a file to upload");
    setSaving(true);
    try {
      if (editing) {
        const patch: Record<string, unknown> = { type: form.type, expiresOn: form.expiresOn || undefined, status: form.status, notes: form.notes || undefined, caseId: form.caseId || undefined };
        if (form.fileData) { patch.fileName = form.fileName; patch.fileSize = form.fileSize; patch.fileData = form.fileData; }
        await hrApi.documents.update(editing.id, patch as any);
        toast.success("Document updated");
      } else {
        await hrApi.documents.create({ employeeId: form.employeeId, type: form.type, fileName: form.fileName, fileSize: form.fileSize, fileData: form.fileData, expiresOn: form.expiresOn || undefined, status: form.status, notes: form.notes || undefined, caseId: form.caseId || undefined });
        toast.success("Document uploaded");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = (d: ApiDocument) => {
    setConfirmDlg({
      title: `Delete "${d.fileName}"?`,
      onConfirm: async () => {
        try { await hrApi.documents.remove(d.id); toast.success("Document deleted"); load(); }
        catch (e: any) { toast.error(e.message || "Cannot delete"); }
      },
    });
  };

  const handleDownload = async (d: ApiDocument) => {
    try {
      const res = await hrApi.documents.download(d.id);
      const { fileName, fileData } = res.data;
      const a = document.createElement("a");
      a.href = fileData;
      a.download = fileName;
      a.click();
    } catch (e: any) { toast.error(e.message || "Download failed"); }
  };

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB per file");
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, fileName: file.name, fileSize: file.size, fileData: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Management</h3>
          <p className="text-sm text-muted-foreground">Employee documents, expiries &amp; compliance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <ExportMenu filename="employee-documents" title="Employee Documents" rows={visibleData} columns={exportColumns} />
          {canManage && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Upload Document</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",        value: stats.total,    color: "" },
          { label: "Valid",        value: stats.valid,    color: "text-green-600" },
          { label: "Expiring Soon", value: stats.expiring, color: "text-amber-600" },
          { label: "Expired",      value: stats.expired,  color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{loading ? "…" : s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={data}
        columns={columns}
        searchKeys={["fileName", "employee.user.name", "employee.name"]}
        searchPlaceholder="Search documents or employee..."
        filters={filters}
        onView={d => setViewing(d)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        actions={d => (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(d)} title="Download">
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
        onFilteredChange={setVisibleData}
        pendingDeleteIds={pendingDeleteIds}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Document" : "Upload Document"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Upload"}>
        <div className="space-y-4">
          {!editing && (
            <div><Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={v => set("employeeId", v)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.name ?? e.employeeNumber} — {e.employeeNumber}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
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
            <div className="col-span-2"><Label>Expires On</Label><Input value={form.expiresOn} onChange={e => set("expiresOn", e.target.value)} placeholder="YYYY-MM-DD or leave blank" /></div>
          </div>
          <div>
            <Label>File {editing ? "(leave blank to keep existing)" : "*"}</Label>
            <div className="flex gap-2 items-center mt-1.5">
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Choose File</Button>
              {form.fileName && <span className="text-sm text-muted-foreground"><FileText className="h-3.5 w-3.5 inline mr-1" />{form.fileName} ({formatBytes(form.fileSize)})</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Max 5MB.</p>
          </div>
          <div><Label>Link to Disciplinary Case (optional)</Label><Input value={form.caseId} onChange={e => set("caseId", e.target.value)} placeholder="Case ID" /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Document" isView>
        {viewing && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><Badge>{viewing.type}</Badge></div>
            <div><span className="text-muted-foreground">Employee:</span> {(viewing.employee?.user?.name ?? viewing.employee?.name) || "—"}</div>
            <div><span className="text-muted-foreground">File:</span> {viewing.fileName} ({formatBytes(viewing.fileSize)})</div>
            <div><span className="text-muted-foreground">Uploaded:</span> {viewing.uploadedAt?.split("T")[0]} by {viewing.uploadedBy}</div>
            <div><span className="text-muted-foreground">Expires:</span> {viewing.expiresOn || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> {viewing.status}</div>
            {viewing.caseId && <div><span className="text-muted-foreground">Case:</span> {viewing.caseId}</div>}
            {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
            <Button variant="outline" size="sm" className="mt-3" onClick={() => handleDownload(viewing)}><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>
          </div>
        )}
      </ModalForm>

      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        confirmLabel="Delete"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  );
}
