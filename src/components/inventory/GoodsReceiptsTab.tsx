import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, CheckCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermission, guardAction } from "@/lib/actionPermissions";
import { inventoryApi, ApiGoodsReceipt, ApiPurchaseOrder, ApiInventoryItem } from "@/lib/inventoryApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { useSession } from "@/data/sessionStore";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const STATUS_CONFIG: Record<string, string> = {
  draft:    "bg-gray-100 text-gray-800",
  verified: "bg-blue-100 text-blue-800",
  posted:   "bg-green-100 text-green-800",
};

interface GRNLine { itemId: string; itemName: string; unit: string; category: string; expectedQty: number; receivedQty: number; unitCost: number; notes: string; }

const emptyLine: GRNLine = { itemId: "", itemName: "", unit: "pcs", category: "general", expectedQty: 0, receivedQty: 1, unitCost: 0, notes: "" };

export default function GoodsReceiptsTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();
  const [data, setData]     = useState<ApiGoodsReceipt[]>([]);
  const [pos, setPOs]       = useState<ApiPurchaseOrder[]>([]);
  const [items, setItems]   = useState<ApiInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [modalOpen, setModal] = useState(false);
  const [viewing, setViewing] = useState<ApiGoodsReceipt | null>(null);
  const [visibleData, setVisibleData] = useState<ApiGoodsReceipt[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const [poId, setPoId]             = useState("");
  const [supplierName, setSupName]  = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes]           = useState("");
  const [lines, setLines]           = useState<GRNLine[]>([{ ...emptyLine }]);

  const canCreate = usePermission("inventory.grn.create");
  const canPost   = usePermission("inventory.grn.post");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [grnRes, poRes, itemRes] = await Promise.all([
        inventoryApi.grn.list(stationId, { from: fromDate || undefined, to: toDate || undefined } as any),
        inventoryApi.po.list(stationId, { status: "sent", limit: 100 } as any),
        inventoryApi.items.list(stationId),
      ]);
      setData(grnRes.data ?? []);
      setPOs(poRes.data ?? []);
      setItems(itemRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load GRNs"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setPoId(""); setSupName(""); setNotes("");
    setReceiptDate(new Date().toISOString().split("T")[0]);
    setLines([{ ...emptyLine }]);
    setModal(true);
  };

  const selectPO = (id: string) => {
    setPoId(id);
    const po = pos.find(p => p.id === id);
    if (!po) return;
    setSupName(po.supplier?.name ?? po.supplierName ?? "");
    if (po.items.length > 0) {
      setLines(po.items.map(item => ({
        itemId: item.itemId ?? "",
        itemName: item.itemName,
        unit: item.unit,
        category: item.category,
        expectedQty: item.orderedQty - item.receivedQty,
        receivedQty: item.orderedQty - item.receivedQty,
        unitCost: item.unitCost,
        notes: "",
      })));
    }
  };

  const selectItem = (lineIdx: number, itemId: string) => {
    const item = items.find(x => x.id === itemId);
    if (!item) return;
    setLines(l => l.map((ln, i) => i === lineIdx
      ? { ...ln, itemId, itemName: item.name, unit: item.unit, category: item.category, unitCost: item.costPrice }
      : ln));
  };

  const setLine = (i: number, k: keyof GRNLine, v: any) =>
    setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [k]: v } : ln));
  const addLine  = () => setLines(l => [...l, { ...emptyLine }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!supplierName.trim() && !poId) { toast.error("Specify a supplier or link to a PO"); return; }
    if (lines.some(l => !l.itemName.trim() || l.receivedQty <= 0)) {
      toast.error("All lines need an item name and received qty > 0"); return;
    }
    if (!guardAction("inventory.grn.create", "create a GRN")) return;
    setSaving(true);
    try {
      const res = await inventoryApi.grn.create({
        poId: poId || undefined,
        supplierName: supplierName || undefined,
        receiptDate,
        notes: notes || undefined,
        receivedBy: user?.name ?? "System",
        items: lines.map(l => ({
          itemId: l.itemId || undefined,
          itemName: l.itemName,
          category: l.category,
          unit: l.unit,
          expectedQty: l.expectedQty,
          receivedQty: l.receivedQty,
          unitCost: l.unitCost,
          totalCost: l.receivedQty * l.unitCost,
          notes: l.notes || undefined,
        })),
      }, stationId);
      setData(d => [res.data, ...d]);
      toast.success(`GRN ${res.data.grnNumber} created`);
      setModal(false);
    } catch (e: any) { toast.error(e?.message || "Failed to create GRN"); }
    finally { setSaving(false); }
  };

  const handlePost = async (grn: ApiGoodsReceipt) => {
    if (!guardAction("inventory.grn.post", "post a GRN")) return;
    const confirmed = window.confirm(
      `Post GRN ${grn.grnNumber}?\n\nThis will update stock levels and cannot be reversed.`
    );
    if (!confirmed) return;
    try {
      const res = await inventoryApi.grn.post(grn.id);
      setData(d => d.map(x => x.id === grn.id ? res.data : x));
      if (viewing?.id === grn.id) setViewing(res.data);
      toast.success(`GRN ${grn.grnNumber} posted — stock levels updated`);
    } catch (e: any) { toast.error(e?.message || "Post failed"); }
  };

  const columns: Column<ApiGoodsReceipt>[] = [
    { key: "grnNumber",    label: "GRN #",      render: g => <span className="font-mono text-sm">{g.grnNumber}</span> },
    { key: "supplierName", label: "Supplier",   render: g => g.supplierName ?? g.po?.poNumber ?? "—" },
    { key: "receiptDate",  label: "Receipt Date", render: g => new Date(g.receiptDate).toLocaleDateString(), sortable: true },
    { key: "totalAmount",  label: "Total",      render: g => `Ksh ${g.totalAmount.toLocaleString()}` },
    { key: "receivedBy",   label: "Received By", render: g => g.receivedBy ?? "—" },
    { key: "status", label: "Status", render: g => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_CONFIG[g.status] ?? "bg-gray-100 text-gray-800"}`}>
        {g.status}
      </span>
    )},
  ];

  const grandTotal = lines.reduce((s, l) => s + l.receivedQty * l.unitCost, 0);

  const exportColumns: ExportColumn<ApiGoodsReceipt>[] = [
    { label: "GRN #",        value: g => g.grnNumber },
    { label: "Supplier",     value: g => g.supplierName ?? g.po?.poNumber ?? "—" },
    { label: "Receipt Date", value: g => new Date(g.receiptDate).toLocaleDateString() },
    { label: "Total",        value: g => g.totalAmount },
    { label: "Received By",  value: g => g.receivedBy ?? "—" },
    { label: "Status",       value: g => g.status },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Goods Receipts (GRN)</h3>
          <p className="text-sm text-muted-foreground">Record received goods and post to update stock</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            filename={`goods-receipts${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Goods Receipts"
            rows={visibleData}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
          {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New GRN</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["draft", "verified", "posted"] as const).map(s => (
          <Card key={s}><CardContent className="p-3">
            <p className="text-xs text-muted-foreground capitalize">{s}</p>
            <p className="text-xl font-bold">{visibleData.filter(d => d.status === s).length}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={data} columns={columns} loading={loading}
        searchKeys={["grnNumber", "supplierName"]} searchPlaceholder="Search GRNs..."
        onView={g => setViewing(g)}
        onFilteredChange={setVisibleData}
        rowActions={(g) => (
          <div className="flex gap-1">
            {g.status !== "posted" && canPost && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-green-700" onClick={() => handlePost(g)}>
                <CheckCheck className="h-3 w-3 mr-1" />Post
              </Button>
            )}
          </div>
        )}
      />

      {/* Create GRN modal */}
      <ModalForm open={modalOpen} onClose={() => setModal(false)} title="New Goods Receipt Note (GRN)"
        onSubmit={handleSave} submitLabel={saving ? "Creating…" : "Create GRN"}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Link to PO (optional)</Label>
              <Select value={poId || "__none__"} onValueChange={v => { if (v === "__none__") setPoId(""); else selectPO(v); }}>
                <SelectTrigger><SelectValue placeholder="No linked PO" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No linked PO</SelectItem>
                  {pos.map(p => <SelectItem key={p.id} value={p.id}>{p.poNumber} — {p.supplier?.name ?? p.supplierName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Supplier Name</Label><Input value={supplierName} onChange={e => setSupName(e.target.value)} /></div>
            <div><Label>Receipt Date</Label><Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Received Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-right px-2 py-2 w-16">Exp.</th>
                    <th className="text-right px-2 py-2 w-16">Rcvd</th>
                    <th className="text-right px-2 py-2 w-20">Unit Cost</th>
                    <th className="text-right px-2 py-2 w-20">Total</th>
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
                          <SelectTrigger className="h-7"><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__manual__">Enter manually</SelectItem>
                            {items.map(it => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {!line.itemId && (
                          <Input className="mt-1 h-7" placeholder="Item name" value={line.itemName} onChange={e => setLine(i, "itemName", e.target.value)} />
                        )}
                      </td>
                      <td className="px-2 py-1.5"><Input type="number" min={0} className="h-7 w-16 text-right" value={line.expectedQty} onChange={e => setLine(i, "expectedQty", Number(e.target.value))} /></td>
                      <td className="px-2 py-1.5"><Input type="number" min={1} className="h-7 w-16 text-right" value={line.receivedQty} onChange={e => setLine(i, "receivedQty", Number(e.target.value))} /></td>
                      <td className="px-2 py-1.5"><Input type="number" min={0} className="h-7 w-20 text-right" value={line.unitCost} onChange={e => setLine(i, "unitCost", Number(e.target.value))} /></td>
                      <td className="px-3 py-1.5 text-right font-medium">Ksh {(line.receivedQty * line.unitCost).toLocaleString()}</td>
                      <td className="px-1">
                        {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right font-semibold">Total</td>
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

      {/* View GRN dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>GRN — {viewing?.grnNumber}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[viewing?.status ?? "draft"] ?? ""}`}>
                {viewing?.status}
              </span>
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Supplier</p><p className="font-medium">{viewing.supplierName ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Receipt Date</p><p>{new Date(viewing.receiptDate).toLocaleDateString()}</p></div>
                {viewing.po && <div><p className="text-xs text-muted-foreground">Linked PO</p><p className="font-mono">{viewing.po.poNumber}</p></div>}
                {viewing.receivedBy && <div><p className="text-xs text-muted-foreground">Received By</p><p>{viewing.receivedBy}</p></div>}
                {viewing.postedAt && <div><p className="text-xs text-muted-foreground">Posted At</p><p>{new Date(viewing.postedAt).toLocaleString()}</p></div>}
              </div>
              <table className="w-full border rounded-lg overflow-hidden text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-right px-3 py-2">Expected</th>
                    <th className="text-right px-3 py-2">Received</th>
                    <th className="text-right px-3 py-2">Unit Cost</th>
                    <th className="text-right px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {viewing.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.itemName}</td>
                      <td className="px-3 py-2 text-right">{item.expectedQty} {item.unit}</td>
                      <td className={`px-3 py-2 text-right font-medium ${item.receivedQty < item.expectedQty ? "text-amber-600" : ""}`}>
                        {item.receivedQty}
                      </td>
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
              {viewing.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p>{viewing.notes}</p></div>}
              {viewing.status !== "posted" && canPost && (
                <Button className="w-full" onClick={() => { handlePost(viewing); setViewing(null); }}>
                  <CheckCheck className="h-4 w-4 mr-2" />Post GRN — Update Stock Levels
                </Button>
              )}
              {viewing.status === "posted" && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 shrink-0" />
                  Stock levels have been updated for all received items
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
