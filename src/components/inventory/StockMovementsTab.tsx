import { useState } from "react";
import { Plus, ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Movement {
  id: string;
  date: string;
  product: string;
  type: string; // in | out | adjustment
  qty: number;
  reason: string;
  reference: string;
  by: string;
}

const initial: Movement[] = [
  { id: "MV-001", date: "2026-04-28", product: "Maize Flour 2kg", type: "in", qty: 50, reason: "Purchase from supplier", reference: "PO-2034", by: "Susan Otieno" },
  { id: "MV-002", date: "2026-04-28", product: "Cooking Oil 1L", type: "out", qty: 8, reason: "POS sale", reference: "INV-1209", by: "Kevin Njoroge" },
  { id: "MV-003", date: "2026-04-29", product: "Soda 500ml", type: "out", qty: 24, reason: "POS sale", reference: "INV-1210", by: "Kevin Njoroge" },
  { id: "MV-004", date: "2026-04-29", product: "Amoxicillin 250mg", type: "adjustment", qty: -2, reason: "Expired stock removal", reference: "ADJ-005", by: "Kevin Njoroge" },
];

const PRODUCTS = ["Maize Flour 2kg", "Cooking Oil 1L", "Soda 500ml", "Paracetamol 500mg (10s)", "Amoxicillin 250mg"];
const emptyForm = { date: "", product: PRODUCTS[0], type: "in", qty: 0, reason: "", reference: "", by: "" };

export default function StockMovementsTab() {
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const stats = {
    total: data.length,
    inMov: data.filter(d => d.type === "in").length,
    outMov: data.filter(d => d.type === "out").length,
    adj: data.filter(d => d.type === "adjustment").length,
  };

  const columns: Column<Movement>[] = [
    { key: "id", label: "Ref" },
    { key: "date", label: "Date", sortable: true },
    { key: "product", label: "Product" },
    { key: "type", label: "Type", render: m => {
      const map = { in: { Icon: ArrowDown, cls: "text-green-700 bg-green-100" }, out: { Icon: ArrowUp, cls: "text-red-700 bg-red-100" }, adjustment: { Icon: RotateCcw, cls: "text-amber-700 bg-amber-100" } } as const;
      const { Icon, cls } = map[m.type as keyof typeof map];
      return <span className={`px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 ${cls}`}><Icon className="h-3 w-3" />{m.type}</span>;
    } },
    { key: "qty", label: "Qty", render: m => <span className={m.qty < 0 ? "text-destructive font-medium" : "font-medium"}>{m.qty > 0 ? "+" : ""}{m.qty}</span> },
    { key: "reason", label: "Reason" },
    { key: "reference", label: "Doc" },
    { key: "by", label: "By" },
  ];

  const filters: FilterOption[] = [
    { key: "type", label: "Type", options: ["in", "out", "adjustment"].map(t => ({ label: t, value: t })) },
  ];

  const openNew = () => { setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); setModalOpen(true); };
  const handleSave = () => {
    setData(d => [...d, { id: `MV-${String(d.length + 1).padStart(3, "0")}`, ...form }]);
    setModalOpen(false);
  };
  const handleDelete = (m: Movement) => setData(d => d.filter(x => x.id !== m.id));
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stock Movements</h3>
          <p className="text-sm text-muted-foreground">Track all inflows, outflows & adjustments</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Record Movement</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Movements", value: stats.total },
          { label: "Stock In", value: stats.inMov, color: "text-green-600" },
          { label: "Stock Out", value: stats.outMov, color: "text-red-600" },
          { label: "Adjustments", value: stats.adj, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["product", "reference", "id"]} searchPlaceholder="Search movements..." filters={filters} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record Stock Movement" onSubmit={handleSave} submitLabel="Record">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["in", "out", "adjustment"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Product</Label>
              <Select value={form.product} onValueChange={v => set("product", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUCTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><Input type="number" value={form.qty} onChange={e => set("qty", Number(e.target.value))} /></div>
            <div><Label>Reference</Label><Input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="PO/INV/ADJ no." /></div>
            <div className="col-span-2"><Label>Reason</Label><Textarea value={form.reason} onChange={e => set("reason", e.target.value)} /></div>
            <div className="col-span-2"><Label>Recorded By</Label><Input value={form.by} onChange={e => set("by", e.target.value)} /></div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
