import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Sale {
  id: string;
  date: string;
  product: string;
  qty: number;
  unitPrice: number;
  total: number;
  paymentMethod: string;
  customer: string;
  cashier: string;
  subBusiness: string;
}

const initial: Sale[] = [
  { id: "INV-1209", date: "2026-04-28", product: "Cooking Oil 1L", qty: 8, unitPrice: 380, total: 3040, paymentMethod: "M-Pesa", customer: "Walk-in", cashier: "Kevin Njoroge", subBusiness: "Jirani Mini Mart — CBD" },
  { id: "INV-1210", date: "2026-04-29", product: "Soda 500ml", qty: 24, unitPrice: 80, total: 1920, paymentMethod: "Cash", customer: "Walk-in", cashier: "Kevin Njoroge", subBusiness: "Jirani Mini Mart — CBD" },
  { id: "INV-1211", date: "2026-04-29", product: "Paracetamol 500mg", qty: 5, unitPrice: 50, total: 250, paymentMethod: "Cash", customer: "Walk-in", cashier: "Kevin Njoroge", subBusiness: "Westlands Pharmacy" },
];

const PRODUCTS = ["Maize Flour 2kg", "Cooking Oil 1L", "Soda 500ml", "Paracetamol 500mg", "Amoxicillin 250mg"];
const SUB_BIZ = ["Jirani Mini Mart — CBD", "Westlands Pharmacy", "Mombasa Rd Cafe"];
const emptyForm = { date: "", product: PRODUCTS[0], qty: 1, unitPrice: 0, paymentMethod: "Cash", customer: "Walk-in", cashier: "", subBusiness: SUB_BIZ[0] };

export default function InventorySalesTab() {
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const stats = {
    total: data.length,
    revenue: data.reduce((s, d) => s + d.total, 0),
    units: data.reduce((s, d) => s + d.qty, 0),
  };

  const columns: Column<Sale>[] = [
    { key: "id", label: "Receipt" },
    { key: "date", label: "Date", sortable: true },
    { key: "product", label: "Product" },
    { key: "qty", label: "Qty" },
    { key: "unitPrice", label: "Unit Price", render: s => `Ksh ${s.unitPrice}` },
    { key: "total", label: "Total", render: s => <span className="font-semibold">Ksh {s.total.toLocaleString()}</span> },
    { key: "paymentMethod", label: "Payment", render: s => <Badge variant="outline">{s.paymentMethod}</Badge> },
    { key: "subBusiness", label: "Outlet" },
    { key: "cashier", label: "Cashier" },
  ];

  const filters: FilterOption[] = [
    { key: "subBusiness", label: "Outlet", options: SUB_BIZ.map(s => ({ label: s, value: s })) },
    { key: "paymentMethod", label: "Payment", options: ["Cash", "M-Pesa", "Card", "Credit"].map(p => ({ label: p, value: p })) },
  ];

  const openNew = () => { setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); setModalOpen(true); };
  const handleSave = () => {
    const total = form.qty * form.unitPrice;
    setData(d => [...d, { id: `INV-${1212 + d.length - initial.length}`, ...form, total }]);
    setModalOpen(false);
  };
  const handleDelete = (s: Sale) => setData(d => d.filter(x => x.id !== s.id));
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sales</h3>
          <p className="text-sm text-muted-foreground">POS-style sales across all sub-businesses</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Record Sale</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Sales", value: stats.total },
          { label: "Revenue", value: `Ksh ${stats.revenue.toLocaleString()}`, color: "text-primary" },
          { label: "Units Sold", value: stats.units, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["product", "id", "customer"]} searchPlaceholder="Search sales..." filters={filters} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record Sale" onSubmit={handleSave} submitLabel="Record">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label>Outlet</Label>
              <Select value={form.subBusiness} onValueChange={v => set("subBusiness", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUB_BIZ.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Product</Label>
              <Select value={form.product} onValueChange={v => set("product", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><Input type="number" min={1} value={form.qty} onChange={e => set("qty", Number(e.target.value))} /></div>
            <div><Label>Unit Price (Ksh)</Label><Input type="number" value={form.unitPrice} onChange={e => set("unitPrice", Number(e.target.value))} /></div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Cash", "M-Pesa", "Card", "Credit"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Customer</Label><Input value={form.customer} onChange={e => set("customer", e.target.value)} /></div>
            <div className="col-span-2"><Label>Cashier</Label><Input value={form.cashier} onChange={e => set("cashier", e.target.value)} /></div>
            <div className="col-span-2 p-3 rounded bg-muted text-sm">Total: <span className="font-bold text-lg">Ksh {(form.qty * form.unitPrice).toLocaleString()}</span></div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
