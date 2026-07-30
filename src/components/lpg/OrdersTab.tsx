import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { lpgApi, ApiLpgOrder } from "@/lib/lpgApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";
import { openPdfInNewTab, downloadPdf } from "@/lib/pdfDoc";

const SIZES = ["6kg", "13kg", "22.5kg", "25kg", "50kg"];
const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];
const ORDER_STATUSES = ["pending", "processing", "dispatched", "delivered", "cancelled"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), client: "", clientPhone: "", cylinderSize: "13kg",
  quantity: 1, unitPrice: 0, orderStatus: "pending", paymentStatus: "pending",
  paymentMethod: "Cash", processedBy: "", deliveredBy: "", deliveryAddress: "",
  deliveryDate: "", notes: "",
};

export function OrdersTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("lpg.orders.manage");

  const [records, setRecords]   = useState<ApiLpgOrder[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("LpgOrder", stationId, records.length);
  const [visibleRecords, setVisibleRecords] = useState<ApiLpgOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiLpgOrder | null>(null);
  const [viewing, setViewing]   = useState<ApiLpgOrder | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await lpgApi.orders.list({ from: fromDate || undefined, to: toDate || undefined }, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load orders"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: today() }); setModalOpen(true); };
  const openEdit = (o: ApiLpgOrder) => {
    setEditing(o);
    setForm({
      date: o.date.split("T")[0], client: o.client, clientPhone: o.clientPhone ?? "",
      cylinderSize: o.cylinderSize, quantity: o.quantity, unitPrice: o.unitPrice,
      orderStatus: o.orderStatus, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod,
      processedBy: o.processedBy ?? "", deliveredBy: o.deliveredBy ?? "",
      deliveryAddress: o.deliveryAddress ?? "", deliveryDate: o.deliveryDate?.split("T")[0] ?? "",
      notes: o.notes ?? "",
    });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => {
    const next = { ...f, [k]: v };
    return next;
  });

  const totalAmount = form.quantity * form.unitPrice;

  const handleSave = async () => {
    if (!form.client) return toast.error("Client is required");
    if (!form.unitPrice) return toast.error("Unit price is required");
    setSaving(true);
    try {
      const payload = { ...form, totalAmount, deliveryDate: form.deliveryDate || undefined, clientPhone: form.clientPhone || undefined };
      if (editing) {
        await lpgApi.orders.update(editing.id, payload, stationId);
        toast.success("Order updated");
      } else {
        await lpgApi.orders.create(payload, stationId);
        toast.success("Order created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save order"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (o: ApiLpgOrder) => {
    try {
      await lpgApi.orders.delete(o.id, stationId);
      toast.success("Order deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const stats = {
    pending:    visibleRecords.filter(r => r.orderStatus === "pending").length,
    inProgress: visibleRecords.filter(r => ["processing", "dispatched"].includes(r.orderStatus)).length,
    delivered:  visibleRecords.filter(r => r.orderStatus === "delivered").length,
  };

  const columns: Column<ApiLpgOrder>[] = [
    { key: "orderNo",      label: "Order #",     sortable: true, render: o => <span className="font-mono text-xs">{o.orderNo}</span> },
    { key: "date",         label: "Date",         render: o => o.date.split("T")[0], sortable: true },
    { key: "client",       label: "Client",       sortable: true },
    { key: "cylinderSize", label: "Size",         sortable: true },
    { key: "quantity",     label: "Qty" },
    { key: "totalAmount",  label: "Amount (Ksh)", sortable: true, render: o => <span className="font-mono">Ksh {o.totalAmount.toLocaleString()}</span> },
    { key: "orderStatus",  label: "Order",        render: o => <StatusBadge status={o.orderStatus} /> },
    { key: "paymentStatus",label: "Payment",      render: o => <StatusBadge status={o.paymentStatus} /> },
    { key: "deliveredBy",  label: "Delivered By", render: o => o.deliveredBy || "—" },
  ];

  const filters: FilterOption[] = [
    { key: "orderStatus",  label: "Status",  options: ORDER_STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })) },
    { key: "paymentStatus",label: "Payment", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }] },
    { key: "cylinderSize", label: "Size",    options: SIZES.map(s => ({ label: s, value: s })) },
  ];

  const exportColumns: ExportColumn<ApiLpgOrder>[] = [
    { label: "Order #",        value: o => o.orderNo },
    { label: "Date",           value: o => o.date.split("T")[0] },
    { label: "Client",         value: o => o.client },
    { label: "Phone",          value: o => o.clientPhone || "—" },
    { label: "Size",           value: o => o.cylinderSize },
    { label: "Qty",            value: o => o.quantity, total: rows => rows.reduce((sum, o) => sum + o.quantity, 0) },
    { label: "Unit Price (Ksh)",value: o => o.unitPrice },
    { label: "Total (Ksh)",    value: o => o.totalAmount, total: rows => rows.reduce((sum, o) => sum + o.totalAmount, 0) },
    { label: "Order Status",   value: o => o.orderStatus },
    { label: "Payment Status", value: o => o.paymentStatus },
    { label: "Payment Method", value: o => o.paymentMethod },
    { label: "Processed By",   value: o => o.processedBy || "—" },
    { label: "Delivered By",   value: o => o.deliveredBy || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
          <p className="text-xs text-muted-foreground">Delivered</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Client orders, processing, and delivery tracking</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`lpg-orders${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="LPG Orders"
            rows={visibleRecords}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New Order</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["orderNo", "client", "deliveredBy", "processedBy"]}
        searchPlaceholder="Search orders..."
        filters={filters}
        onView={o => setViewing(o)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        onFilteredChange={setVisibleRecords}
        pendingDeleteIds={pendingDeleteIds}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Order" : "New Order"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Cylinder Size</Label>
            <Select value={form.cylinderSize} onValueChange={v => set("cylinderSize", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Client *</Label><Input value={form.client} onChange={e => set("client", e.target.value)} /></div>
          <div><Label>Client Phone</Label><Input value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} /></div>
          <div><Label>Quantity</Label><Input type="number" value={form.quantity || ""} onChange={e => set("quantity", +e.target.value)} /></div>
          <div><Label>Unit Price (Ksh) *</Label><Input type="number" value={form.unitPrice || ""} onChange={e => set("unitPrice", +e.target.value)} /></div>
          <div><Label>Total (Ksh)</Label><Input value={`Ksh ${totalAmount.toLocaleString()}`} disabled className="font-mono" /></div>
          <div><Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Payment Status</Label>
            <Select value={form.paymentStatus} onValueChange={v => set("paymentStatus", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Order Status</Label>
            <Select value={form.orderStatus} onValueChange={v => set("orderStatus", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Processed By</Label><Input value={form.processedBy} onChange={e => set("processedBy", e.target.value)} /></div>
          <div><Label>Delivered By</Label><Input value={form.deliveredBy} onChange={e => set("deliveredBy", e.target.value)} /></div>
          <div><Label>Delivery Date</Label><Input type="date" value={form.deliveryDate} onChange={e => set("deliveryDate", e.target.value)} /></div>
          <div className="col-span-2"><Label>Delivery Address</Label><Input value={form.deliveryAddress} onChange={e => set("deliveryAddress", e.target.value)} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Order Details" isView
        footerExtra={viewing?.saleId ? <>
          <Button variant="outline" size="sm" onClick={() => openPdfInNewTab(`/lpg/sales/${viewing.saleId}/receipt.pdf`)}><Printer className="h-3.5 w-3.5 mr-1.5" />Print Receipt</Button>
          <Button variant="outline" size="sm" onClick={() => downloadPdf(`/lpg/sales/${viewing.saleId}/receipt.pdf`, `${viewing.orderNo}.pdf`)}><Download className="h-3.5 w-3.5 mr-1.5" />Download</Button>
        </> : undefined}>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Order #:</span> <span className="font-mono">{viewing.orderNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Client:</span> {viewing.client}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.clientPhone || "—"}</div>
            <div><span className="text-muted-foreground">Size:</span> {viewing.cylinderSize}</div>
            <div><span className="text-muted-foreground">Qty:</span> {viewing.quantity}</div>
            <div><span className="text-muted-foreground">Unit Price:</span> Ksh {viewing.unitPrice.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Total:</span> <strong>Ksh {viewing.totalAmount.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Order Status:</span> <StatusBadge status={viewing.orderStatus} /></div>
            <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} /></div>
            <div><span className="text-muted-foreground">Processed By:</span> {viewing.processedBy || "—"}</div>
            <div><span className="text-muted-foreground">Delivered By:</span> {viewing.deliveredBy || "—"}</div>
            {viewing.deliveryDate && <div><span className="text-muted-foreground">Delivery Date:</span> {viewing.deliveryDate.split("T")[0]}</div>}
            {viewing.deliveryAddress && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {viewing.deliveryAddress}</div>}
            {viewing.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
            {viewing.saleId && <div className="col-span-2 text-xs text-muted-foreground">This order has been delivered and converted to a sale.</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
