import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface WashPackage {
  id: string; name: string; description: string; duration: number; price: number; vehicleTypes: string; status: string;
}

const mockData: WashPackage[] = [
  { id: "1", name: "Basic Rinse", description: "Exterior water rinse and dry", duration: 15, price: 400, vehicleTypes: "All", status: "active" },
  { id: "2", name: "Full Wash", description: "Exterior wash, tire shine, interior vacuum", duration: 30, price: 800, vehicleTypes: "All", status: "active" },
  { id: "3", name: "Premium Detail", description: "Full wash, polish, wax, interior shampoo", duration: 60, price: 2500, vehicleTypes: "Sedan, SUV", status: "active" },
  { id: "4", name: "Interior Clean", description: "Dashboard wipe, vacuum, air freshener, seat shampoo", duration: 45, price: 1200, vehicleTypes: "All", status: "active" },
];

const blank: Omit<WashPackage, "id"> = { name: "", description: "", duration: 0, price: 0, vehicleTypes: "All", status: "active" };

const columns: Column<WashPackage>[] = [
  { key: "name", label: "Package Name", sortable: true },
  { key: "description", label: "Description" },
  { key: "duration", label: "Duration (min)", sortable: true },
  { key: "price", label: "Price (Ksh)", render: (r) => `Ksh ${r.price.toLocaleString()}`, sortable: true },
  { key: "vehicleTypes", label: "Vehicle Types" },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

export default function WashPackagesTab() {
  const [data, setData] = useState(mockData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Omit<WashPackage, "id"> & { id?: string } } | null>(null);

  const open = (mode: "add" | "edit" | "view", item?: WashPackage) => setModal({ mode, item: item ? { ...item } : { ...blank } });
  const close = () => setModal(null);
  const save = () => { if (!modal) return; if (modal.mode === "add") setData((d) => [...d, { ...modal.item, id: crypto.randomUUID() } as WashPackage]); else if (modal.mode === "edit") setData((d) => d.map((r) => r.id === modal.item.id ? modal.item as WashPackage : r)); close(); };
  const remove = (item: WashPackage) => setData((d) => d.filter((r) => r.id !== item.id));
  const f = modal?.item;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" /> Add Package</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["name"]} searchPlaceholder="Search packages..." onView={(r) => open("view", r)} onEdit={(r) => open("edit", r)} onDelete={remove} />
      {modal && f && (
        <ModalForm open onClose={close} title={modal.mode === "add" ? "Add Package" : modal.mode === "edit" ? "Edit Package" : "Package Details"} isView={modal.mode === "view"} onSubmit={save}>
          <div className="space-y-3">
            <div><Label>Package Name</Label><Input value={f.name} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, name: e.target.value } })} /></div>
            <div><Label>Description</Label><Textarea value={f.description} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, description: e.target.value } })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duration (min)</Label><Input type="number" value={f.duration} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, duration: +e.target.value } })} /></div>
              <div><Label>Price (Ksh)</Label><Input type="number" value={f.price} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, price: +e.target.value } })} /></div>
            </div>
            <div><Label>Vehicle Types</Label><Input value={f.vehicleTypes} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, vehicleTypes: e.target.value } })} /></div>
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
