import { useState } from "react";
import { Plus, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DOC_TYPES, documentsStore, useDocuments, EmployeeDocument } from "@/data/documentsStore";
import { useMyEmployee } from "@/lib/useMyEmployee";
import { toast } from "sonner";

const emptyForm = { type: "ID Card", fileName: "", uploadedOn: "", expiresOn: "" };

export default function MyDocumentsTab() {
  const { employee } = useMyEmployee();
  const allDocs = useDocuments();
  const data = employee ? allDocs.filter(d => d.employeeId === employee.id) : [];

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const columns: Column<EmployeeDocument>[] = [
    { key: "id",         label: "Doc ID" },
    { key: "type",       label: "Type",     render: d => <Badge variant="outline">{d.type}</Badge> },
    { key: "fileName",   label: "File",     render: d => <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{d.fileName}</span> },
    { key: "uploadedOn", label: "Uploaded", sortable: true },
    { key: "expiresOn",  label: "Expires" },
    { key: "status",     label: "Status",   render: d => {
      const cls = d.status === "valid" ? "bg-green-100 text-green-800" : d.status === "expiring" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
      return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{d.status}</span>;
    } },
  ];

  const openNew = () => { setForm({ ...emptyForm, uploadedOn: new Date().toISOString().split("T")[0] }); setModalOpen(true); };

  const handleSave = () => {
    if (!employee) return;
    documentsStore.add({
      employeeId: employee.id,
      employeeName: employee.user.name,
      type: form.type,
      fileName: form.fileName,
      fileSize: 0,
      uploadedOn: form.uploadedOn || new Date().toISOString().split("T")[0],
      expiresOn: form.expiresOn || "—",
      status: "valid",
      notes: "",
    });
    setModalOpen(false);
    toast.success("Document submitted — HR will verify shortly.");
  };

  const handleDownload = (d: EmployeeDocument) => {
    if (d.fileData) {
      const a = document.createElement("a");
      a.href = d.fileData; a.download = d.fileName; a.click();
    } else {
      toast.info(`No file data stored for ${d.fileName}`);
    }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">My Documents</h3>
          <p className="text-sm text-muted-foreground">Your personal documents on file. Submit renewals here.</p>
        </div>
        <Button onClick={openNew} disabled={!employee}><Plus className="h-4 w-4 mr-2" /> Submit Document</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Expiring Soon</p><p className="text-2xl font-bold text-amber-600">{data.filter(d => d.status === "expiring").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Expired</p><p className="text-2xl font-bold text-destructive">{data.filter(d => d.status === "expired").length}</p></CardContent></Card>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["fileName", "type"]} searchPlaceholder="Search my documents..."
        actions={d => <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(d)}><Download className="h-3.5 w-3.5" /></Button>} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Document" description="Upload a new or renewed document for HR review" onSubmit={handleSave} submitLabel="Submit">
        <div className="space-y-4">
          <div><Label>Document Type</Label>
            <Select value={form.type} onValueChange={v => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>File Name</Label><Input value={form.fileName} onChange={e => set("fileName", e.target.value)} placeholder="e.g. renewed_id.pdf" /></div>
            <div><Label>Expires On</Label><Input value={form.expiresOn} onChange={e => set("expiresOn", e.target.value)} placeholder="YYYY-MM-DD or —" /></div>
          </div>
          <div><Label>Upload File</Label><Input type="file" /></div>
        </div>
      </ModalForm>
    </div>
  );
}
