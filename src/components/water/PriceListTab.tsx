import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { toast } from "sonner";
import { waterApi, ApiWaterPricePackage } from "@/lib/waterApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const emptyForm = { name: "", litres: 0, price: 0, status: "active" };

export function PriceListTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("water.pricing.manage");

  const [records, setRecords]   = useState<ApiWaterPricePackage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiWaterPricePackage | null>(null);
  const [viewing, setViewing]   = useState<ApiWaterPricePackage | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await waterApi.pricePackages.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load price list"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const pricePerLitre = form.litres > 0 ? form.price / form.litres : 0;

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: ApiWaterPricePackage) => {
    setEditing(p);
    setForm({ name: p.name, litres: p.litres, price: p.price, status: p.status });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Package name is required");
    if (!form.litres) return toast.error("Litres is required");
    setSaving(true);
    try {
      if (editing) {
        await waterApi.pricePackages.update(editing.id, form, stationId);
        toast.success("Price package updated");
      } else {
        await waterApi.pricePackages.create(form, stationId);
        toast.success("Price package added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save price package"); }
    finally { setSaving(false); }
  };

  const [pendingDelete, setPendingDelete] = useState<ApiWaterPricePackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await waterApi.pricePackages.delete(pendingDelete.id, stationId);
      toast.success("Price package deleted");
      setPendingDelete(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  const columns: Column<ApiWaterPricePackage>[] = [
    { key: "name",   label: "Package",        sortable: true },
    { key: "litres", label: "Litres",         render: p => p.litres.toLocaleString(), sortable: true },
    { key: "price",  label: "Price (Ksh)",    render: p => <span className="font-bold">Ksh {p.price.toLocaleString()}</span>, sortable: true },
    { key: "rate",   label: "Rate/Litre",     render: p => <span className="font-mono text-xs text-muted-foreground">Ksh {(p.price / p.litres).toFixed(2)}/L</span> },
    { key: "status", label: "Status",         render: p => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Package &amp; bulk pricing — sales and orders pull their price from here</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Package</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["name"]}
        searchPlaceholder="Search packages..."
        onView={p => setViewing(p)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? (p => setPendingDelete(p)) : undefined}
      />

      <DangerConfirmModal
        open={!!pendingDelete}
        title={`Delete package "${pendingDelete?.name}"?`}
        description="Existing sales/orders that already used this price are unaffected — only the package definition is removed."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Package" : "Add Package"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="space-y-3">
          <div><Label>Package Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. 20L Bottle, Bulk (per litre)" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Litres *</Label><Input type="number" value={form.litres || ""} onChange={e => set("litres", +e.target.value)} placeholder="20" /></div>
            <div><Label>Price (Ksh) *</Label><Input type="number" value={form.price || ""} onChange={e => set("price", +e.target.value)} placeholder="200" /></div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            Effective rate: <span className="font-mono font-medium text-foreground">Ksh {pricePerLitre.toFixed(2)}/L</span>
            {" "}— for a plain bulk/per-litre rate, set Litres to 1.
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Package Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Litres:</span> {viewing.litres.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Price:</span> <strong>Ksh {viewing.price.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Rate:</span> Ksh {(viewing.price / viewing.litres).toFixed(2)}/L</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}

export default PriceListTab;
