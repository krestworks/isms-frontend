import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Coupon {
  id: string; code: string; module: string; discountType: string; discountValue: number; minSpend: number; maxUses: number; usedCount: number; validFrom: string; validTo: string; status: string;
}

const mockData: Coupon[] = [
  { id: "1", code: "FUEL10", module: "Fuel", discountType: "Percentage", discountValue: 10, minSpend: 2000, maxUses: 100, usedCount: 34, validFrom: "2025-06-01", validTo: "2025-06-30", status: "active" },
  { id: "2", code: "WASH500", module: "Car Wash", discountType: "Fixed", discountValue: 500, minSpend: 1000, maxUses: 50, usedCount: 12, validFrom: "2025-06-01", validTo: "2025-07-31", status: "active" },
  { id: "3", code: "LPG15", module: "LPG", discountType: "Percentage", discountValue: 15, minSpend: 5000, maxUses: 30, usedCount: 30, validFrom: "2025-05-01", validTo: "2025-05-31", status: "inactive" },
  { id: "4", code: "WATER20", module: "Water", discountType: "Percentage", discountValue: 20, minSpend: 1000, maxUses: 200, usedCount: 67, validFrom: "2025-06-01", validTo: "2025-12-31", status: "active" },
];

const blank: Omit<Coupon, "id"> = { code: "", module: "Fuel", discountType: "Percentage", discountValue: 0, minSpend: 0, maxUses: 0, usedCount: 0, validFrom: "", validTo: "", status: "active" };

const columns: Column<Coupon>[] = [
  { key: "code", label: "Coupon Code", sortable: true },
  { key: "module", label: "Module", render: (r) => <Badge variant="secondary">{r.module}</Badge> },
  { key: "discountType", label: "Type" },
  { key: "discountValue", label: "Value", render: (r) => r.discountType === "Percentage" ? `${r.discountValue}%` : `Ksh ${r.discountValue}` },
  { key: "usedCount", label: "Used", render: (r) => `${r.usedCount}/${r.maxUses}` },
  { key: "validFrom", label: "Valid From" },
  { key: "validTo", label: "Valid To" },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "module", label: "Module", options: [{ label: "Fuel", value: "Fuel" }, { label: "LPG", value: "LPG" }, { label: "Water", value: "Water" }, { label: "Car Wash", value: "Car Wash" }, { label: "Automotive", value: "Automotive" }] },
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

export default function CouponsTab() {
  const [data, setData] = useState(mockData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Omit<Coupon, "id"> & { id?: string } } | null>(null);

  const open = (mode: "add" | "edit" | "view", item?: Coupon) => setModal({ mode, item: item ? { ...item } : { ...blank } });
  const close = () => setModal(null);
  const save = () => { if (!modal) return; if (modal.mode === "add") setData((d) => [...d, { ...modal.item, id: crypto.randomUUID() } as Coupon]); else if (modal.mode === "edit") setData((d) => d.map((r) => r.id === modal.item.id ? modal.item as Coupon : r)); close(); };
  const remove = (item: Coupon) => setData((d) => d.filter((r) => r.id !== item.id));
  const f = modal?.item;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" /> Create Coupon</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["code"]} searchPlaceholder="Search coupons..." filters={filters} onView={(r) => open("view", r)} onEdit={(r) => open("edit", r)} onDelete={remove} />
      {modal && f && (
        <ModalForm open onClose={close} title={modal.mode === "add" ? "Create Coupon" : modal.mode === "edit" ? "Edit Coupon" : "Coupon Details"} isView={modal.mode === "view"} onSubmit={save}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Coupon Code</Label><Input value={f.code} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, code: e.target.value.toUpperCase() } })} /></div>
            <div><Label>Module</Label>
              <Select value={f.module} onValueChange={(v) => setModal({ ...modal, item: { ...f, module: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Fuel", "LPG", "Water", "Car Wash", "Automotive"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Discount Type</Label>
              <Select value={f.discountType} onValueChange={(v) => setModal({ ...modal, item: { ...f, discountType: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Percentage">Percentage</SelectItem><SelectItem value="Fixed">Fixed Amount</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Discount Value</Label><Input type="number" value={f.discountValue} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, discountValue: +e.target.value } })} /></div>
            <div><Label>Min Spend (Ksh)</Label><Input type="number" value={f.minSpend} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, minSpend: +e.target.value } })} /></div>
            <div><Label>Max Uses</Label><Input type="number" value={f.maxUses} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, maxUses: +e.target.value } })} /></div>
            <div><Label>Valid From</Label><Input type="date" value={f.validFrom} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, validFrom: e.target.value } })} /></div>
            <div><Label>Valid To</Label><Input type="date" value={f.validTo} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, validTo: e.target.value } })} /></div>
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setModal({ ...modal, item: { ...f, status: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
