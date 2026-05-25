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
import { clientsApi, ApiCoupon } from "@/lib/clientsApi";
import { useActiveStation } from "@/lib/useActiveStation";

const MODULES = ["Fuel", "LPG", "Water", "Car Wash", "Automotive"];

const blank: Omit<ApiCoupon, "id" | "stationId" | "usedCount" | "createdAt" | "updatedAt"> = {
  code: "", module: "Fuel", discountType: "Percentage", discountValue: 0, minSpend: 0, maxUses: 0, validFrom: "", validTo: "", status: "active",
};

const columns: Column<ApiCoupon>[] = [
  { key: "code",          label: "Coupon Code", sortable: true },
  { key: "module",        label: "Module",       render: c => <Badge variant="secondary">{c.module}</Badge> },
  { key: "discountType",  label: "Type" },
  { key: "discountValue", label: "Value",        render: c => c.discountType === "Percentage" ? `${c.discountValue}%` : `Ksh ${c.discountValue}` },
  { key: "usedCount",     label: "Used",         render: c => `${c.usedCount}/${c.maxUses || "∞"}` },
  { key: "validFrom",     label: "Valid From" },
  { key: "validTo",       label: "Valid To" },
  { key: "status",        label: "Status",       render: c => <StatusBadge status={c.status} /> },
];

const filters: FilterOption[] = [
  { key: "module", label: "Module", options: MODULES.map(m => ({ label: m, value: m })) },
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

type FormState = typeof blank;

export default function CouponsTab() {
  const { stationId } = useActiveStation();
  const [data,    setData]    = useState<ApiCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ mode: "add" | "edit" | "view"; id?: string } | null>(null);
  const [form,    setForm]    = useState<FormState>({ ...blank });
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientsApi.coupons.list(stationId);
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load coupons"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm({ ...blank }); setModal({ mode: "add" }); };
  const openView = (c: ApiCoupon) => { setForm({ code: c.code, module: c.module, discountType: c.discountType, discountValue: c.discountValue, minSpend: c.minSpend, maxUses: c.maxUses, validFrom: c.validFrom, validTo: c.validTo, status: c.status }); setModal({ mode: "view", id: c.id }); };
  const openEdit = (c: ApiCoupon) => { setForm({ code: c.code, module: c.module, discountType: c.discountType, discountValue: c.discountValue, minSpend: c.minSpend, maxUses: c.maxUses, validFrom: c.validFrom, validTo: c.validTo, status: c.status }); setModal({ mode: "edit", id: c.id }); };

  const handleSave = async () => {
    if (!form.code || !form.validFrom || !form.validTo) return toast.error("Code, valid from and valid to are required");
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await clientsApi.coupons.create(form, stationId);
        toast.success("Coupon created");
      } else if (modal?.mode === "edit" && modal.id) {
        await clientsApi.coupons.update(modal.id, form);
        toast.success("Coupon updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c: ApiCoupon) => {
    try { await clientsApi.coupons.delete(c.id); toast.success("Coupon deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} coupons</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Create Coupon</Button>
        </div>
      </div>

      <DataTable
        data={data} columns={columns}
        searchKeys={["code"]} searchPlaceholder="Search coupons..."
        filters={filters}
        onView={openView} onEdit={openEdit} onDelete={handleDelete}
      />

      {modal && (
        <ModalForm
          open onClose={() => setModal(null)}
          title={modal.mode === "add" ? "Create Coupon" : modal.mode === "edit" ? "Edit Coupon" : "Coupon Details"}
          isView={isView}
          onSubmit={handleSave}
          submitLabel={saving ? "Saving..." : modal.mode === "edit" ? "Update" : "Create"}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Coupon Code *</Label>
              <Input value={form.code} readOnly={isView} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="e.g. FUEL10" />
            </div>
            <div><Label>Module</Label>
              <Select value={form.module} onValueChange={v => set("module", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Discount Type</Label>
              <Select value={form.discountType} onValueChange={v => set("discountType", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Percentage">Percentage</SelectItem>
                  <SelectItem value="Fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Discount Value</Label><Input type="number" value={form.discountValue || ""} readOnly={isView} onChange={e => set("discountValue", +e.target.value)} /></div>
            <div><Label>Min Spend (Ksh)</Label><Input type="number" value={form.minSpend || ""} readOnly={isView} onChange={e => set("minSpend", +e.target.value)} /></div>
            <div><Label>Max Uses (0 = unlimited)</Label><Input type="number" value={form.maxUses || ""} readOnly={isView} onChange={e => set("maxUses", +e.target.value)} /></div>
            <div><Label>Valid From *</Label><Input type="date" value={form.validFrom} readOnly={isView} onChange={e => set("validFrom", e.target.value)} /></div>
            <div><Label>Valid To *</Label><Input type="date" value={form.validTo} readOnly={isView} onChange={e => set("validTo", e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
