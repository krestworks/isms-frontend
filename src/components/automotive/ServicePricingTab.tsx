import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { autoApi, ApiAutoServicePrice } from "@/lib/autoApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const CATEGORIES = ["Routine", "Brakes", "Diagnostics", "Tyres", "Electrical", "Body Work", "Engine", "Other"];

const emptyForm = {
  serviceName: "", category: "Routine", labourCost: 0, partsEstimate: 0, duration: "", warranty: "", status: "active",
};

export function ServicePricingTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("auto.pricing.manage");

  const [records, setRecords]   = useState<ApiAutoServicePrice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiAutoServicePrice | null>(null);
  const [viewing, setViewing]   = useState<ApiAutoServicePrice | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await autoApi.pricing.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load pricing"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const totalPrice = form.labourCost + form.partsEstimate;

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: ApiAutoServicePrice) => {
    setEditing(p);
    setForm({
      serviceName: p.serviceName, category: p.category, labourCost: p.labourCost,
      partsEstimate: p.partsEstimate, duration: p.duration ?? "", warranty: p.warranty ?? "", status: p.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.serviceName || !form.category) return toast.error("Service name and category are required");
    setSaving(true);
    try {
      const payload = { ...form, duration: form.duration || undefined, warranty: form.warranty || undefined };
      if (editing) {
        await autoApi.pricing.update(editing.id, payload, stationId);
        toast.success("Pricing updated");
      } else {
        await autoApi.pricing.create(payload, stationId);
        toast.success("Pricing added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save pricing"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: ApiAutoServicePrice) => {
    try {
      await autoApi.pricing.delete(p.id, stationId);
      toast.success("Pricing deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const columns: Column<ApiAutoServicePrice>[] = [
    { key: "serviceName",  label: "Service",        sortable: true },
    { key: "category",     label: "Category",       sortable: true },
    { key: "labourCost",   label: "Labour",          render: p => `Ksh ${p.labourCost.toLocaleString()}` },
    { key: "partsEstimate",label: "Parts Est.",      render: p => `Ksh ${p.partsEstimate.toLocaleString()}` },
    { key: "totalPrice",   label: "Total",           render: p => <span className="font-bold">Ksh {p.totalPrice.toLocaleString()}</span>, sortable: true },
    { key: "duration",     label: "Duration",        render: p => p.duration || "—" },
    { key: "warranty",     label: "Warranty",        render: p => p.warranty || "—" },
    { key: "status",       label: "Status",          render: p => <StatusBadge status={p.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status",   label: "Status",   options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
    { key: "category", label: "Category", options: CATEGORIES.map(c => ({ label: c, value: c })) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Standard service prices and labour rates</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Price</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["serviceName", "category"]}
        searchPlaceholder="Search services..."
        filters={filters}
        onView={p => setViewing(p)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Service Price" : "Add Service Price"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Service Name *</Label><Input value={form.serviceName} onChange={e => set("serviceName", e.target.value)} /></div>
          <div><Label>Category *</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Duration</Label><Input value={form.duration} onChange={e => set("duration", e.target.value)} placeholder="e.g. 2-3 hrs" /></div>
          <div><Label>Labour Cost (Ksh)</Label><Input type="number" value={form.labourCost || ""} onChange={e => set("labourCost", +e.target.value)} /></div>
          <div><Label>Parts Estimate (Ksh)</Label><Input type="number" value={form.partsEstimate || ""} onChange={e => set("partsEstimate", +e.target.value)} /></div>
          <div><Label>Total Price (Ksh)</Label><Input value={`Ksh ${totalPrice.toLocaleString()}`} disabled className="font-mono" /></div>
          <div><Label>Warranty</Label><Input value={form.warranty} onChange={e => set("warranty", e.target.value)} placeholder="e.g. 3 months" /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Service Price Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Service:</span> {viewing.serviceName}</div>
            <div><span className="text-muted-foreground">Category:</span> {viewing.category}</div>
            <div><span className="text-muted-foreground">Labour:</span> Ksh {viewing.labourCost.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Parts Est.:</span> Ksh {viewing.partsEstimate.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Total:</span> <strong>Ksh {viewing.totalPrice.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Duration:</span> {viewing.duration || "—"}</div>
            <div><span className="text-muted-foreground">Warranty:</span> {viewing.warranty || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
