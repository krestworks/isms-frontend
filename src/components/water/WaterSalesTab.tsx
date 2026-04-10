import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface WaterSale {
  id: string;
  date: string;
  customer: string;
  litres: number;
  pricePerLitre: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  attendant: string;
}

const sample: WaterSale[] = [
  { id: "WS001", date: "2025-06-11", customer: "Walk-in", litres: 20, pricePerLitre: 5, discount: 0, totalAmount: 100, paymentMethod: "Cash", paymentStatus: "paid", attendant: "Mary Wanjiku" },
  { id: "WS002", date: "2025-06-11", customer: "Oasis Hotel", litres: 1000, pricePerLitre: 4, discount: 200, totalAmount: 3800, paymentMethod: "M-Pesa", paymentStatus: "paid", attendant: "James Mwangi" },
  { id: "WS003", date: "2025-06-10", customer: "Green Estates", litres: 5000, pricePerLitre: 3.5, discount: 0, totalAmount: 17500, paymentMethod: "Invoice", paymentStatus: "pending", attendant: "Peter Kamau" },
];

const blank: Omit<WaterSale, "id"> = { date: new Date().toISOString().slice(0, 10), customer: "", litres: 0, pricePerLitre: 0, discount: 0, totalAmount: 0, paymentMethod: "Cash", paymentStatus: "paid", attendant: "" };

export function WaterSalesTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: WaterSale } | null>(null);
  const [form, setForm] = useState<Omit<WaterSale, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: WaterSale) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const calc = (f: Omit<WaterSale, "id">) => ({ ...f, totalAmount: f.litres * f.pricePerLitre - f.discount });
  const save = () => {
    const computed = calc(form);
    if (modal?.mode === "add") setData([{ ...computed, id: `WS${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...computed, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: WaterSale) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "date" as const, label: "Date" },
    { key: "customer" as const, label: "Customer" },
    { key: "litres" as const, label: "Litres", render: (i: WaterSale) => i.litres.toLocaleString() },
    { key: "pricePerLitre" as const, label: "Price/L", render: (i: WaterSale) => `Ksh ${i.pricePerLitre}` },
    { key: "discount" as const, label: "Discount", render: (i: WaterSale) => `Ksh ${i.discount}` },
    { key: "totalAmount" as const, label: "Total", render: (i: WaterSale) => `Ksh ${i.totalAmount.toLocaleString()}` },
    { key: "paymentMethod" as const, label: "Payment" },
    { key: "paymentStatus" as const, label: "Status", render: (i: WaterSale) => <StatusBadge status={i.paymentStatus} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Sales</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />New Sale</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["id", "customer", "attendant"]}
        filters={[{ key: "paymentStatus", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Unpaid", value: "unpaid" }] }, { key: "paymentMethod", label: "Method", options: [{ label: "Cash", value: "Cash" }, { label: "M-Pesa", value: "M-Pesa" }, { label: "Invoice", value: "Invoice" }, { label: "Card", value: "Card" }] }]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "New Sale" : modal.mode === "edit" ? "Edit Sale" : "Sale Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Customer</Label><Input value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Litres</Label><Input type="number" value={form.litres} onChange={e => setForm({ ...form, litres: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Price/Litre (Ksh)</Label><Input type="number" value={form.pricePerLitre} onChange={e => setForm({ ...form, pricePerLitre: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Discount (Ksh)</Label><Input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm({ ...form, paymentMethod: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="M-Pesa">M-Pesa</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Invoice">Invoice</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Payment Status</Label>
              <Select value={form.paymentStatus} onValueChange={v => setForm({ ...form, paymentStatus: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Attendant</Label><Input value={form.attendant} onChange={e => setForm({ ...form, attendant: e.target.value })} disabled={modal.mode === "view"} /></div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
