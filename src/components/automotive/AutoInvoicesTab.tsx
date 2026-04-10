import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AutoInvoice {
  id: string;
  date: string;
  type: string;
  client: string;
  vehicleReg: string;
  serviceRef: string;
  items: { desc: string; qty: number; rate: number; amount: number }[];
  subtotal: number;
  vat: number;
  total: number;
  status: string;
}

const sample: AutoInvoice[] = [
  { id: "AI001", date: "2025-06-11", type: "TAX INVOICE", client: "James Mwangi", vehicleReg: "KBZ 123A", serviceRef: "SR001", items: [{ desc: "Full Service - Labour", qty: 1, rate: 3500, amount: 3500 }, { desc: "Oil Filter", qty: 1, rate: 1200, amount: 1200 }, { desc: "Engine Oil 5W-30 (4L)", qty: 1, rate: 3800, amount: 3800 }], subtotal: 8500, vat: 1360, total: 9860, status: "paid" },
  { id: "AI002", date: "2025-06-11", type: "RECEIPT", client: "Lucy Njeri", vehicleReg: "KBB 321D", serviceRef: "SR004", items: [{ desc: "Engine Diagnostics", qty: 1, rate: 3000, amount: 3000 }], subtotal: 3000, vat: 480, total: 3480, status: "paid" },
  { id: "AI003", date: "2025-06-12", type: "TAX INVOICE", client: "Sarah Wanjiku", vehicleReg: "KCA 456B", serviceRef: "SR002", items: [{ desc: "Brake Pad Replacement - Labour", qty: 1, rate: 4000, amount: 4000 }, { desc: "Front Brake Pads (Set)", qty: 1, rate: 7500, amount: 7500 }], subtotal: 11500, vat: 1840, total: 13340, status: "pending" },
];

const blank: Omit<AutoInvoice, "id"> = { date: new Date().toISOString().slice(0, 10), type: "TAX INVOICE", client: "", vehicleReg: "", serviceRef: "", items: [{ desc: "", qty: 1, rate: 0, amount: 0 }], subtotal: 0, vat: 0, total: 0, status: "pending" };

export function AutoInvoicesTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: AutoInvoice } | null>(null);
  const [form, setForm] = useState<Omit<AutoInvoice, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: AutoInvoice) => {
    setForm(item ? { ...item, items: [...(item.items || [])] } : { ...blank, items: [{ desc: "", qty: 1, rate: 0, amount: 0 }] });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const recalc = (items: AutoInvoice["items"]) => {
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const vat = Math.round(subtotal * 0.16);
    return { items, subtotal, vat, total: subtotal + vat };
  };
  const save = () => {
    const computed = { ...form, ...recalc(form.items) };
    if (modal?.mode === "add") setData([{ ...computed, id: `AI${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...computed, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: AutoInvoice) => setData(data.filter(d => d.id !== item.id));

  const updateItem = (idx: number, field: string, value: string | number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "qty" || field === "rate") items[idx].amount = items[idx].qty * items[idx].rate;
    const { subtotal, vat, total } = recalc(items);
    setForm({ ...form, items, subtotal, vat, total });
  };

  const columns = [
    { key: "id" as const, label: "Invoice #" },
    { key: "date" as const, label: "Date" },
    { key: "type" as const, label: "Type" },
    { key: "client" as const, label: "Client" },
    { key: "vehicleReg" as const, label: "Vehicle" },
    { key: "serviceRef" as const, label: "Service Ref" },
    { key: "total" as const, label: "Total", render: (i: AutoInvoice) => `Ksh ${i.total.toLocaleString()}` },
    { key: "status" as const, label: "Status", render: (i: AutoInvoice) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Invoices & Receipts</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />Create Invoice</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["id", "client", "vehicleReg", "serviceRef"]}
        filters={[
          { key: "type", label: "Type", options: [{ label: "Tax Invoice", value: "TAX INVOICE" }, { label: "Receipt", value: "RECEIPT" }] },
          { key: "status", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Overdue", value: "overdue" }] },
        ]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "view" ? form.type : modal.mode === "add" ? "Create Invoice" : "Edit Invoice"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          {modal.mode === "view" ? (
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice #</span><span className="font-mono">{modal.item.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{form.date}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span>{form.client}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span>{form.vehicleReg}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service Ref</span><span>{form.serviceRef}</span></div>
              <Separator />
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground"><th className="text-left">Description</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{form.items.map((it, idx) => (
                  <tr key={idx}><td>{it.desc}</td><td className="text-right">{it.qty}</td><td className="text-right">Ksh {it.rate.toLocaleString()}</td><td className="text-right">Ksh {it.amount.toLocaleString()}</td></tr>
                ))}</tbody>
              </table>
              <Separator />
              <div className="flex justify-between"><span>Subtotal</span><span>Ksh {form.subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>VAT (16%)</span><span>Ksh {form.vat.toLocaleString()}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>Ksh {form.total.toLocaleString()}</span></div>
              <div className="flex justify-center"><StatusBadge status={form.status} /></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="TAX INVOICE">Tax Invoice</SelectItem><SelectItem value="RECEIPT">Receipt</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Client</Label><Input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
                <div><Label>Vehicle Reg</Label><Input value={form.vehicleReg} onChange={e => setForm({ ...form, vehicleReg: e.target.value })} /></div>
                <div><Label>Service Ref</Label><Input value={form.serviceRef} onChange={e => setForm({ ...form, serviceRef: e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <Label>Line Items</Label>
              {form.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2">
                  <Input placeholder="Description" value={it.desc} onChange={e => updateItem(idx, "desc", e.target.value)} className="col-span-2" />
                  <Input type="number" placeholder="Qty" value={it.qty} onChange={e => updateItem(idx, "qty", +e.target.value)} />
                  <Input type="number" placeholder="Rate" value={it.rate} onChange={e => updateItem(idx, "rate", +e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, items: [...form.items, { desc: "", qty: 1, rate: 0, amount: 0 }] })}>+ Add Line</Button>
              <Separator />
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>Ksh {form.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>VAT (16%):</span><span>Ksh {form.vat.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Total:</span><span>Ksh {form.total.toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </ModalForm>
      )}
    </>
  );
}
