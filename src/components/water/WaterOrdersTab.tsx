import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
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
import { waterApi, ApiWaterOrder, ApiWaterPricePackage } from "@/lib/waterApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];
const ORDER_STATUSES = ["pending", "processing", "dispatched", "delivered", "cancelled"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), client: "", clientPhone: "", litres: 0, pricePerLitre: 0, packageId: "",
  orderStatus: "pending", paymentStatus: "pending", paymentMethod: "Invoice",
  processedBy: "", deliveredBy: "", deliveryAddress: "", deliveryDate: "", notes: "",
};

export function WaterOrdersTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("water.orders.create");

  const [records, setRecords]   = useState<ApiWaterOrder[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("WaterOrder", stationId, records.length);
  const [visibleRecords, setVisibleRecords] = useState<ApiWaterOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiWaterOrder | null>(null);
  const [viewing, setViewing]   = useState<ApiWaterOrder | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [packages, setPackages] = useState<ApiWaterPricePackage[]>([]);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await waterApi.orders.list({ from: fromDate || undefined, to: toDate || undefined }, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load orders"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);
  useEffect(() => {
    if (!stationId) return;
    waterApi.pricePackages.list({ status: "active" }, stationId).then(r => setPackages(r.data ?? [])).catch(() => {});
  }, [stationId]);

  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    setForm(f => ({ ...f, packageId, pricePerLitre: pkg ? Math.round((pkg.price / pkg.litres) * 100) / 100 : f.pricePerLitre }));
  };

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: today() }); setModalOpen(true); };
  const openEdit = (o: ApiWaterOrder) => {
    setEditing(o);
    setForm({
      date: o.date.split("T")[0], client: o.client, clientPhone: o.clientPhone ?? "",
      litres: o.litres, pricePerLitre: o.pricePerLitre, packageId: "",
      orderStatus: o.orderStatus, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod,
      processedBy: o.processedBy ?? "", deliveredBy: o.deliveredBy ?? "",
      deliveryAddress: o.deliveryAddress ?? "", deliveryDate: o.deliveryDate?.split("T")[0] ?? "",
      notes: o.notes ?? "",
    });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const totalAmount = form.litres * form.pricePerLitre;

  const handleSave = async () => {
    if (!form.client) return toast.error("Client is required");
    if (!form.litres) return toast.error("Litres is required");
    setSaving(true);
    try {
      const payload = {
        ...form, totalAmount,
        clientPhone: form.clientPhone || undefined,
        deliveryDate: form.deliveryDate || undefined,
        deliveryAddress: form.deliveryAddress || undefined,
        processedBy: form.processedBy || undefined,
        deliveredBy: form.deliveredBy || undefined,
        notes: form.notes || undefined,
      };
      if (editing) {
        await waterApi.orders.update(editing.id, payload, stationId);
        toast.success("Order updated");
      } else {
        await waterApi.orders.create(payload, stationId);
        toast.success("Order created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save order"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (o: ApiWaterOrder) => {
    try {
      await waterApi.orders.delete(o.id, stationId);
      toast.success("Order deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const stats = {
    pending:    visibleRecords.filter(r => r.orderStatus === "pending").length,
    inProgress: visibleRecords.filter(r => ["processing", "dispatched"].includes(r.orderStatus)).length,
    delivered:  visibleRecords.filter(r => r.orderStatus === "delivered").length,
  };

  const columns: Column<ApiWaterOrder>[] = [
    { key: "orderNo",      label: "Order #",     sortable: true, render: o => <span className="font-mono text-xs">{o.orderNo}</span> },
    { key: "date",         label: "Date",         render: o => o.date.split("T")[0], sortable: true },
    { key: "client",       label: "Client",       sortable: true },
    { key: "litres",       label: "Litres (L)",   render: o => o.litres.toLocaleString(), sortable: true },
    { key: "totalAmount",  label: "Total (Ksh)",  render: o => <span className="font-mono">Ksh {o.totalAmount.toLocaleString()}</span>, sortable: true },
    { key: "orderStatus",  label: "Order",        render: o => <StatusBadge status={o.orderStatus} /> },
    { key: "paymentStatus",label: "Payment",      render: o => <StatusBadge status={o.paymentStatus} /> },
    { key: "deliveredBy",  label: "Delivered By", render: o => o.deliveredBy || "—" },
  ];

  const filters: FilterOption[] = [
    { key: "orderStatus",  label: "Status",  options: ORDER_STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })) },
    { key: "paymentStatus",label: "Payment", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }] },
  ];

  const exportColumns: ExportColumn<ApiWaterOrder>[] = [
    { label: "Order #",        value: o => o.orderNo },
    { label: "Date",           value: o => o.date.split("T")[0] },
    { label: "Client",         value: o => o.client },
    { label: "Phone",          value: o => o.clientPhone || "—" },
    { label: "Litres (L)",     value: o => o.litres },
    { label: "Price/L (Ksh)",  value: o => o.pricePerLitre },
    { label: "Total (Ksh)",    value: o => o.totalAmount },
    { label: "Order Status",   value: o => o.orderStatus },
    { label: "Payment Status", value: o => o.paymentStatus },
    { label: "Payment Method", value: o => o.paymentMethod },
    { label: "Processed By",   value: o => o.processedBy || "—" },
    { label: "Delivered By",   value: o => o.deliveredBy || "—" },
    { label: "Delivery Date",  value: o => o.deliveryDate?.split("T")[0] || "—" },
    { label: "Delivery Address", value: o => o.deliveryAddress || "—" },
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
        <p className="text-sm text-muted-foreground">Client water orders and delivery tracking</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`water-orders${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Water Orders"
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
          <div><Label>Client *</Label><Input value={form.client} onChange={e => set("client", e.target.value)} /></div>
          <div><Label>Client Phone</Label><Input value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} /></div>
          <div><Label>Litres *</Label><Input type="number" value={form.litres || ""} onChange={e => set("litres", +e.target.value)} /></div>
          <div>
            <Label>Package</Label>
            <Select value={form.packageId} onValueChange={handlePackageChange}>
              <SelectTrigger><SelectValue placeholder={packages.length ? "Select package" : "No packages set up"} /></SelectTrigger>
              <SelectContent>
                {packages.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — Ksh {(p.price / p.litres).toFixed(2)}/L</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Price/Litre (Ksh)</Label>
            <Input type="number" step="0.01" value={form.pricePerLitre || ""} onChange={e => set("pricePerLitre", +e.target.value)} />
            {form.packageId && <p className="text-xs text-muted-foreground mt-1">Auto-filled from package pricing — edit if needed</p>}
          </div>
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

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Order Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Order #:</span> <span className="font-mono">{viewing.orderNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Client:</span> {viewing.client}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.clientPhone || "—"}</div>
            <div><span className="text-muted-foreground">Litres:</span> {viewing.litres.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Price/L:</span> Ksh {viewing.pricePerLitre}</div>
            <div><span className="text-muted-foreground">Total:</span> <strong>Ksh {viewing.totalAmount.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Order Status:</span> <StatusBadge status={viewing.orderStatus} /></div>
            <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} /></div>
            <div><span className="text-muted-foreground">Processed By:</span> {viewing.processedBy || "—"}</div>
            <div><span className="text-muted-foreground">Delivered By:</span> {viewing.deliveredBy || "—"}</div>
            {viewing.deliveryDate && <div><span className="text-muted-foreground">Delivery Date:</span> {viewing.deliveryDate.split("T")[0]}</div>}
            {viewing.deliveryAddress && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {viewing.deliveryAddress}</div>}
            {viewing.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
