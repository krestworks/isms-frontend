import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ServicePrice {
  id: string;
  serviceName: string;
  category: string;
  labourCost: number;
  partsEstimate: number;
  totalPrice: number;
  duration: string;
  warranty: string;
  status: string;
}

const sample: ServicePrice[] = [
  { id: "SP001", serviceName: "Full Service", category: "Routine", labourCost: 3500, partsEstimate: 5000, totalPrice: 8500, duration: "2-3 hrs", warranty: "3 months", status: "active" },
  { id: "SP002", serviceName: "Brake Pad Replacement (Front)", category: "Brakes", labourCost: 2000, partsEstimate: 6000, totalPrice: 8000, duration: "1-2 hrs", warranty: "6 months", status: "active" },
  { id: "SP003", serviceName: "Engine Diagnostics", category: "Diagnostics", labourCost: 3000, partsEstimate: 0, totalPrice: 3000, duration: "1 hr", warranty: "N/A", status: "active" },
  { id: "SP004", serviceName: "Wheel Alignment", category: "Tyres", labourCost: 1500, partsEstimate: 0, totalPrice: 1500, duration: "30 min", warranty: "1 month", status: "active" },
  { id: "SP005", serviceName: "AC Regas", category: "Electrical", labourCost: 2000, partsEstimate: 3000, totalPrice: 5000, duration: "1 hr", warranty: "3 months", status: "inactive" },
];

const blank: Omit<ServicePrice, "id"> = { serviceName: "", category: "", labourCost: 0, partsEstimate: 0, totalPrice: 0, duration: "", warranty: "", status: "active" };

export function ServicePricingTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: ServicePrice } | null>(null);
  const [form, setForm] = useState<Omit<ServicePrice, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: ServicePrice) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const save = () => {
    const computed = { ...form, totalPrice: form.labourCost + form.partsEstimate };
    if (modal?.mode === "add") setData([{ ...computed, id: `SP${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...computed, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: ServicePrice) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "serviceName" as const, label: "Service" },
    { key: "category" as const, label: "Category" },
    { key: "labourCost" as const, label: "Labour", render: (i: ServicePrice) => `Ksh ${i.labourCost.toLocaleString()}` },
    { key: "partsEstimate" as const, label: "Parts Est.", render: (i: ServicePrice) => `Ksh ${i.partsEstimate.toLocaleString()}` },
    { key: "totalPrice" as const, label: "Total", render: (i: ServicePrice) => `Ksh ${i.totalPrice.toLocaleString()}` },
    { key: "duration" as const, label: "Duration" },
    { key: "warranty" as const, label: "Warranty" },
    { key: "status" as const, label: "Status", render: (i: ServicePrice) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Service Pricing</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />Add Price</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["serviceName", "category"]}
        filters={[
          { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
          { key: "category", label: "Category", options: [{ label: "Routine", value: "Routine" }, { label: "Brakes", value: "Brakes" }, { label: "Diagnostics", value: "Diagnostics" }, { label: "Tyres", value: "Tyres" }, { label: "Electrical", value: "Electrical" }] },
        ]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Add Service Price" : modal.mode === "edit" ? "Edit Price" : "Price Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Service Name</Label><Input value={form.serviceName} onChange={e => setForm({ ...form, serviceName: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Routine">Routine</SelectItem>
                  <SelectItem value="Brakes">Brakes</SelectItem>
                  <SelectItem value="Diagnostics">Diagnostics</SelectItem>
                  <SelectItem value="Tyres">Tyres</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Body Work">Body Work</SelectItem>
                  <SelectItem value="Engine">Engine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Duration</Label><Input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Labour Cost (Ksh)</Label><Input type="number" value={form.labourCost} onChange={e => setForm({ ...form, labourCost: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Parts Estimate (Ksh)</Label><Input type="number" value={form.partsEstimate} onChange={e => setForm({ ...form, partsEstimate: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Warranty</Label><Input value={form.warranty} onChange={e => setForm({ ...form, warranty: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
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
    </>
  );
}
