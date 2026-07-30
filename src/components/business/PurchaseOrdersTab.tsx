import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, PackageCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizPurchaseOrder, ApiBizSupplier, ApiBizProduct, ApiBizPOItem } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

interface Props { business: ApiBizBusiness; }

const today = () => new Date().toISOString().split("T")[0];
const emptyForm = { supplierId: "", supplierName: "", orderDate: today(), expectedDate: "", notes: "", status: "pending" };

export function PurchaseOrdersTab({ business }: Props) {
  const can = usePermissions();
  const canManage = can("business.orders.create");

  const [records,   setRecords]   = useState<ApiBizPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<ApiBizSupplier[]>([]);
  const [products,  setProducts]  = useState<ApiBizProduct[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<ApiBizPurchaseOrder | null>(null);
  const [viewing,   setViewing]   = useState<ApiBizPurchaseOrder | null>(null);
  const [form,      setForm]      = useState(emptyForm);
  const [items,     setItems]     = useState<ApiBizPOItem[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; description?: string; confirmLabel?: string; onConfirm: () => void } | null>(null);
  const [visibleRecords, setVisibleRecords] = useState<ApiBizPurchaseOrder[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, sRes, pRes] = await Promise.all([
        bizApi.purchaseOrders.list(business.id, undefined, fromDate || undefined, toDate || undefined),
        bizApi.suppliers.list(business.id),
        bizApi.products.list(business.id),
      ]);
      setRecords(oRes.data ?? []);
      setSuppliers(sRes.data ?? []);
      setProducts(pRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [business.id, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const pendingDeleteIds = usePendingDeleteIds("BizPurchaseOrder", business.stationId, records.length);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, orderDate: today() });
    setItems([{ productName: "", qty: 1, unitCost: 0, totalCost: 0 }]);
    setModalOpen(true);
  };

  const openEdit = (o: ApiBizPurchaseOrder) => {
    setEditing(o);
    setForm({
      supplierId: o.supplierId ?? "", supplierName: o.supplierName ?? "",
      orderDate: o.orderDate, expectedDate: o.expectedDate ?? "", notes: o.notes ?? "", status: o.status,
    });
    setItems(o.items?.length ? o.items : [{ productName: "", qty: 1, unitCost: 0, totalCost: 0 }]);
    setModalOpen(true);
  };

  // line-item helpers
  const addLine    = () => setItems(prev => [...prev, { productName: "", qty: 1, unitCost: 0, totalCost: 0 }]);
  const removeLine = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, key: keyof ApiBizPOItem, val: any) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [key]: val };
      updated.totalCost = updated.qty * updated.unitCost;
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!items.length || items.some(i => !i.productName)) return toast.error("All line items need a product name");
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === form.supplierId);
      const payload: any = {
        ...form,
        businessId: business.id,
        supplierName: supplier?.name ?? form.supplierName,
        items,
      };
      if (!payload.supplierId) delete payload.supplierId;
      if (!payload.expectedDate) delete payload.expectedDate;
      if (editing) { await bizApi.purchaseOrders.update(editing.id, payload); toast.success("Order updated"); }
      else         { await bizApi.purchaseOrders.create(payload);              toast.success("Order created"); }
      setModalOpen(false); load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleReceive = (o: ApiBizPurchaseOrder) => {
    setConfirmDlg({
      title: `Mark order ${o.orderRef} as received?`,
      description: "Stock quantities will be added to inventory based on the order line items.",
      confirmLabel: "Mark Received",
      onConfirm: async () => {
        try {
          await bizApi.purchaseOrders.receive(o.id);
          toast.success("Order received — stock updated");
          load();
        } catch (e: any) { toast.error(e?.message || "Failed to receive"); }
      },
    });
  };

  const handleDelete = async (o: ApiBizPurchaseOrder) => {
    try { await bizApi.purchaseOrders.delete(o.id); toast.success("Order deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const subtotal = items.reduce((s, i) => s + (i.totalCost ?? 0), 0);

  const columns: Column<ApiBizPurchaseOrder>[] = [
    { key: "orderRef",    label: "Order Ref",  render: o => <span className="font-mono text-xs">{o.orderRef}</span>, sortable: true },
    { key: "orderDate",   label: "Date",        sortable: true },
    { key: "supplierName",label: "Supplier",    render: o => o.supplierName || "—" },
    { key: "totalAmount", label: "Total",       render: o => `Ksh ${o.totalAmount.toLocaleString()}`, sortable: true },
    { key: "status",      label: "Status",      render: o => <StatusBadge status={o.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [
      { label: "Pending", value: "pending" },
      { label: "Received", value: "received" },
      { label: "Partial", value: "partial" },
      { label: "Cancelled", value: "cancelled" },
    ]},
  ];

  const exportColumns: ExportColumn<ApiBizPurchaseOrder>[] = [
    { label: "Order Ref", value: o => o.orderRef },
    { label: "Date",      value: o => o.orderDate },
    { label: "Supplier",  value: o => o.supplierName || "—" },
    { label: "Total",     value: o => o.totalAmount, total: rows => rows.reduce((sum, o) => sum + o.totalAmount, 0) },
    { label: "Status",    value: o => o.status },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Supplier purchase orders</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`purchase-orders${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Purchase Orders"
            rows={visibleRecords}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New Order</Button>
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <DataTable
        data={records} columns={columns} filters={filters}
        searchKeys={["orderRef","supplierName"]} searchPlaceholder="Search orders..."
        onView={o => setViewing(o)}
        onEdit={openEdit}
        onDelete={canManage ? handleDelete : undefined}
        onFilteredChange={setVisibleRecords}
        pendingDeleteIds={pendingDeleteIds}
        extraActions={[{
          label: "Receive Order",
          icon: PackageCheck,
          onClick: handleReceive,
          show: (o: ApiBizPurchaseOrder) => o.status === "pending" || o.status === "partial",
        }]}
      />

      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        confirmLabel={confirmDlg?.confirmLabel ?? "Confirm"}
        variant="default"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />

      {/* Create / Edit */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Purchase Order" : "New Purchase Order"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Create"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Supplier</Label>
              <Select value={form.supplierId || "__none__"} onValueChange={v => set("supplierId", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Manual Entry —</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!form.supplierId && <div><Label>Supplier Name</Label><Input value={form.supplierName} onChange={e => set("supplierName", e.target.value)} /></div>}
            <div><Label>Order Date</Label><Input type="date" value={form.orderDate} onChange={e => set("orderDate", e.target.value)} /></div>
            <div><Label>Expected Date</Label><Input type="date" value={form.expectedDate} onChange={e => set("expectedDate", e.target.value)} /></div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center">
                  <div className="col-span-4">
                    <Select value={item.productId || "__none__"} onValueChange={v => {
                      const pid = v === "__none__" ? "" : v;
                      const p = products.find(p => p.id === pid);
                      updateLine(i, "productId" as any, pid);
                      if (p) updateLine(i, "productName", p.name);
                    }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Manual</SelectItem>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!item.productId && <Input className="h-7 text-xs mt-1" placeholder="Product name" value={item.productName} onChange={e => updateLine(i, "productName", e.target.value)} />}
                  </div>
                  <div className="col-span-3"><Input className="h-8 text-xs" type="number" placeholder="Qty" value={item.qty || ""} onChange={e => updateLine(i, "qty", +e.target.value)} /></div>
                  <div className="col-span-3"><Input className="h-8 text-xs" type="number" placeholder="Unit Cost" value={item.unitCost || ""} onChange={e => updateLine(i, "unitCost", +e.target.value)} /></div>
                  <div className="col-span-1 text-xs text-right text-muted-foreground">{item.totalCost.toLocaleString()}</div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2 text-sm font-semibold">Total: Ksh {subtotal.toLocaleString()}</div>
          </div>

          <div><Label>Notes</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      {/* View */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Order Details" isView>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Ref:</span> <span className="font-mono">{viewing.orderRef}</span></div>
              <div><span className="text-muted-foreground">Date:</span> {viewing.orderDate}</div>
              <div><span className="text-muted-foreground">Supplier:</span> {viewing.supplierName || "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            </div>
            <table className="w-full text-xs border-t pt-2">
              <thead><tr className="text-muted-foreground"><th className="text-left py-1">Product</th><th className="text-right">Qty</th><th className="text-right">Unit Cost</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {viewing.items.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{item.productName}</td>
                    <td className="text-right">{item.qty}</td>
                    <td className="text-right">Ksh {item.unitCost.toLocaleString()}</td>
                    <td className="text-right font-medium">Ksh {item.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>Ksh {viewing.totalAmount.toLocaleString()}</span></div>
            {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
