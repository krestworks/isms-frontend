import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface WaterOrder {
  id: string;
  date: string;
  client: string;
  litres: number;
  pricePerLitre: number;
  totalAmount: number;
  status: string;
  processedBy: string;
  deliveredBy: string;
  deliveryDate: string;
  deliveryAddress: string;
  notes: string;
}

const sample: WaterOrder[] = [
  { id: "WO001", date: "2025-06-11", client: "Oasis Hotel", litres: 2000, pricePerLitre: 4, totalAmount: 8000, status: "delivered", processedBy: "Mary Wanjiku", deliveredBy: "John Otieno", deliveryDate: "2025-06-11", deliveryAddress: "Mombasa Rd, Nairobi", notes: "" },
  { id: "WO002", date: "2025-06-11", client: "Green Estates", litres: 10000, pricePerLitre: 3.5, totalAmount: 35000, status: "dispatched", processedBy: "Peter Kamau", deliveredBy: "David Njoroge", deliveryDate: "", deliveryAddress: "Kiambu Rd", notes: "Tanker delivery" },
  { id: "WO003", date: "2025-06-12", client: "Sunrise Academy", litres: 5000, pricePerLitre: 3.5, totalAmount: 17500, status: "pending", processedBy: "", deliveredBy: "", deliveryDate: "", deliveryAddress: "Thika Rd", notes: "Weekly order" },
  { id: "WO004", date: "2025-06-12", client: "City Mall", litres: 3000, pricePerLitre: 4, totalAmount: 12000, status: "processing", processedBy: "Mary Wanjiku", deliveredBy: "", deliveryDate: "", deliveryAddress: "CBD", notes: "" },
];

const blank: Omit<WaterOrder, "id"> = { date: new Date().toISOString().slice(0, 10), client: "", litres: 0, pricePerLitre: 0, totalAmount: 0, status: "pending", processedBy: "", deliveredBy: "", deliveryDate: "", deliveryAddress: "", notes: "" };

export function WaterOrdersTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: WaterOrder } | null>(null);
  const [form, setForm] = useState<Omit<WaterOrder, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: WaterOrder) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const save = () => {
    const computed = { ...form, totalAmount: form.litres * form.pricePerLitre };
    if (modal?.mode === "add") setData([{ ...computed, id: `WO${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...computed, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: WaterOrder) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "date" as const, label: "Date" },
    { key: "client" as const, label: "Client" },
    { key: "litres" as const, label: "Litres", render: (i: WaterOrder) => i.litres.toLocaleString() },
    { key: "totalAmount" as const, label: "Total", render: (i: WaterOrder) => `Ksh ${i.totalAmount.toLocaleString()}` },
    { key: "status" as const, label: "Status", render: (i: WaterOrder) => <StatusBadge status={i.status} /> },
    { key: "processedBy" as const, label: "Processed By" },
    { key: "deliveredBy" as const, label: "Delivered By" },
    { key: "deliveryDate" as const, label: "Delivery Date" },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Client Orders</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />New Order</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["id", "client", "processedBy", "deliveredBy"]}
        filters={[{ key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Processing", value: "processing" }, { label: "Dispatched", value: "dispatched" }, { label: "Delivered", value: "delivered" }, { label: "Completed", value: "completed" }] }]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "New Order" : modal.mode === "edit" ? "Edit Order" : "Order Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Client</Label><Input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Litres</Label><Input type="number" value={form.litres} onChange={e => setForm({ ...form, litres: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Price/Litre (Ksh)</Label><Input type="number" value={form.pricePerLitre} onChange={e => setForm({ ...form, pricePerLitre: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="dispatched">Dispatched</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Processed By</Label><Input value={form.processedBy} onChange={e => setForm({ ...form, processedBy: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Delivered By</Label><Input value={form.deliveredBy} onChange={e => setForm({ ...form, deliveredBy: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Delivery Date</Label><Input type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="col-span-2"><Label>Delivery Address</Label><Input value={form.deliveryAddress} onChange={e => setForm({ ...form, deliveryAddress: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} disabled={modal.mode === "view"} /></div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
