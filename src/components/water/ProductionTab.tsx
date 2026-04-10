import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Production {
  id: string;
  date: string;
  shift: string;
  litresProduced: number;
  litresWasted: number;
  netOutput: number;
  operator: string;
  machineId: string;
  status: string;
  notes: string;
}

const sample: Production[] = [
  { id: "WP001", date: "2025-06-10", shift: "Morning", litresProduced: 5200, litresWasted: 80, netOutput: 5120, operator: "James Mwangi", machineId: "RO-01", status: "completed", notes: "" },
  { id: "WP002", date: "2025-06-10", shift: "Afternoon", litresProduced: 4800, litresWasted: 120, netOutput: 4680, operator: "Peter Kamau", machineId: "RO-02", status: "completed", notes: "Filter replaced" },
  { id: "WP003", date: "2025-06-11", shift: "Morning", litresProduced: 3200, litresWasted: 0, netOutput: 3200, operator: "James Mwangi", machineId: "RO-01", status: "active", notes: "In progress" },
];

const blank: Omit<Production, "id"> = { date: new Date().toISOString().slice(0, 10), shift: "Morning", litresProduced: 0, litresWasted: 0, netOutput: 0, operator: "", machineId: "", status: "active", notes: "" };

export function ProductionTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Production } | null>(null);
  const [form, setForm] = useState<Omit<Production, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: Production) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };

  const save = () => {
    if (modal?.mode === "add") {
      setData([{ ...form, id: `WP${String(data.length + 1).padStart(3, "0")}`, netOutput: form.litresProduced - form.litresWasted }, ...data]);
    } else if (modal?.mode === "edit") {
      setData(data.map(d => d.id === modal.item.id ? { ...form, id: modal.item.id, netOutput: form.litresProduced - form.litresWasted } : d));
    }
    setModal(null);
  };

  const remove = (item: Production) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "date" as const, label: "Date" },
    { key: "shift" as const, label: "Shift" },
    { key: "litresProduced" as const, label: "Produced (L)", render: (v: number) => v.toLocaleString() },
    { key: "litresWasted" as const, label: "Wasted (L)", render: (v: number) => v.toLocaleString() },
    { key: "netOutput" as const, label: "Net Output (L)", render: (v: number) => v.toLocaleString() },
    { key: "operator" as const, label: "Operator" },
    { key: "machineId" as const, label: "Machine" },
    { key: "status" as const, label: "Status", render: (v: string) => <StatusBadge status={v} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Production Logs</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />Record Production</Button>
      </div>
      <DataTable
        data={data} columns={columns}
        searchKeys={["id", "operator", "machineId"]}
        filterOptions={[{ key: "status", label: "Status", values: ["active", "completed"] }, { key: "shift", label: "Shift", values: ["Morning", "Afternoon", "Night"] }]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove}
      />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Record Production" : modal.mode === "edit" ? "Edit Production" : "Production Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Shift</Label>
              <Select value={form.shift} onValueChange={v => setForm({ ...form, shift: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Afternoon">Afternoon</SelectItem><SelectItem value="Night">Night</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Litres Produced</Label><Input type="number" value={form.litresProduced} onChange={e => setForm({ ...form, litresProduced: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Litres Wasted</Label><Input type="number" value={form.litresWasted} onChange={e => setForm({ ...form, litresWasted: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Operator</Label><Input value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Machine ID</Label><Input value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} disabled={modal.mode === "view"} /></div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
