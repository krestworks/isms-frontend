import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { clientsApi, ApiClientOrder } from "@/lib/clientsApi";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const MODULES         = ["Fuel", "LPG", "Water", "Car Wash", "Automotive", "Mini Mart", "Pharmacy", "Restaurant", "Tyre Centre"];
const PAYMENT_METHODS = ["Cash", "M-Pesa", "Card", "Credit", "Bank Transfer"];
const STATUSES        = ["pending", "processing", "completed", "cancelled"];

const emptyForm = {
  clientName: "", clientId: "", module: "Fuel", description: "", amount: 0,
  paymentMethod: "Cash", status: "pending", orderDate: "", notes: "",
};

const columns: Column<ApiClientOrder>[] = [
  { key: "orderRef", label: "Ref", sortable: true },
  { key: "orderDate", label: "Date", sortable: true },
  { key: "clientName", label: "Client" },
  { key: "module", label: "Module", render: r => <Badge variant="secondary">{r.module}</Badge> },
  { key: "description", label: "Description", render: r => <span className="line-clamp-1">{r.description}</span> },
  { key: "amount", label: "Amount", render: r => `Ksh ${r.amount.toLocaleString()}`, sortable: true },
  { key: "paymentMethod", label: "Payment", render: r => <Badge variant="outline">{r.paymentMethod}</Badge> },
  { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "module",  label: "Module",  options: MODULES.map(m => ({ label: m, value: m })) },
  { key: "status",  label: "Status",  options: STATUSES.map(s => ({ label: s, value: s })) },
  { key: "paymentMethod", label: "Payment", options: PAYMENT_METHODS.map(p => ({ label: p, value: p })) },
];

const exportColumns: ExportColumn<ApiClientOrder>[] = [
  { label: "Ref",         value: r => r.orderRef },
  { label: "Date",        value: r => r.orderDate },
  { label: "Client",      value: r => r.clientName },
  { label: "Module",      value: r => r.module },
  { label: "Description", value: r => r.description },
  { label: "Amount",      value: r => r.amount, total: rows => rows.reduce((sum, r) => sum + r.amount, 0) },
  { label: "Payment",     value: r => r.paymentMethod },
  { label: "Status",      value: r => r.status },
];

export default function ClientOrdersTab() {
  const [data, setData]       = useState<ApiClientOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiClientOrder | null>(null);
  const [viewing, setViewing] = useState<ApiClientOrder | null>(null);
  const [form, setForm]       = useState(emptyForm);
  const [visibleData, setVisibleData] = useState<ApiClientOrder[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientsApi.orders.list(null, { limit: 500, from: fromDate || undefined, to: toDate || undefined } as any);
      setData((res as any).data ?? []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const pendingDeleteIds = usePendingDeleteIds("ClientOrder", null, data.length);

  const stats = {
    total:     visibleData.length,
    pending:   visibleData.filter(d => d.status === "pending").length,
    completed: visibleData.filter(d => d.status === "completed").length,
    revenue:   visibleData.filter(d => d.status === "completed").reduce((s, d) => s + d.amount, 0),
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, orderDate: new Date().toISOString().split("T")[0] });
    setModalOpen(true);
  };
  const openEdit = (r: ApiClientOrder) => {
    setEditing(r);
    setForm({
      clientName: r.clientName, clientId: r.clientId ?? "",
      module: r.module, description: r.description, amount: r.amount,
      paymentMethod: r.paymentMethod, status: r.status,
      orderDate: r.orderDate, notes: r.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.clientName.trim()) return toast.error("Client name is required");
    if (!form.description.trim()) return toast.error("Description is required");
    try {
      if (editing) {
        const res = await clientsApi.orders.update(editing.id, form);
        setData(d => d.map(i => i.id === editing.id ? res.data : i));
        toast.success("Order updated");
      } else {
        const res = await clientsApi.orders.create(form);
        setData(d => [...d, res.data]);
        toast.success("Order created");
      }
      setModalOpen(false);
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  const handleDelete = async (r: ApiClientOrder) => {
    try {
      await clientsApi.orders.delete(r.id);
      setData(d => d.filter(i => i.id !== r.id));
      toast.success("Order deleted");
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Client Orders</h3>
          <p className="text-sm text-muted-foreground">Track and manage client orders across all modules</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            filename={`client-orders${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Client Orders"
            rows={visibleData}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Order</Button>
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: stats.total,     color: "" },
          { label: "Pending",      value: stats.pending,   color: "text-amber-600" },
          { label: "Completed",    value: stats.completed, color: "text-green-600" },
          { label: "Revenue",      value: `Ksh ${stats.revenue.toLocaleString()}`, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["orderRef", "clientName", "description"]} searchPlaceholder="Search orders…" filters={filters} onView={r => setViewing(r)} onEdit={openEdit} onDelete={handleDelete} onFilteredChange={setVisibleData} pendingDeleteIds={pendingDeleteIds} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Order" : "New Order"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Create"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Client Name *</Label><Input value={form.clientName} onChange={e => set("clientName", e.target.value)} /></div>
            <div><Label>Module</Label>
              <Select value={form.module} onValueChange={v => set("module", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Order Date</Label><Input type="date" value={form.orderDate} onChange={e => set("orderDate", e.target.value)} /></div>
          </div>
          <div><Label>Description *</Label><Input value={form.description} onChange={e => set("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Amount (Ksh)</Label><Input type="number" value={form.amount} onChange={e => set("amount", Number(e.target.value))} /></div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Order Details" isView>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{viewing.orderRef}</Badge>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Client:</span> {viewing.clientName}</div>
              <div><span className="text-muted-foreground">Module:</span> {viewing.module}</div>
              <div><span className="text-muted-foreground">Date:</span> {viewing.orderDate}</div>
              <div><span className="text-muted-foreground">Amount:</span> Ksh {viewing.amount.toLocaleString()}</div>
              <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod}</div>
            </div>
            <div><span className="text-muted-foreground">Description:</span> {viewing.description}</div>
            {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
