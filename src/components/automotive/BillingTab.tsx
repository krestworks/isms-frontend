import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Bill {
  id: string;
  date: string;
  serviceRecordId: string;
  customerName: string;
  vehicleReg: string;
  labourCharges: number;
  partsCost: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  paidAmount: number;
  balance: number;
}

const sample: Bill[] = [
  { id: "BL001", date: "2025-06-11", serviceRecordId: "SR001", customerName: "James Mwangi", vehicleReg: "KBZ 123A", labourCharges: 3500, partsCost: 5000, discount: 0, totalAmount: 8500, paymentMethod: "M-Pesa", paymentStatus: "paid", paidAmount: 8500, balance: 0 },
  { id: "BL002", date: "2025-06-11", serviceRecordId: "SR004", customerName: "Lucy Njeri", vehicleReg: "KBB 321D", labourCharges: 3000, partsCost: 0, discount: 500, totalAmount: 2500, paymentMethod: "Cash", paymentStatus: "paid", paidAmount: 2500, balance: 0 },
  { id: "BL003", date: "2025-06-12", serviceRecordId: "SR002", customerName: "Sarah Wanjiku", vehicleReg: "KCA 456B", labourCharges: 4000, partsCost: 7500, discount: 0, totalAmount: 11500, paymentMethod: "Invoice", paymentStatus: "pending", paidAmount: 0, balance: 11500 },
];

const blank: Omit<Bill, "id"> = { date: new Date().toISOString().slice(0, 10), serviceRecordId: "", customerName: "", vehicleReg: "", labourCharges: 0, partsCost: 0, discount: 0, totalAmount: 0, paymentMethod: "", paymentStatus: "pending", paidAmount: 0, balance: 0 };

export function BillingTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Bill } | null>(null);
  const [form, setForm] = useState<Omit<Bill, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: Bill) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const save = () => {
    const total = form.labourCharges + form.partsCost - form.discount;
    const computed = { ...form, totalAmount: total, balance: total - form.paidAmount };
    if (modal?.mode === "add") setData([{ ...computed, id: `BL${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...computed, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: Bill) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "Bill #" },
    { key: "date" as const, label: "Date" },
    { key: "serviceRecordId" as const, label: "Service Ref" },
    { key: "customerName" as const, label: "Customer" },
    { key: "vehicleReg" as const, label: "Vehicle" },
    { key: "totalAmount" as const, label: "Total", render: (i: Bill) => `Ksh ${i.totalAmount.toLocaleString()}` },
    { key: "paidAmount" as const, label: "Paid", render: (i: Bill) => `Ksh ${i.paidAmount.toLocaleString()}` },
    { key: "balance" as const, label: "Balance", render: (i: Bill) => <span className={i.balance > 0 ? "text-destructive" : ""}>{`Ksh ${i.balance.toLocaleString()}`}</span> },
    { key: "paymentMethod" as const, label: "Method" },
    { key: "paymentStatus" as const, label: "Status", render: (i: Bill) => <StatusBadge status={i.paymentStatus} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Billing</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />New Bill</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["id", "customerName", "vehicleReg", "serviceRecordId"]}
        filters={[
          { key: "paymentStatus", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Partial", value: "partial" }] },
          { key: "paymentMethod", label: "Method", options: [{ label: "Cash", value: "Cash" }, { label: "M-Pesa", value: "M-Pesa" }, { label: "Card", value: "Card" }, { label: "Invoice", value: "Invoice" }] },
        ]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "New Bill" : modal.mode === "edit" ? "Edit Bill" : "Bill Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Service Ref</Label><Input value={form.serviceRecordId} onChange={e => setForm({ ...form, serviceRecordId: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Customer</Label><Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Vehicle Reg</Label><Input value={form.vehicleReg} onChange={e => setForm({ ...form, vehicleReg: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Labour Charges (Ksh)</Label><Input type="number" value={form.labourCharges} onChange={e => setForm({ ...form, labourCharges: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Parts Cost (Ksh)</Label><Input type="number" value={form.partsCost} onChange={e => setForm({ ...form, partsCost: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Discount (Ksh)</Label><Input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm({ ...form, paymentMethod: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Paid Amount (Ksh)</Label><Input type="number" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Payment Status</Label>
              <Select value={form.paymentStatus} onValueChange={v => setForm({ ...form, paymentStatus: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
