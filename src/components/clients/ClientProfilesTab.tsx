import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { clientsApi, ApiClient } from "@/lib/clientsApi";
import { useActiveStation } from "@/lib/useActiveStation";

const allModules = ["Fuel", "LPG", "Water", "Car Wash", "Automotive"];

const blank: Omit<ApiClient, "id" | "stationId" | "totalSpent" | "visits" | "createdAt" | "updatedAt"> = {
  name: "", phone: "", email: "", type: "Individual", modules: [], notes: "", status: "active",
};

const columns: Column<ApiClient>[] = [
  { key: "name",       label: "Client Name", sortable: true },
  { key: "phone",      label: "Phone",       render: c => c.phone || "—" },
  { key: "email",      label: "Email",       render: c => c.email || "—" },
  { key: "type",       label: "Type" },
  { key: "modules",    label: "Modules",     render: c => <div className="flex gap-1 flex-wrap">{c.modules.map(m => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}</div> },
  { key: "totalSpent", label: "Total Spent", render: c => `Ksh ${c.totalSpent.toLocaleString()}`, sortable: true },
  { key: "visits",     label: "Visits",      sortable: true },
  { key: "status",     label: "Status",      render: c => <StatusBadge status={c.status} /> },
];

const filters: FilterOption[] = [
  { key: "type",   label: "Type",   options: [{ label: "Individual", value: "Individual" }, { label: "Corporate", value: "Corporate" }] },
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

type FormState = typeof blank;

export default function ClientProfilesTab() {
  const { stationId } = useActiveStation();
  const [data,    setData]    = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ mode: "add" | "edit" | "view"; id?: string } | null>(null);
  const [form,    setForm]    = useState<FormState>({ ...blank });
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientsApi.clients.list(stationId);
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load clients"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm({ ...blank }); setModal({ mode: "add" }); };
  const openView = (c: ApiClient) => { setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", type: c.type, modules: c.modules, notes: c.notes ?? "", status: c.status }); setModal({ mode: "view", id: c.id }); };
  const openEdit = (c: ApiClient) => { setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", type: c.type, modules: c.modules, notes: c.notes ?? "", status: c.status }); setModal({ mode: "edit", id: c.id }); };

  const handleSave = async () => {
    if (!form.name) return toast.error("Client name is required");
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await clientsApi.clients.create(form, stationId);
        toast.success("Client added");
      } else if (modal?.mode === "edit" && modal.id) {
        await clientsApi.clients.update(modal.id, form);
        toast.success("Client updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: ApiClient) => {
    try { await clientsApi.clients.delete(c.id); toast.success("Client deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const toggleModule = (mod: string) => {
    set("modules", form.modules.includes(mod)
      ? form.modules.filter(m => m !== mod)
      : [...form.modules, mod]);
  };

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} clients registered</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Client</Button>
        </div>
      </div>

      <DataTable
        data={data} columns={columns}
        searchKeys={["name", "phone", "email"]} searchPlaceholder="Search clients..."
        filters={filters}
        onView={openView} onEdit={openEdit} onDelete={handleDelete}
      />

      {modal && (
        <ModalForm
          open onClose={() => setModal(null)}
          title={modal.mode === "add" ? "Add Client" : modal.mode === "edit" ? "Edit Client" : "Client Profile"}
          isView={isView}
          onSubmit={handleSave}
          submitLabel={saving ? "Saving..." : modal.mode === "edit" ? "Update" : "Add"}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={form.name} readOnly={isView} onChange={e => set("name", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} readOnly={isView} onChange={e => set("phone", e.target.value)} /></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} readOnly={isView} onChange={e => set("email", e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Linked Modules</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {allModules.map(mod => (
                  <Badge
                    key={mod}
                    variant={form.modules.includes(mod) ? "default" : "outline"}
                    className={`cursor-pointer ${isView ? "pointer-events-none" : ""}`}
                    onClick={() => !isView && toggleModule(mod)}>
                    {mod}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
