import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";

interface InvoiceItem { description: string; litres: number; rate: number; amount: number; }
interface Invoice {
  id: string;
  date: string;
  dueDate: string;
  client: string;
  type: string;
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  total: number;
  status: string;
}

const mkItems = (desc: string, litres: number, rate: number): InvoiceItem[] => [{ description: desc, litres, rate, amount: litres * rate }];

const sample: Invoice[] = [
  { id: "WINV001", date: "2025-06-11", dueDate: "2025-06-25", client: "Oasis Hotel", type: "TAX INVOICE", items: mkItems("Purified Water Delivery", 2000, 4), subtotal: 8000, vat: 1280, total: 9280, status: "paid" },
  { id: "WINV002", date: "2025-06-11", dueDate: "2025-07-11", client: "Green Estates", type: "TAX INVOICE", items: mkItems("Bulk Water Supply", 10000, 3.5), subtotal: 35000, vat: 5600, total: 40600, status: "pending" },
  { id: "WRCT001", date: "2025-06-11", dueDate: "", client: "Walk-in", type: "RECEIPT", items: mkItems("Water Purchase (20L)", 20, 5), subtotal: 100, vat: 16, total: 116, status: "paid" },
];

const blank: Omit<Invoice, "id"> = { date: new Date().toISOString().slice(0, 10), dueDate: "", client: "", type: "TAX INVOICE", items: [{ description: "", litres: 0, rate: 0, amount: 0 }], subtotal: 0, vat: 0, total: 0, status: "pending" };

export function WaterInvoicesTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Invoice } | null>(null);
  const [form, setForm] = useState<Omit<Invoice, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: Invoice) => {
    setForm(item ? { ...item } : { ...blank, items: [{ description: "", litres: 0, rate: 0, amount: 0 }] });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const recalc = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const vat = Math.round(subtotal * 0.16);
    return { items, subtotal, vat, total: subtotal + vat };
  };
  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const items = [...form.items];
    (items[idx] as any)[field] = value;
    items[idx].amount = items[idx].litres * items[idx].rate;
    setForm({ ...form, ...recalc(items) });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { description: "", litres: 0, rate: 0, amount: 0 }] });
  const save = () => {
    const prefix = form.type === "RECEIPT" ? "WRCT" : "WINV";
    if (modal?.mode === "add") setData([{ ...form, id: `${prefix}${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...form, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: Invoice) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "Invoice #" },
    { key: "date" as const, label: "Date" },
    { key: "client" as const, label: "Client" },
    { key: "type" as const, label: "Type" },
    { key: "subtotal" as const, label: "Subtotal", render: (i: Invoice) => `Ksh ${i.subtotal.toLocaleString()}` },
    { key: "vat" as const, label: "VAT", render: (i: Invoice) => `Ksh ${i.vat.toLocaleString()}` },
    { key: "total" as const, label: "Total", render: (i: Invoice) => `Ksh ${i.total.toLocaleString()}` },
    { key: "status" as const, label: "Status", render: (i: Invoice) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Invoices & Receipts</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />Create Invoice</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["id", "client"]}
        filters={[{ key: "type", label: "Type", options: [{ label: "Tax Invoice", value: "TAX INVOICE" }, { label: "Receipt", value: "RECEIPT" }] }, { key: "status", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Unpaid", value: "unpaid" }] }]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "view" ? form.type : modal.mode === "add" ? "Create Invoice" : "Edit Invoice"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          {modal.mode === "view" ? (
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice #</span><span className="font-mono">{modal.item.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{form.date}</span></div>
              {form.dueDate && <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{form.dueDate}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span>{form.client}</span></div>
              <Separator />
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="text-left py-1">Description</th><th className="text-right">Litres</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{form.items.map((it, i) => <tr key={i} className="border-b"><td className="py-1">{it.description}</td><td className="text-right">{it.litres.toLocaleString()}</td><td className="text-right">Ksh {it.rate}</td><td className="text-right">Ksh {it.amount.toLocaleString()}</td></tr>)}</tbody>
              </table>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>Ksh {form.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>VAT (16%)</span><span>Ksh {form.vat.toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>Ksh {form.total.toLocaleString()}</span></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                <div><Label>Client</Label><Input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="TAX INVOICE">Tax Invoice</SelectItem><SelectItem value="RECEIPT">Receipt</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Line Items</Label>
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2">
                    <Input placeholder="Description" value={it.description} onChange={e => updateItem(i, "description", e.target.value)} />
                    <Input type="number" placeholder="Litres" value={it.litres} onChange={e => updateItem(i, "litres", +e.target.value)} />
                    <Input type="number" placeholder="Rate" value={it.rate} onChange={e => updateItem(i, "rate", +e.target.value)} />
                    <Input value={`Ksh ${it.amount.toLocaleString()}`} disabled />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>Ksh {form.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>VAT (16%)</span><span>Ksh {form.vat.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>Ksh {form.total.toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </ModalForm>
      )}
    </>
  );
}
