import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ServiceRecord {
  id: string;
  date: string;
  vehicleReg: string;
  vehicleMake: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  description: string;
  technician: string;
  estimatedCost: number;
  actualCost: number;
  status: string;
  startTime: string;
  endTime: string;
}

const sample: ServiceRecord[] = [
  { id: "SR001", date: "2025-06-11", vehicleReg: "KBZ 123A", vehicleMake: "Toyota Hilux", customerName: "James Mwangi", customerPhone: "0712345678", serviceType: "Full Service", description: "Oil change, filter replacement, brake check", technician: "Peter Ochieng", estimatedCost: 8500, actualCost: 8500, status: "completed", startTime: "08:00", endTime: "10:30" },
  { id: "SR002", date: "2025-06-11", vehicleReg: "KCA 456B", vehicleMake: "Nissan X-Trail", customerName: "Sarah Wanjiku", customerPhone: "0723456789", serviceType: "Brake Repair", description: "Front brake pad replacement", technician: "David Kamau", estimatedCost: 12000, actualCost: 11500, status: "in-progress", startTime: "09:30", endTime: "" },
  { id: "SR003", date: "2025-06-12", vehicleReg: "KDD 789C", vehicleMake: "Isuzu DMax", customerName: "John Otieno", customerPhone: "0734567890", serviceType: "Tyre Change", description: "4 new tyres + alignment", technician: "", estimatedCost: 32000, actualCost: 0, status: "pending", startTime: "", endTime: "" },
  { id: "SR004", date: "2025-06-12", vehicleReg: "KBB 321D", vehicleMake: "Mercedes C200", customerName: "Lucy Njeri", customerPhone: "0745678901", serviceType: "Diagnostics", description: "Engine light investigation", technician: "Peter Ochieng", estimatedCost: 3000, actualCost: 3000, status: "invoiced", startTime: "11:00", endTime: "12:00" },
];

const blank: Omit<ServiceRecord, "id"> = { date: new Date().toISOString().slice(0, 10), vehicleReg: "", vehicleMake: "", customerName: "", customerPhone: "", serviceType: "", description: "", technician: "", estimatedCost: 0, actualCost: 0, status: "pending", startTime: "", endTime: "" };

export function ServiceRecordsTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: ServiceRecord } | null>(null);
  const [form, setForm] = useState<Omit<ServiceRecord, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: ServiceRecord) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const save = () => {
    if (modal?.mode === "add") setData([{ ...form, id: `SR${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...form, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: ServiceRecord) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "date" as const, label: "Date" },
    { key: "vehicleReg" as const, label: "Vehicle" },
    { key: "vehicleMake" as const, label: "Make/Model" },
    { key: "customerName" as const, label: "Customer" },
    { key: "serviceType" as const, label: "Service" },
    { key: "technician" as const, label: "Technician" },
    { key: "estimatedCost" as const, label: "Est. Cost", render: (i: ServiceRecord) => `Ksh ${i.estimatedCost.toLocaleString()}` },
    { key: "actualCost" as const, label: "Actual Cost", render: (i: ServiceRecord) => i.actualCost ? `Ksh ${i.actualCost.toLocaleString()}` : "—" },
    { key: "status" as const, label: "Status", render: (i: ServiceRecord) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Service Records</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />New Service</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["id", "vehicleReg", "customerName", "technician", "serviceType"]}
        filters={[
          { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "In Progress", value: "in-progress" }, { label: "Completed", value: "completed" }, { label: "Invoiced", value: "invoiced" }] },
          { key: "serviceType", label: "Service", options: [{ label: "Full Service", value: "Full Service" }, { label: "Brake Repair", value: "Brake Repair" }, { label: "Tyre Change", value: "Tyre Change" }, { label: "Diagnostics", value: "Diagnostics" }] },
        ]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "New Service Record" : modal.mode === "edit" ? "Edit Service" : "Service Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Vehicle Reg</Label><Input value={form.vehicleReg} onChange={e => setForm({ ...form, vehicleReg: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Make/Model</Label><Input value={form.vehicleMake} onChange={e => setForm({ ...form, vehicleMake: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Customer Name</Label><Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Customer Phone</Label><Input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Service Type</Label>
              <Select value={form.serviceType} onValueChange={v => setForm({ ...form, serviceType: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Service">Full Service</SelectItem>
                  <SelectItem value="Brake Repair">Brake Repair</SelectItem>
                  <SelectItem value="Tyre Change">Tyre Change</SelectItem>
                  <SelectItem value="Diagnostics">Diagnostics</SelectItem>
                  <SelectItem value="Oil Change">Oil Change</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Body Work">Body Work</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Technician</Label><Input value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Estimated Cost (Ksh)</Label><Input type="number" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Actual Cost (Ksh)</Label><Input type="number" value={form.actualCost} onChange={e => setForm({ ...form, actualCost: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} disabled={modal.mode === "view"} /></div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
