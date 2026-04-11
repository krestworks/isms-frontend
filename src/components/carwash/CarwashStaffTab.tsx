import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Staff {
  id: string; name: string; phone: string; role: string; shift: string; rating: number; washesCompleted: number; status: string;
}

const mockData: Staff[] = [
  { id: "1", name: "Peter Mwangi", phone: "0712345678", role: "Washer", shift: "Morning", rating: 4.5, washesCompleted: 328, status: "on_duty" },
  { id: "2", name: "James Kiprop", phone: "0723456789", role: "Washer", shift: "Morning", rating: 4.2, washesCompleted: 256, status: "on_duty" },
  { id: "3", name: "Grace Akinyi", phone: "0734567890", role: "Supervisor", shift: "Full Day", rating: 4.8, washesCompleted: 0, status: "on_duty" },
  { id: "4", name: "Samuel Otieno", phone: "0745678901", role: "Washer", shift: "Afternoon", rating: 3.9, washesCompleted: 189, status: "off_duty" },
];

const blank: Omit<Staff, "id"> = { name: "", phone: "", role: "Washer", shift: "Morning", rating: 0, washesCompleted: 0, status: "on_duty" };

const columns: Column<Staff>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "role", label: "Role" },
  { key: "shift", label: "Shift" },
  { key: "rating", label: "Rating", render: (r) => `${r.rating}/5`, sortable: true },
  { key: "washesCompleted", label: "Washes Done", sortable: true },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "status", label: "Status", options: [{ label: "On Duty", value: "on_duty" }, { label: "Off Duty", value: "off_duty" }, { label: "On Leave", value: "on_leave" }] },
  { key: "shift", label: "Shift", options: [{ label: "Morning", value: "Morning" }, { label: "Afternoon", value: "Afternoon" }, { label: "Full Day", value: "Full Day" }] },
];

export default function CarwashStaffTab() {
  const [data, setData] = useState(mockData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Omit<Staff, "id"> & { id?: string } } | null>(null);

  const open = (mode: "add" | "edit" | "view", item?: Staff) => setModal({ mode, item: item ? { ...item } : { ...blank } });
  const close = () => setModal(null);
  const save = () => { if (!modal) return; if (modal.mode === "add") setData((d) => [...d, { ...modal.item, id: crypto.randomUUID() } as Staff]); else if (modal.mode === "edit") setData((d) => d.map((r) => r.id === modal.item.id ? modal.item as Staff : r)); close(); };
  const remove = (item: Staff) => setData((d) => d.filter((r) => r.id !== item.id));
  const f = modal?.item;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" /> Add Staff</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["name", "phone"]} searchPlaceholder="Search staff..." filters={filters} onView={(r) => open("view", r)} onEdit={(r) => open("edit", r)} onDelete={remove} />
      {modal && f && (
        <ModalForm open onClose={close} title={modal.mode === "add" ? "Add Staff" : modal.mode === "edit" ? "Edit Staff" : "Staff Details"} isView={modal.mode === "view"} onSubmit={save}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={f.name} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, name: e.target.value } })} /></div>
            <div><Label>Phone</Label><Input value={f.phone} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, phone: e.target.value } })} /></div>
            <div><Label>Role</Label>
              <Select value={f.role} onValueChange={(v) => setModal({ ...modal, item: { ...f, role: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Washer">Washer</SelectItem><SelectItem value="Supervisor">Supervisor</SelectItem><SelectItem value="Cashier">Cashier</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Shift</Label>
              <Select value={f.shift} onValueChange={(v) => setModal({ ...modal, item: { ...f, shift: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Afternoon">Afternoon</SelectItem><SelectItem value="Full Day">Full Day</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Rating</Label><Input type="number" step="0.1" min="0" max="5" value={f.rating} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, rating: +e.target.value } })} /></div>
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setModal({ ...modal, item: { ...f, status: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="on_duty">On Duty</SelectItem><SelectItem value="off_duty">Off Duty</SelectItem><SelectItem value="on_leave">On Leave</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
