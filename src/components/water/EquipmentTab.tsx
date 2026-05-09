import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { usePermission, guardAction } from "@/lib/actionPermissions";

interface Equipment {
  id: string;
  name: string;
  type: string;
  serialNo: string;
  status: string;
  lastMaintenance: string;
  nextMaintenance: string;
  location: string;
}

const sample: Equipment[] = [
  { id: "EQ001", name: "RO System Unit 1", type: "Reverse Osmosis", serialNo: "RO-2024-001", status: "operational", lastMaintenance: "2025-05-15", nextMaintenance: "2025-08-15", location: "Plant Room A" },
  { id: "EQ002", name: "UV Sterilizer", type: "UV Treatment", serialNo: "UV-2024-003", status: "operational", lastMaintenance: "2025-06-01", nextMaintenance: "2025-09-01", location: "Plant Room A" },
  { id: "EQ003", name: "Storage Tank 1", type: "Storage", serialNo: "ST-2023-010", status: "maintenance", lastMaintenance: "2025-06-08", nextMaintenance: "2025-06-15", location: "Yard" },
  { id: "EQ004", name: "Booster Pump 2", type: "Pump", serialNo: "BP-2024-005", status: "inactive", lastMaintenance: "2025-04-20", nextMaintenance: "2025-07-20", location: "Plant Room B" },
];

const blank: Omit<Equipment, "id"> = { name: "", type: "", serialNo: "", status: "operational", lastMaintenance: "", nextMaintenance: "", location: "" };

export function EquipmentTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Equipment } | null>(null);
  const [form, setForm] = useState<Omit<Equipment, "id">>(blank);
  const canCreate = usePermission("water.equipment.create");
  const canUpdate = usePermission("water.equipment.create");
  const canDelete = usePermission("water.equipment.create");

  const open = (mode: "add" | "edit" | "view", item?: Equipment) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const save = () => {
    if (modal?.mode === "add") { if (!guardAction("water.equipment.create", "add equipment")) return; setData([{ ...form, id: `EQ${String(data.length + 1).padStart(3, "0")}` }, ...data]); }
    else if (modal?.mode === "edit") { if (!guardAction("water.equipment.create", "edit equipment")) return; setData(data.map(d => d.id === modal.item.id ? { ...form, id: modal.item.id } : d)); }
    setModal(null);
  };
  const remove = (item: Equipment) => { if (!guardAction("water.equipment.create", "delete equipment")) return; setData(data.filter(d => d.id !== item.id)); };

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "name" as const, label: "Name" },
    { key: "type" as const, label: "Type" },
    { key: "serialNo" as const, label: "Serial No." },
    { key: "status" as const, label: "Status", render: (i: Equipment) => <StatusBadge status={i.status} /> },
    { key: "lastMaintenance" as const, label: "Last Maintenance" },
    { key: "nextMaintenance" as const, label: "Next Maintenance" },
    { key: "location" as const, label: "Location" },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Equipment</h3>
        {canCreate && <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />Add Equipment</Button>}
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "serialNo", "type"]}
        filters={[{ key: "status", label: "Status", options: [{ label: "Operational", value: "operational" }, { label: "Maintenance", value: "maintenance" }, { label: "Inactive", value: "inactive" }] }, { key: "type", label: "Type", options: [{ label: "Reverse Osmosis", value: "Reverse Osmosis" }, { label: "Uv Treatment", value: "UV Treatment" }, { label: "Storage", value: "Storage" }, { label: "Pump", value: "Pump" }] }]}
        onView={i => open("view", i)} onEdit={canUpdate ? (i => open("edit", i)) : undefined} onDelete={canDelete ? remove : undefined} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Add Equipment" : modal.mode === "edit" ? "Edit Equipment" : "Equipment Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Reverse Osmosis">Reverse Osmosis</SelectItem><SelectItem value="UV Treatment">UV Treatment</SelectItem><SelectItem value="Storage">Storage</SelectItem><SelectItem value="Pump">Pump</SelectItem><SelectItem value="Filter">Filter</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Serial No.</Label><Input value={form.serialNo} onChange={e => setForm({ ...form, serialNo: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="operational">Operational</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Last Maintenance</Label><Input type="date" value={form.lastMaintenance} onChange={e => setForm({ ...form, lastMaintenance: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Next Maintenance</Label><Input type="date" value={form.nextMaintenance} onChange={e => setForm({ ...form, nextMaintenance: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="col-span-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} disabled={modal.mode === "view"} /></div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
