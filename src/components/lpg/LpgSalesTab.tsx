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

interface LpgSale {
  id: string;
  date: string;
  receiptNo: string;
  customer: string;
  cylinderSize: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  attendant: string;
  exchangeType: string;
}

const initialData: LpgSale[] = [
  { id: "LS001", date: "2026-04-09", receiptNo: "LR-5001", customer: "Walk-in", cylinderSize: "13kg", quantity: 1, unitPrice: 2400, discount: 0, totalAmount: 2400, paymentMethod: "Cash", paymentStatus: "paid", attendant: "Alice Njeri", exchangeType: "Exchange" },
  { id: "LS002", date: "2026-04-09", receiptNo: "LR-5002", customer: "Mama Mboga Cafe", cylinderSize: "6kg", quantity: 2, unitPrice: 1100, discount: 100, totalAmount: 2100, paymentMethod: "M-Pesa", paymentStatus: "paid", attendant: "Brian Otieno", exchangeType: "New" },
  { id: "LS003", date: "2026-04-09", receiptNo: "LR-5003", customer: "Hotel Sapphire", cylinderSize: "50kg", quantity: 1, unitPrice: 11000, discount: 0, totalAmount: 11000, paymentMethod: "Invoice", paymentStatus: "pending", attendant: "Alice Njeri", exchangeType: "Exchange" },
  { id: "LS004", date: "2026-04-08", receiptNo: "LR-5004", customer: "Walk-in", cylinderSize: "13kg", quantity: 1, unitPrice: 2400, discount: 0, totalAmount: 2400, paymentMethod: "Cash", paymentStatus: "paid", attendant: "Brian Otieno", exchangeType: "Exchange" },
  { id: "LS005", date: "2026-04-08", receiptNo: "LR-5005", customer: "Njoroge Household", cylinderSize: "22.5kg", quantity: 1, unitPrice: 4200, discount: 200, totalAmount: 4000, paymentMethod: "M-Pesa", paymentStatus: "paid", attendant: "Alice Njeri", exchangeType: "Exchange" },
  { id: "LS006", date: "2026-04-07", receiptNo: "LR-5006", customer: "Walk-in", cylinderSize: "6kg", quantity: 3, unitPrice: 1100, discount: 0, totalAmount: 3300, paymentMethod: "Cash", paymentStatus: "paid", attendant: "Brian Otieno", exchangeType: "New" },
  { id: "LS007", date: "2026-04-07", receiptNo: "LR-5007", customer: "Quick Bites Restaurant", cylinderSize: "25kg", quantity: 2, unitPrice: 5200, discount: 500, totalAmount: 9900, paymentMethod: "Invoice", paymentStatus: "pending", attendant: "Alice Njeri", exchangeType: "Exchange" },
  { id: "LS008", date: "2026-04-06", receiptNo: "LR-5008", customer: "Walk-in", cylinderSize: "13kg", quantity: 1, unitPrice: 2400, discount: 0, totalAmount: 2400, paymentMethod: "Cash", paymentStatus: "paid", attendant: "Brian Otieno", exchangeType: "Refill" },
];

const emptyForm: Omit<LpgSale, "id"> = { date: new Date().toISOString().split("T")[0], receiptNo: "", customer: "", cylinderSize: "13kg", quantity: 1, unitPrice: 2400, discount: 0, totalAmount: 2400, paymentMethod: "Cash", paymentStatus: "paid", attendant: "", exchangeType: "Exchange" };

export function LpgSalesTab() {
  const [data, setData] = useState<LpgSale[]>(initialData);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; item: LpgSale | null } | null>(null);
  const [form, setForm] = useState<Omit<LpgSale, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<LpgSale | null>(null);
  const { toast } = useToast();

  const openCreate = () => { setForm({ ...emptyForm, receiptNo: `LR-${5000 + data.length + 1}` }); setModal({ mode: "create", item: null }); };
  const openEdit = (s: LpgSale) => { setForm({ ...s }); setModal({ mode: "edit", item: s }); };
  const openView = (s: LpgSale) => { setForm({ ...s }); setModal({ mode: "view", item: s }); };

  const updateForm = (u: Partial<Omit<LpgSale, "id">>) => {
    const next = { ...form, ...u };
    next.totalAmount = next.quantity * next.unitPrice - next.discount;
    setForm(next);
  };

  const handleSave = () => {
    if (!form.customer) { toast({ title: "Error", description: "Customer is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      setData([{ ...form, id: `LS${String(data.length + 1).padStart(3, "0")}` }, ...data]);
      toast({ title: "Sale Recorded" });
    } else if (modal?.mode === "edit" && modal.item) {
      setData(data.map((d) => (d.id === modal.item!.id ? { ...modal.item!, ...form } : d)));
      toast({ title: "Sale Updated" });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setData(data.filter((d) => d.id !== deleteConfirm.id));
      toast({ title: "Sale Deleted" });
      setDeleteConfirm(null);
    }
  };

  const columns: Column<LpgSale>[] = [
    { key: "receiptNo", label: "Receipt #", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "customer", label: "Customer", sortable: true },
    { key: "cylinderSize", label: "Size", sortable: true },
    { key: "quantity", label: "Qty", sortable: true },
    { key: "totalAmount", label: "Amount (Ksh)", sortable: true, render: (s) => <span className="font-mono">Ksh {s.totalAmount.toLocaleString()}</span> },
    { key: "exchangeType", label: "Type" },
    { key: "paymentMethod", label: "Payment" },
    { key: "paymentStatus", label: "Status", render: (s) => <StatusBadge status={s.paymentStatus} /> },
  ];

  const filters: FilterOption[] = [
    { key: "cylinderSize", label: "Size", options: ["6kg", "13kg", "22.5kg", "25kg", "50kg"].map((s) => ({ label: s, value: s })) },
    { key: "paymentStatus", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }] },
    { key: "exchangeType", label: "Type", options: [{ label: "Exchange", value: "Exchange" }, { label: "New", value: "New" }, { label: "Refill", value: "Refill" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Record cylinder sales and exchanges</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />Record Sale</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["receiptNo", "customer", "attendant"]} searchPlaceholder="Search sales..." filters={filters}
        actions={(s) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(s)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={modal.mode === "create" ? "Record Sale" : modal.mode === "edit" ? "Edit Sale" : "Sale Details"} onSubmit={modal.mode !== "view" ? handleSave : undefined} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => updateForm({ date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Receipt #</Label><Input value={form.receiptNo} disabled className="font-mono" /></div>
            <div className="space-y-2"><Label>Customer</Label><Input value={form.customer} onChange={(e) => updateForm({ customer: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Cylinder Size</Label>
              <Select value={form.cylinderSize} onValueChange={(v) => updateForm({ cylinderSize: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["6kg", "13kg", "22.5kg", "25kg", "50kg"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => updateForm({ quantity: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Unit Price (Ksh)</Label><Input type="number" value={form.unitPrice} onChange={(e) => updateForm({ unitPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Discount (Ksh)</Label><Input type="number" value={form.discount} onChange={(e) => updateForm({ discount: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Total (Ksh)</Label><Input type="number" value={form.totalAmount} disabled className="font-mono font-bold" /></div>
            <div className="space-y-2">
              <Label>Exchange Type</Label>
              <Select value={form.exchangeType} onValueChange={(v) => updateForm({ exchangeType: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Exchange">Exchange</SelectItem><SelectItem value="New">New Purchase</SelectItem><SelectItem value="Refill">Refill</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => updateForm({ paymentMethod: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="M-Pesa">M-Pesa</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Invoice">Invoice</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Attendant</Label><Input value={form.attendant} onChange={(e) => updateForm({ attendant: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={form.paymentStatus} onValueChange={(v) => updateForm({ paymentStatus: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
              </Select>
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
