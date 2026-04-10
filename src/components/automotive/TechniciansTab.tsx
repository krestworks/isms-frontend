import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Technician {
  id: string;
  name: string;
  phone: string;
  specialization: string;
  experience: string;
  certifications: string;
  dailyRate: number;
  jobsCompleted: number;
  rating: number;
  status: string;
}

const sample: Technician[] = [
  { id: "TN001", name: "Peter Ochieng", phone: "0712111222", specialization: "Engine & Transmission", experience: "8 years", certifications: "ASE Certified", dailyRate: 3500, jobsCompleted: 245, rating: 4.8, status: "active" },
  { id: "TN002", name: "David Kamau", phone: "0723222333", specialization: "Brakes & Suspension", experience: "5 years", certifications: "Toyota Certified", dailyRate: 3000, jobsCompleted: 180, rating: 4.6, status: "active" },
  { id: "TN003", name: "Samuel Wekesa", phone: "0734333444", specialization: "Electrical & Diagnostics", experience: "6 years", certifications: "Bosch Certified", dailyRate: 3200, jobsCompleted: 160, rating: 4.5, status: "on-leave" },
  { id: "TN004", name: "Michael Njoroge", phone: "0745444555", specialization: "Body & Paint", experience: "10 years", certifications: "", dailyRate: 2800, jobsCompleted: 320, rating: 4.7, status: "active" },
];

const blank: Omit<Technician, "id"> = { name: "", phone: "", specialization: "", experience: "", certifications: "", dailyRate: 0, jobsCompleted: 0, rating: 0, status: "active" };

export function TechniciansTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Technician } | null>(null);
  const [form, setForm] = useState<Omit<Technician, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: Technician) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const save = () => {
    if (modal?.mode === "add") setData([{ ...form, id: `TN${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...form, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: Technician) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "name" as const, label: "Name" },
    { key: "phone" as const, label: "Phone" },
    { key: "specialization" as const, label: "Specialization" },
    { key: "experience" as const, label: "Experience" },
    { key: "dailyRate" as const, label: "Daily Rate", render: (i: Technician) => `Ksh ${i.dailyRate.toLocaleString()}` },
    { key: "jobsCompleted" as const, label: "Jobs" },
    { key: "rating" as const, label: "Rating", render: (i: Technician) => `⭐ ${i.rating}` },
    { key: "status" as const, label: "Status", render: (i: Technician) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Technicians</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />Add Technician</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "phone", "specialization"]}
        filters={[
          { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "On Leave", value: "on-leave" }, { label: "Inactive", value: "inactive" }] },
          { key: "specialization", label: "Specialization", options: [{ label: "Engine & Transmission", value: "Engine & Transmission" }, { label: "Brakes & Suspension", value: "Brakes & Suspension" }, { label: "Electrical & Diagnostics", value: "Electrical & Diagnostics" }, { label: "Body & Paint", value: "Body & Paint" }] },
        ]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Add Technician" : modal.mode === "edit" ? "Edit Technician" : "Technician Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Specialization</Label>
              <Select value={form.specialization} onValueChange={v => setForm({ ...form, specialization: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Engine & Transmission">Engine & Transmission</SelectItem>
                  <SelectItem value="Brakes & Suspension">Brakes & Suspension</SelectItem>
                  <SelectItem value="Electrical & Diagnostics">Electrical & Diagnostics</SelectItem>
                  <SelectItem value="Body & Paint">Body & Paint</SelectItem>
                  <SelectItem value="Tyres & Alignment">Tyres & Alignment</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Experience</Label><Input value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Certifications</Label><Input value={form.certifications} onChange={e => setForm({ ...form, certifications: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Daily Rate (Ksh)</Label><Input type="number" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Jobs Completed</Label><Input type="number" value={form.jobsCompleted} onChange={e => setForm({ ...form, jobsCompleted: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Rating</Label><Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => setForm({ ...form, rating: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
