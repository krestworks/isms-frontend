import { useState } from "react";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/hooks/use-toast";

interface PumpSale {
  id: string;
  date: string;
  pumpNumber: number;
  fuelType: string;
  litres: number;
  pricePerLitre: number;
  amount: number;
  attendant: string;
  paymentMethod: string;
  customer: string;
  receiptNo: string;
}

const initialSales: PumpSale[] = [
  { id: "PS001", date: "2026-04-09", pumpNumber: 1, fuelType: "Super", litres: 45, pricePerLitre: 179.5, amount: 8077.5, attendant: "James Ochieng", paymentMethod: "Cash", customer: "Walk-in", receiptNo: "R-10451" },
  { id: "PS002", date: "2026-04-09", pumpNumber: 2, fuelType: "Diesel", litres: 120, pricePerLitre: 165.0, amount: 19800, attendant: "Mary Wanjiku", paymentMethod: "M-Pesa", customer: "KenTrans Ltd", receiptNo: "R-10452" },
  { id: "PS003", date: "2026-04-09", pumpNumber: 3, fuelType: "Super", litres: 30, pricePerLitre: 179.5, amount: 5385, attendant: "James Ochieng", paymentMethod: "Card", customer: "Walk-in", receiptNo: "R-10453" },
  { id: "PS004", date: "2026-04-09", pumpNumber: 1, fuelType: "V-Power", litres: 50, pricePerLitre: 195.0, amount: 9750, attendant: "Peter Mutua", paymentMethod: "Cash", customer: "John Kamau", receiptNo: "R-10454" },
  { id: "PS005", date: "2026-04-08", pumpNumber: 4, fuelType: "Diesel", litres: 200, pricePerLitre: 165.0, amount: 33000, attendant: "Mary Wanjiku", paymentMethod: "Invoice", customer: "SafariCom Fleet", receiptNo: "R-10455" },
  { id: "PS006", date: "2026-04-08", pumpNumber: 2, fuelType: "Kerosene", litres: 20, pricePerLitre: 155.0, amount: 3100, attendant: "Peter Mutua", paymentMethod: "Cash", customer: "Walk-in", receiptNo: "R-10456" },
  { id: "PS007", date: "2026-04-08", pumpNumber: 3, fuelType: "Super", litres: 40, pricePerLitre: 179.5, amount: 7180, attendant: "James Ochieng", paymentMethod: "M-Pesa", customer: "Walk-in", receiptNo: "R-10457" },
  { id: "PS008", date: "2026-04-07", pumpNumber: 1, fuelType: "Diesel", litres: 80, pricePerLitre: 165.0, amount: 13200, attendant: "Mary Wanjiku", paymentMethod: "Card", customer: "Matatu SACCO", receiptNo: "R-10458" },
];

const emptyForm: Omit<PumpSale, "id"> = { date: new Date().toISOString().split("T")[0], pumpNumber: 1, fuelType: "Super", litres: 0, pricePerLitre: 179.5, amount: 0, attendant: "", paymentMethod: "Cash", customer: "", receiptNo: "" };

export function PumpSalesTab() {
  const [sales, setSales] = useState<PumpSale[]>(initialSales);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; item: PumpSale | null } | null>(null);
  const [form, setForm] = useState<Omit<PumpSale, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<PumpSale | null>(null);
  const { toast } = useToast();

  const openCreate = () => { setForm(emptyForm); setModal({ mode: "create", item: null }); };
  const openEdit = (s: PumpSale) => { setForm({ ...s }); setModal({ mode: "edit", item: s }); };
  const openView = (s: PumpSale) => { setForm({ ...s }); setModal({ mode: "view", item: s }); };

  const updateForm = (updates: Partial<Omit<PumpSale, "id">>) => {
    const next = { ...form, ...updates };
    if ("litres" in updates || "pricePerLitre" in updates) {
      next.amount = next.litres * next.pricePerLitre;
    }
    setForm(next);
  };

  const handleSave = () => {
    if (!form.attendant) { toast({ title: "Error", description: "Attendant is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      const n: PumpSale = { ...form, id: `PS${String(sales.length + 1).padStart(3, "0")}`, receiptNo: `R-${10450 + sales.length + 1}` };
      setSales([n, ...sales]);
      toast({ title: "Sale Recorded" });
    } else if (modal?.mode === "edit" && modal.item) {
      setSales(sales.map((s) => (s.id === modal.item!.id ? { ...modal.item!, ...form } : s)));
      toast({ title: "Sale Updated" });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setSales(sales.filter((s) => s.id !== deleteConfirm.id));
      toast({ title: "Sale Deleted" });
      setDeleteConfirm(null);
    }
  };

  const columns: Column<PumpSale>[] = [
    { key: "receiptNo", label: "Receipt #", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "pumpNumber", label: "Pump", sortable: true, render: (s) => `Pump ${s.pumpNumber}` },
    { key: "fuelType", label: "Fuel", sortable: true },
    { key: "litres", label: "Litres", sortable: true, render: (s) => s.litres.toLocaleString() },
    { key: "amount", label: "Amount (Ksh)", sortable: true, render: (s) => `Ksh ${s.amount.toLocaleString()}` },
    { key: "attendant", label: "Attendant", sortable: true },
    { key: "paymentMethod", label: "Payment", sortable: true },
    { key: "customer", label: "Customer" },
  ];

  const filters: FilterOption[] = [
    { key: "fuelType", label: "Fuel Type", options: [{ label: "Super", value: "Super" }, { label: "Diesel", value: "Diesel" }, { label: "Kerosene", value: "Kerosene" }, { label: "V-Power", value: "V-Power" }] },
    { key: "paymentMethod", label: "Payment", options: [{ label: "Cash", value: "Cash" }, { label: "M-Pesa", value: "M-Pesa" }, { label: "Card", value: "Card" }, { label: "Invoice", value: "Invoice" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track all pump sales and transactions</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />Record Sale</Button>
      </div>

      <DataTable
        data={sales}
        columns={columns}
        searchKeys={["receiptNo", "attendant", "customer", "fuelType"]}
        searchPlaceholder="Search sales..."
        filters={filters}
        actions={(s) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(s)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />

      {modal && (
        <ModalForm
          open
          onClose={() => setModal(null)}
          title={modal.mode === "create" ? "Record Sale" : modal.mode === "edit" ? "Edit Sale" : "Sale Details"}
          onSubmit={modal.mode !== "view" ? handleSave : undefined}
          isView={modal.mode === "view"}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => updateForm({ date: e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Pump Number</Label>
              <Select value={String(form.pumpNumber)} onValueChange={(v) => updateForm({ pumpNumber: +v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>Pump {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <Select value={form.fuelType} onValueChange={(v) => updateForm({ fuelType: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super">Super</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Kerosene">Kerosene</SelectItem>
                  <SelectItem value="V-Power">V-Power</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Litres</Label>
              <Input type="number" value={form.litres} onChange={(e) => updateForm({ litres: +e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Price/Litre (Ksh)</Label>
              <Input type="number" value={form.pricePerLitre} onChange={(e) => updateForm({ pricePerLitre: +e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Total Amount (Ksh)</Label>
              <Input type="number" value={form.amount} disabled className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Attendant</Label>
              <Input value={form.attendant} onChange={(e) => updateForm({ attendant: e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => updateForm({ paymentMethod: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Customer</Label>
              <Input value={form.customer} onChange={(e) => updateForm({ customer: e.target.value })} disabled={modal.mode === "view"} placeholder="Walk-in" />
            </div>
          </div>
        </ModalForm>
      )}

      {deleteConfirm && (
        <ModalForm open onClose={() => setDeleteConfirm(null)} title="Delete Sale" onSubmit={handleDelete} submitLabel="Delete">
          <p className="text-sm text-muted-foreground">Delete sale <strong>{deleteConfirm.receiptNo}</strong>?</p>
        </ModalForm>
      )}
    </div>
  );
}
