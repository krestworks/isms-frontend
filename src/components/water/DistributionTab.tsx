import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Distribution {
  id: string;
  date: string;
  vehicle: string;
  driver: string;
  destination: string;
  litresLoaded: number;
  litresDelivered: number;
  variance: number;
  client: string;
  status: string;
  departureTime: string;
  arrivalTime: string;
}

const sample: Distribution[] = [
  { id: "DL001", date: "2025-06-11", vehicle: "KBZ 123A", driver: "John Otieno", destination: "Oasis Hotel", litresLoaded: 2000, litresDelivered: 2000, variance: 0, client: "Oasis Hotel", status: "completed", departureTime: "08:00", arrivalTime: "09:30" },
  { id: "DL002", date: "2025-06-11", vehicle: "KCA 456B", driver: "David Njoroge", destination: "Kiambu Rd", litresLoaded: 10000, litresDelivered: 9950, variance: -50, client: "Green Estates", status: "completed", departureTime: "10:00", arrivalTime: "12:15" },
  { id: "DL003", date: "2025-06-12", vehicle: "KBZ 123A", driver: "John Otieno", destination: "CBD", litresLoaded: 3000, litresDelivered: 0, variance: 0, client: "City Mall", status: "active", departureTime: "07:30", arrivalTime: "" },
];

const blank: Omit<Distribution, "id"> = { date: new Date().toISOString().slice(0, 10), vehicle: "", driver: "", destination: "", litresLoaded: 0, litresDelivered: 0, variance: 0, client: "", status: "active", departureTime: "", arrivalTime: "" };

export function DistributionTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Distribution } | null>(null);
  const [form, setForm] = useState<Omit<Distribution, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: Distribution) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const save = () => {
    const computed = { ...form, variance: form.litresDelivered - form.litresLoaded };
    if (modal?.mode === "add") setData([{ ...computed, id: `DL${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...computed, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: Distribution) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "date" as const, label: "Date" },
    { key: "vehicle" as const, label: "Vehicle" },
    { key: "driver" as const, label: "Driver" },
    { key: "client" as const, label: "Client" },
    { key: "destination" as const, label: "Destination" },
    { key: "litresLoaded" as const, label: "Loaded (L)", render: (v: number) => v.toLocaleString() },
    { key: "litresDelivered" as const, label: "Delivered (L)", render: (v: number) => v.toLocaleString() },
    { key: "variance" as const, label: "Variance", render: (v: number) => <span className={v < 0 ? "text-destructive" : ""}>{v}</span> },
    { key: "status" as const, label: "Status", render: (v: string) => <StatusBadge status={v} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Distribution Logs</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />Log Delivery</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["id", "vehicle", "driver", "client", "destination"]}
        filterOptions={[{ key: "status", label: "Status", values: ["active", "completed"] }]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Log Delivery" : modal.mode === "edit" ? "Edit Delivery" : "Delivery Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Vehicle</Label><Input value={form.vehicle} onChange={e => setForm({ ...form, vehicle: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Driver</Label><Input value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Client</Label><Input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="col-span-2"><Label>Destination</Label><Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Litres Loaded</Label><Input type="number" value={form.litresLoaded} onChange={e => setForm({ ...form, litresLoaded: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Litres Delivered</Label><Input type="number" value={form.litresDelivered} onChange={e => setForm({ ...form, litresDelivered: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Departure Time</Label><Input type="time" value={form.departureTime} onChange={e => setForm({ ...form, departureTime: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Arrival Time</Label><Input type="time" value={form.arrivalTime} onChange={e => setForm({ ...form, arrivalTime: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">In Transit</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
