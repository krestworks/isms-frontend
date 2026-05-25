import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { lpgApi, ApiLpgCylinder } from "@/lib/lpgApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const SIZES = ["6kg", "13kg", "22.5kg", "25kg", "50kg"];
const CONDITIONS = ["full", "empty", "damaged"];

const emptyForm = {
  serialNo: "", size: "13kg", weight: 13, condition: "full", status: "available",
  buyingPrice: 0, markedPrice: 0, sellingPrice: 0, supplier: "", lastRefillDate: "", location: "",
};

export function CylindersTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("lpg.cylinders.manage");

  const [records, setRecords]   = useState<ApiLpgCylinder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiLpgCylinder | null>(null);
  const [viewing, setViewing]   = useState<ApiLpgCylinder | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await lpgApi.cylinders.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load cylinders"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: ApiLpgCylinder) => {
    setEditing(c);
    setForm({
      serialNo: c.serialNo, size: c.size, weight: c.weight, condition: c.condition, status: c.status,
      buyingPrice: c.buyingPrice, markedPrice: c.markedPrice, sellingPrice: c.sellingPrice,
      supplier: c.supplier ?? "", lastRefillDate: c.lastRefillDate?.split("T")[0] ?? "", location: c.location ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.serialNo) return toast.error("Serial number is required");
    setSaving(true);
    try {
      if (editing) {
        await lpgApi.cylinders.update(editing.id, { ...form, lastRefillDate: form.lastRefillDate || undefined }, stationId);
        toast.success("Cylinder updated");
      } else {
        await lpgApi.cylinders.create({ ...form, lastRefillDate: form.lastRefillDate || undefined }, stationId);
        toast.success("Cylinder added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save cylinder"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: ApiLpgCylinder) => {
    try {
      await lpgApi.cylinders.delete(c.id, stationId);
      toast.success("Cylinder removed");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const stats = {
    full:    records.filter(r => r.condition === "full").length,
    empty:   records.filter(r => r.condition === "empty").length,
    damaged: records.filter(r => r.condition === "damaged").length,
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const columns: Column<ApiLpgCylinder>[] = [
    { key: "serialNo",    label: "Serial No.",   sortable: true, render: c => <span className="font-mono text-xs">{c.serialNo}</span> },
    { key: "size",        label: "Size",          sortable: true },
    { key: "condition",   label: "Condition",     render: c => <StatusBadge status={c.condition} /> },
    { key: "buyingPrice", label: "Buy (Ksh)",     render: c => c.buyingPrice.toFixed(2) },
    { key: "sellingPrice",label: "Sell (Ksh)",    sortable: true, render: c => c.sellingPrice.toFixed(2) },
    { key: "supplier",    label: "Supplier",      render: c => c.supplier || "—" },
    { key: "lastRefillDate", label: "Last Refill",sortable: true, render: c => c.lastRefillDate?.split("T")[0] ?? "—" },
    { key: "location",    label: "Location",      render: c => c.location || "—" },
    { key: "status",      label: "Status",        render: c => <StatusBadge status={c.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "size",      label: "Size",      options: SIZES.map(s => ({ label: s, value: s })) },
    { key: "condition", label: "Condition", options: CONDITIONS.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c })) },
    { key: "status",    label: "Status",    options: [{ label: "Available", value: "available" }, { label: "Inactive", value: "inactive" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Full",    value: stats.full,    color: "text-green-600" },
          { label: "Empty",   value: stats.empty,   color: "text-amber-600" },
          { label: "Damaged", value: stats.damaged, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track all cylinders: full, empty, damaged</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Cylinder</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["serialNo", "supplier", "location"]}
        searchPlaceholder="Search cylinders..."
        filters={filters}
        onView={c => setViewing(c)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Cylinder" : "Add Cylinder"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Serial No. *</Label><Input value={form.serialNo} onChange={e => set("serialNo", e.target.value)} disabled={!!editing} /></div>
          <div><Label>Size</Label>
            <Select value={form.size} onValueChange={v => set("size", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Condition</Label>
            <Select value={form.condition} onValueChange={v => set("condition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Buying Price (Ksh)</Label><Input type="number" step="0.01" value={form.buyingPrice || ""} onChange={e => set("buyingPrice", +e.target.value)} /></div>
          <div><Label>Marked Price (Ksh)</Label><Input type="number" step="0.01" value={form.markedPrice || ""} onChange={e => set("markedPrice", +e.target.value)} /></div>
          <div><Label>Selling Price (Ksh)</Label><Input type="number" step="0.01" value={form.sellingPrice || ""} onChange={e => set("sellingPrice", +e.target.value)} /></div>
          <div><Label>Weight (kg)</Label><Input type="number" step="0.1" value={form.weight || ""} onChange={e => set("weight", +e.target.value)} /></div>
          <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => set("supplier", e.target.value)} /></div>
          <div><Label>Last Refill Date</Label><Input type="date" value={form.lastRefillDate} onChange={e => set("lastRefillDate", e.target.value)} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Main Yard" /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Cylinder Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Serial No:</span> <span className="font-mono">{viewing.serialNo}</span></div>
            <div><span className="text-muted-foreground">Size:</span> {viewing.size}</div>
            <div><span className="text-muted-foreground">Condition:</span> <StatusBadge status={viewing.condition} /></div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Buying:</span> Ksh {viewing.buyingPrice.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Selling:</span> Ksh {viewing.sellingPrice.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Supplier:</span> {viewing.supplier || "—"}</div>
            <div><span className="text-muted-foreground">Location:</span> {viewing.location || "—"}</div>
            {viewing.lastRefillDate && <div><span className="text-muted-foreground">Last Refill:</span> {viewing.lastRefillDate.split("T")[0]}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
