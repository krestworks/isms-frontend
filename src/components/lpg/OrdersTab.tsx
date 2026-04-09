import { useState } from "react";
import { Plus, Eye, Pencil, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/hooks/use-toast";

interface ClientOrder {
  id: string;
  orderNo: string;
  date: string;
  client: string;
  clientPhone: string;
  cylinderSize: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  processedBy: string;
  deliveredBy: string;
  deliveryAddress: string;
  deliveryDate: string;
  notes: string;
}

const statusFlow = ["pending", "processing", "dispatched", "delivered", "cancelled"];

const initialData: ClientOrder[] = [
  { id: "CO001", orderNo: "ORD-7001", date: "2026-04-09", client: "Hotel Sapphire", clientPhone: "+254 722 111 000", cylinderSize: "50kg", quantity: 2, unitPrice: 11000, totalAmount: 22000, orderStatus: "processing", paymentStatus: "pending", paymentMethod: "Invoice", processedBy: "Alice Njeri", deliveredBy: "", deliveryAddress: "Westlands, Nairobi", deliveryDate: "", notes: "Urgent delivery needed" },
  { id: "CO002", orderNo: "ORD-7002", date: "2026-04-09", client: "Mama Mboga Cafe", clientPhone: "+254 733 222 000", cylinderSize: "13kg", quantity: 3, unitPrice: 2400, totalAmount: 7200, orderStatus: "dispatched", paymentStatus: "paid", paymentMethod: "M-Pesa", processedBy: "Alice Njeri", deliveredBy: "Brian Otieno", deliveryAddress: "Kawangware, Nairobi", deliveryDate: "2026-04-09", notes: "" },
  { id: "CO003", orderNo: "ORD-7003", date: "2026-04-08", client: "Quick Bites Restaurant", clientPhone: "+254 744 333 000", cylinderSize: "25kg", quantity: 1, unitPrice: 5200, totalAmount: 5200, orderStatus: "delivered", paymentStatus: "paid", paymentMethod: "Cash", processedBy: "Brian Otieno", deliveredBy: "James Mwangi", deliveryAddress: "Kilimani, Nairobi", deliveryDate: "2026-04-08", notes: "" },
  { id: "CO004", orderNo: "ORD-7004", date: "2026-04-08", client: "Njoroge Household", clientPhone: "+254 755 444 000", cylinderSize: "13kg", quantity: 1, unitPrice: 2400, totalAmount: 2400, orderStatus: "delivered", paymentStatus: "paid", paymentMethod: "M-Pesa", processedBy: "Alice Njeri", deliveredBy: "Brian Otieno", deliveryAddress: "South B, Nairobi", deliveryDate: "2026-04-08", notes: "" },
  { id: "CO005", orderNo: "ORD-7005", date: "2026-04-07", client: "Hotel Sapphire", clientPhone: "+254 722 111 000", cylinderSize: "50kg", quantity: 1, unitPrice: 11000, totalAmount: 11000, orderStatus: "delivered", paymentStatus: "paid", paymentMethod: "Invoice", processedBy: "Brian Otieno", deliveredBy: "James Mwangi", deliveryAddress: "Westlands, Nairobi", deliveryDate: "2026-04-07", notes: "" },
  { id: "CO006", orderNo: "ORD-7006", date: "2026-04-09", client: "Kamau Family", clientPhone: "+254 766 555 000", cylinderSize: "6kg", quantity: 2, unitPrice: 1100, totalAmount: 2200, orderStatus: "pending", paymentStatus: "pending", paymentMethod: "Cash", processedBy: "", deliveredBy: "", deliveryAddress: "Kasarani, Nairobi", deliveryDate: "", notes: "Call before delivery" },
];

const emptyForm: Omit<ClientOrder, "id"> = { orderNo: "", date: new Date().toISOString().split("T")[0], client: "", clientPhone: "", cylinderSize: "13kg", quantity: 1, unitPrice: 2400, totalAmount: 2400, orderStatus: "pending", paymentStatus: "pending", paymentMethod: "Cash", processedBy: "", deliveredBy: "", deliveryAddress: "", deliveryDate: "", notes: "" };

export function OrdersTab() {
  const [data, setData] = useState<ClientOrder[]>(initialData);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; item: ClientOrder | null } | null>(null);
  const [form, setForm] = useState<Omit<ClientOrder, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<ClientOrder | null>(null);
  const { toast } = useToast();

  const openCreate = () => { setForm({ ...emptyForm, orderNo: `ORD-${7000 + data.length + 1}` }); setModal({ mode: "create", item: null }); };
  const openEdit = (o: ClientOrder) => { setForm({ ...o }); setModal({ mode: "edit", item: o }); };
  const openView = (o: ClientOrder) => { setForm({ ...o }); setModal({ mode: "view", item: o }); };

  const updateForm = (u: Partial<Omit<ClientOrder, "id">>) => {
    const next = { ...form, ...u };
    next.totalAmount = next.quantity * next.unitPrice;
    setForm(next);
  };

  const handleSave = () => {
    if (!form.client) { toast({ title: "Error", description: "Client is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      setData([{ ...form, id: `CO${String(data.length + 1).padStart(3, "0")}` }, ...data]);
      toast({ title: "Order Created" });
    } else if (modal?.mode === "edit" && modal.item) {
      setData(data.map((d) => (d.id === modal.item!.id ? { ...modal.item!, ...form } : d)));
      toast({ title: "Order Updated" });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setData(data.filter((d) => d.id !== deleteConfirm.id));
      toast({ title: "Order Deleted" });
      setDeleteConfirm(null);
    }
  };

  const pendingCount = data.filter((o) => o.orderStatus === "pending").length;
  const processingCount = data.filter((o) => o.orderStatus === "processing" || o.orderStatus === "dispatched").length;
  const deliveredCount = data.filter((o) => o.orderStatus === "delivered").length;

  const columns: Column<ClientOrder>[] = [
    { key: "orderNo", label: "Order #", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "client", label: "Client", sortable: true },
    { key: "cylinderSize", label: "Size" },
    { key: "quantity", label: "Qty" },
    { key: "totalAmount", label: "Amount (Ksh)", sortable: true, render: (o) => <span className="font-mono">Ksh {o.totalAmount.toLocaleString()}</span> },
    { key: "orderStatus", label: "Order Status", render: (o) => <StatusBadge status={o.orderStatus} /> },
    { key: "paymentStatus", label: "Payment", render: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: "deliveredBy", label: "Delivered By", render: (o) => o.deliveredBy || "—" },
  ];

  const filters: FilterOption[] = [
    { key: "orderStatus", label: "Order Status", options: statusFlow.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })) },
    { key: "paymentStatus", label: "Payment", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }] },
    { key: "cylinderSize", label: "Size", options: ["6kg", "13kg", "22.5kg", "25kg", "50kg"].map((s) => ({ label: s, value: s })) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending Orders</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{processingCount}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </div>
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{deliveredCount}</p>
          <p className="text-xs text-muted-foreground">Delivered</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Client orders, processing, and delivery tracking</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />New Order</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["orderNo", "client", "deliveredBy", "processedBy"]} searchPlaceholder="Search orders..." filters={filters}
        actions={(o) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(o)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(o)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={modal.mode === "create" ? "New Order" : modal.mode === "edit" ? "Edit Order" : "Order Details"} onSubmit={modal.mode !== "view" ? handleSave : undefined} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Order #</Label><Input value={form.orderNo} disabled className="font-mono" /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => updateForm({ date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Client</Label><Input value={form.client} onChange={(e) => updateForm({ client: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Client Phone</Label><Input value={form.clientPhone} onChange={(e) => updateForm({ clientPhone: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Cylinder Size</Label>
              <Select value={form.cylinderSize} onValueChange={(v) => updateForm({ cylinderSize: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["6kg", "13kg", "22.5kg", "25kg", "50kg"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => updateForm({ quantity: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Unit Price (Ksh)</Label><Input type="number" value={form.unitPrice} onChange={(e) => updateForm({ unitPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Total (Ksh)</Label><Input type="number" value={form.totalAmount} disabled className="font-mono font-bold" /></div>
            <div className="space-y-2">
              <Label>Order Status</Label>
              <Select value={form.orderStatus} onValueChange={(v) => updateForm({ orderStatus: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusFlow.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => updateForm({ paymentMethod: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="M-Pesa">M-Pesa</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Invoice">Invoice</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={form.paymentStatus} onValueChange={(v) => updateForm({ paymentStatus: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Processed By</Label><Input value={form.processedBy} onChange={(e) => updateForm({ processedBy: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Delivered By</Label><Input value={form.deliveredBy} onChange={(e) => updateForm({ deliveredBy: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={form.deliveryDate} onChange={(e) => updateForm({ deliveryDate: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="col-span-2 space-y-2"><Label>Delivery Address</Label><Input value={form.deliveryAddress} onChange={(e) => updateForm({ deliveryAddress: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="col-span-2 space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} disabled={modal.mode === "view"} /></div>
          </div>
        </ModalForm>
      )}
      {deleteConfirm && (
        <ModalForm open onClose={() => setDeleteConfirm(null)} title="Delete Order" onSubmit={handleDelete} submitLabel="Delete">
          <p className="text-sm text-muted-foreground">Delete order <strong>{deleteConfirm.orderNo}</strong>?</p>
        </ModalForm>
      )}
    </div>
  );
}
