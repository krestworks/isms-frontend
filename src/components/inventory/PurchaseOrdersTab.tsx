import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, X, Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermission, guardAction } from "@/lib/actionPermissions";
import { inventoryApi, ApiPurchaseOrder, ApiPOItem, ApiSupplier, ApiInventoryItem } from "@/lib/inventoryApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const STATUS_CONFIG: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent:  "bg-blue-100 text-blue-800",
  partial: "bg-amber-100 text-amber-800",
  received: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

interface NewPOLine { itemId: string; itemName: string; unit: string; category: string; orderedQty: number; unitCost: number; }

const emptyLine: NewPOLine = { itemId: "", itemName: "", unit: "pcs", category: "general", orderedQty: 1, unitCost: 0 };

export default function PurchaseOrdersTab() {
  const { stationId } = useActiveStation();
  const [data, setData]           = useState<ApiPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [items, setItems]         = useState<ApiInventoryItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [modalOpen, setModal]     = useState(false);
  const [viewing, setViewing]     = useState<ApiPurchaseOrder | null>(null);
  const [visibleData, setVisibleData] = useState<ApiPurchaseOrder[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const [supplierId, setSupplierId]   = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes]             = useState("");
  const [lines, setLines]             = useState<NewPOLine[]>([{ ...emptyLine }]);

  const canCreate = usePermission("inventory.po.create");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, suppRes, itemRes] = await Promise.all([
        inventoryApi.po.list(stationId, { from: fromDate || undefined, to: toDate || undefined } as any),
        inventoryApi.suppliers.list(stationId),
        inventoryApi.items.list(stationId),
      ]);
      setData(poRes.data ?? []);
      setSuppliers(suppRes.data ?? []);
      setItems(itemRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load purchase orders"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setSupplierId(""); setSupplierName(""); setExpectedDate(""); setNotes("");
    setLines([{ ...emptyLine }]);
    setModal(true);
  };

  const addLine = () => setLines(l => [...l, { ...emptyLine }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine = (i: number, k: keyof NewPOLine, v: any) =>
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [k]: v } : ln));
  const selectItem = (lineIdx: number, itemId: string) => {
    const item = items.find(x => x.id === itemId);
    if (!item) return;
    setLines(l => l.map((ln, i) => i === lineIdx
      ? { ...ln, itemId, itemName: item.name, unit: item.unit, category: item.category, unitCost: item.costPrice }
      : ln));
  };

  const lineTotal = (l: NewPOLine) => l.orderedQty * l.unitCost;
  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const handleSave = async () => {
    if (!supplierId && !supplierName.trim()) { toast.error("Select or enter a supplier name"); return; }
    if (lines.some(l => !l.itemName.trim() || l.orderedQty <= 0)) {
      toast.error("All lines must have an item name and quantity > 0"); return;
    }
    if (!guardAction("inventory.po.create", "create a purchase order")) return;
    setSaving(true);
    try {
      const res = await inventoryApi.po.create({
        supplierId: supplierId || undefined,
        supplierName: supplierId ? undefined : supplierName,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: lines.map(l => ({
          itemId: l.itemId || undefined,
          itemName: l.itemName,
          category: l.category,
          unit: l.unit,
          orderedQty: l.orderedQty,
          unitCost: l.unitCost,
          totalCost: lineTotal(l),
        })),
      }, stationId);
      setData(d => [res.data, ...d]);
      toast.success(`PO ${res.data.poNumber} created`);
      setModal(false);
    } catch (e: any) { toast.error(e?.message || "Failed to create PO"); }
    finally { setSaving(false); }
  };

  const markSent = async (po: ApiPurchaseOrder) => {
    if (po.status !== "draft") return;
    try {
      const res = await inventoryApi.po.update(po.id, { status: "sent" });
      setData(d => d.map(x => x.id === po.id ? res.data : x));
      if (viewing?.id === po.id) setViewing(res.data);
      toast.success("PO marked as sent to supplier");
    } catch (e: any) { toast.error(e?.message || "Update failed"); }
  };

  const columns: Column<ApiPurchaseOrder>[] = [
    { key: "poNumber",    label: "PO #",     render: p => <span className="font-mono text-sm">{p.poNumber}</span> },
    { key: "supplierName", label: "Supplier", render: p => p.supplier?.name ?? p.supplierName ?? "—" },
    { key: "orderDate",   label: "Order Date", render: p => new Date(p.orderDate).toLocaleDateString(), sortable: true },
    { key: "expectedDate",label: "Expected",   render: p => p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : "—" },
    { key: "totalAmount", label: "Total",     render: p => `Ksh ${p.totalAmount.toLocaleString()}` },
    { key: "status", label: "Status", render: p => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_CONFIG[p.status] ?? "bg-gray-100 text-gray-800"}`}>
        {p.status}
      </span>
    )},
  ];

  const exportColumns: ExportColumn<ApiPurchaseOrder>[] = [
    { label: "PO #",      value: p => p.poNumber },
    { label: "Supplier",  value: p => p.supplier?.name ?? p.supplierName ?? "—" },
    { label: "Order Date",value: p => new Date(p.orderDate).toLocaleDateString() },
    { label: "Expected",  value: p => p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : "—" },
    { label: "Total",     value: p => p.totalAmount },
    { label: "Status",    value: p => p.status },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Purchase Orders</h3>
          <p className="text-sm text-muted-foreground">Order stock from suppliers</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            filename={`purchase-orders${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Purchase Orders"
            rows={visibleData}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
          {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New PO</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {(["draft", "sent", "partial", "received", "cancelled"] as const).map(s => (
          <Card key={s}><CardContent className="p-3">
            <p className="text-xs text-muted-foreground capitalize">{s}</p>
            <p className="text-xl font-bold">{visibleData.filter(d => d.status === s).length}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={data} columns={columns} loading={loading}
        searchKeys={["poNumber", "supplierName"]} searchPlaceholder="Search POs..."
        onView={po => setViewing(po)}
        onFilteredChange={setVisibleData}
        rowActions={(po) => (
          <div className="flex gap-1">
            {po.status === "draft" && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markSent(po)}>
                <Send className="h-3 w-3 mr-1" />Send
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewing(po)}>
              <Eye className="h-3 w-3 mr-1" />View
            </Button>
          </div>
        )}
      />

      {/* Create PO modal */}
      <ModalForm open={modalOpen} onClose={() => setModal(false)} title="New Purchase Order"
        onSubmit={handleSave} submitLabel={saving ? "Creating…" : "Create PO"}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Supplier</Label>
              <Select value={supplierId || "__manual__"} onValueChange={v => {
                if (v === "__manual__") { setSupplierId(""); }
                else { setSupplierId(v); setSupplierName(suppliers.find(s => s.id === v)?.name ?? ""); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">Enter manually</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!supplierId && (
              <div><Label>Supplier Name *</Label><Input value={supplierName} onChange={e => setSupplierName(e.target.value)} /></div>
            )}
            <div><Label>Expected Delivery</Label><Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Order Lines</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Item</th>
                    <th className="text-left px-3 py-2 font-medium w-20">Unit</th>
                    <th className="text-right px-3 py-2 font-medium w-20">Qty</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Unit Cost</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5">
                        <Select value={line.itemId || "__manual__"} onValueChange={v => {
                          if (v === "__manual__") setLine(i, "itemId", "");
                          else selectItem(i, v);
                        }}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__manual__">Enter manually</SelectItem>
                            {items.map(it => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {!line.itemId && (
                          <Input className="mt-1 h-7 text-xs" placeholder="Item name" value={line.itemName} onChange={e => setLine(i, "itemName", e.target.value)} />
                        )}
                      </td>
                      <td className="px-2 py-1.5"><Input className="h-8 w-16 text-xs" value={line.unit} onChange={e => setLine(i, "unit", e.target.value)} /></td>
                      <td className="px-2 py-1.5"><Input type="number" min={1} className="h-8 w-20 text-right text-xs" value={line.orderedQty} onChange={e => setLine(i, "orderedQty", Number(e.target.value))} /></td>
                      <td className="px-2 py-1.5"><Input type="number" min={0} className="h-8 w-24 text-right text-xs" value={line.unitCost} onChange={e => setLine(i, "unitCost", Number(e.target.value))} /></td>
                      <td className="px-3 py-1.5 text-right text-xs font-medium">Ksh {lineTotal(line).toLocaleString()}</td>
                      <td className="px-1 py-1.5">
                        {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold">Total</td>
                    <td className="px-3 py-2 text-right font-bold">Ksh {grandTotal.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
      </ModalForm>

      {/* View PO dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Purchase Order — {viewing?.poNumber}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_CONFIG[viewing?.status ?? "draft"] ?? ""}`}>
                {viewing?.status}
              </span>
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-muted-foreground text-xs">Supplier</p><p className="font-medium">{viewing.supplier?.name ?? viewing.supplierName ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Order Date</p><p>{new Date(viewing.orderDate).toLocaleDateString()}</p></div>
                {viewing.expectedDate && <div><p className="text-muted-foreground text-xs">Expected</p><p>{new Date(viewing.expectedDate).toLocaleDateString()}</p></div>}
                {viewing.receivedDate && <div><p className="text-muted-foreground text-xs">Received</p><p>{new Date(viewing.receivedDate).toLocaleDateString()}</p></div>}
              </div>
              <table className="w-full border rounded-lg overflow-hidden text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-right px-3 py-2">Ordered</th>
                    <th className="text-right px-3 py-2">Received</th>
                    <th className="text-right px-3 py-2">Unit Cost</th>
                    <th className="text-right px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {viewing.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.itemName}</td>
                      <td className="px-3 py-2 text-right">{item.orderedQty} {item.unit}</td>
                      <td className="px-3 py-2 text-right">{item.receivedQty}</td>
                      <td className="px-3 py-2 text-right">Ksh {item.unitCost.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">Ksh {item.totalCost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right font-semibold">Total</td>
                    <td className="px-3 py-2 text-right font-bold">Ksh {viewing.totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
              {viewing.notes && <div><p className="text-muted-foreground text-xs">Notes</p><p>{viewing.notes}</p></div>}
              {viewing.status === "draft" && (
                <Button className="w-full" onClick={() => { markSent(viewing); setViewing(null); }}>
                  <Send className="h-4 w-4 mr-2" />Mark as Sent to Supplier
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
