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

interface Client {
  id: string; name: string; phone: string; email: string; type: string; modules: string[]; totalSpent: number; visits: number; status: string;
}

const mockData: Client[] = [
  { id: "1", name: "John Kamau", phone: "0712345678", email: "john@email.com", type: "Individual", modules: ["Fuel", "Car Wash"], totalSpent: 45000, visits: 32, status: "active" },
  { id: "2", name: "Wanjiku Enterprises", phone: "0723456789", email: "info@wanjiku.co.ke", type: "Corporate", modules: ["Fuel", "LPG", "Water"], totalSpent: 320000, visits: 86, status: "active" },
  { id: "3", name: "David Ochieng", phone: "0734567890", email: "david@email.com", type: "Individual", modules: ["Car Wash", "Automotive"], totalSpent: 18500, visits: 12, status: "active" },
  { id: "4", name: "Mama Njeri Stores", phone: "0745678901", email: "njeri@stores.co.ke", type: "Corporate", modules: ["LPG", "Water"], totalSpent: 156000, visits: 64, status: "inactive" },
  { id: "5", name: "Alice Muthoni", phone: "0756789012", email: "alice@email.com", type: "Individual", modules: ["Fuel"], totalSpent: 8200, visits: 5, status: "active" },
];

const blank: Omit<Client, "id"> = { name: "", phone: "", email: "", type: "Individual", modules: [], totalSpent: 0, visits: 0, status: "active" };

const columns: Column<Client>[] = [
  { key: "name", label: "Client Name", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "type", label: "Type" },
  { key: "modules", label: "Modules", render: (r) => <div className="flex gap-1 flex-wrap">{r.modules.map((m) => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}</div> },
  { key: "totalSpent", label: "Total Spent", render: (r) => `Ksh ${r.totalSpent.toLocaleString()}`, sortable: true },
  { key: "visits", label: "Visits", sortable: true },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "type", label: "Type", options: [{ label: "Individual", value: "Individual" }, { label: "Corporate", value: "Corporate" }] },
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

const allModules = ["Fuel", "LPG", "Water", "Car Wash", "Automotive"];

export default function ClientProfilesTab() {
  const [data, setData] = useState(mockData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Omit<Client, "id"> & { id?: string } } | null>(null);

  const open = (mode: "add" | "edit" | "view", item?: Client) => setModal({ mode, item: item ? { ...item } : { ...blank } });
  const close = () => setModal(null);
  const save = () => { if (!modal) return; if (modal.mode === "add") setData((d) => [...d, { ...modal.item, id: crypto.randomUUID() } as Client]); else if (modal.mode === "edit") setData((d) => d.map((r) => r.id === modal.item.id ? modal.item as Client : r)); close(); };
  const remove = (item: Client) => setData((d) => d.filter((r) => r.id !== item.id));
  const f = modal?.item;

  const toggleModule = (mod: string) => {
    if (!f) return;
    const mods = f.modules.includes(mod) ? f.modules.filter((m) => m !== mod) : [...f.modules, mod];
    setModal({ ...modal!, item: { ...f, modules: mods } });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" /> Add Client</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["name", "phone", "email"]} searchPlaceholder="Search clients..." filters={filters} onView={(r) => open("view", r)} onEdit={(r) => open("edit", r)} onDelete={remove} />
      {modal && f && (
        <ModalForm open onClose={close} title={modal.mode === "add" ? "Add Client" : modal.mode === "edit" ? "Edit Client" : "Client Profile"} isView={modal.mode === "view"} onSubmit={save}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={f.name} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, name: e.target.value } })} /></div>
            <div><Label>Phone</Label><Input value={f.phone} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, phone: e.target.value } })} /></div>
            <div className="col-span-2"><Label>Email</Label><Input value={f.email} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, email: e.target.value } })} /></div>
            <div><Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setModal({ ...modal, item: { ...f, type: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Individual">Individual</SelectItem><SelectItem value="Corporate">Corporate</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setModal({ ...modal, item: { ...f, status: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Linked Modules</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {allModules.map((mod) => (
                  <Badge key={mod} variant={f.modules.includes(mod) ? "default" : "outline"} className={`cursor-pointer ${modal.mode === "view" ? "pointer-events-none" : ""}`} onClick={() => toggleModule(mod)}>{mod}</Badge>
                ))}
              </div>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
