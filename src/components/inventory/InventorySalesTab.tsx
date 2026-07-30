import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { bizApi, ApiBizSale, ApiBizProduct, ApiBizBusiness } from "@/lib/bizApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { useSession } from "@/data/sessionStore";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Credit"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  productId: "", productName: "", qty: 1, unitPrice: 0,
  paymentMethod: "Cash", customer: "", cashier: "",
};

export default function InventorySalesTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();

  const [businesses, setBusinesses] = useState<ApiBizBusiness[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<ApiBizBusiness | null>(null);
  const [products, setProducts] = useState<ApiBizProduct[]>([]);
  const [sales, setSales] = useState<ApiBizSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [visibleSales, setVisibleSales] = useState<ApiBizSale[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  // Load businesses for this station
  useEffect(() => {
    if (!stationId) return;
    bizApi.businesses.list(stationId)
      .then(r => setBusinesses(r.data ?? []))
      .catch(() => toast.error("Failed to load sub-businesses"));
  }, [stationId]);

  // Load sales + products for a selected business
  const loadBizData = useCallback(async (biz: ApiBizBusiness) => {
    setLoading(true);
    try {
      const [salesRes, prodsRes] = await Promise.all([
        bizApi.sales.list(biz.id, { from: fromDate || undefined, to: toDate || undefined }),
        bizApi.products.list(biz.id, { status: "active" }),
      ]);
      setSales(salesRes.data ?? []);
      setProducts(prodsRes.data ?? []);
    } catch { toast.error("Failed to load business data"); }
    finally { setLoading(false); }
  }, [fromDate, toDate]);

  const onSelectBiz = (id: string) => {
    const biz = businesses.find(b => b.id === id) ?? null;
    setSelectedBiz(biz);
    setSales([]);
    setProducts([]);
    if (biz) loadBizData(biz);
  };

  const openNew = () => {
    setForm({ ...emptyForm, cashier: user.name || "" });
    setModalOpen(true);
  };

  const handleProductSelect = (productId: string) => {
    const p = products.find(x => x.id === productId);
    setForm(f => ({ ...f, productId, productName: p?.name ?? "", unitPrice: p?.price ?? 0 }));
  };

  const handleSave = async () => {
    if (!selectedBiz) return toast.error("No sub-business selected");
    if (!form.productId || !form.qty || !form.unitPrice)
      return toast.error("Product, quantity and price are required");
    const totalAmount = form.qty * form.unitPrice;
    const taxAmount = Math.round(totalAmount * selectedBiz.taxRate / 100 * 100) / 100;
    setSaving(true);
    try {
      await bizApi.sales.create({
        businessId: selectedBiz.id,
        items: [{ productId: form.productId, name: form.productName, qty: form.qty, unitPrice: form.unitPrice, discount: 0, totalPrice: totalAmount }],
        subtotal: totalAmount, discount: 0,
        taxRate: selectedBiz.taxRate, taxAmount,
        totalAmount: totalAmount + taxAmount,
        paymentMethod: form.paymentMethod,
        amountPaid: totalAmount + taxAmount, change: 0,
        cashier: form.cashier || undefined,
        status: "paid",
      });
      toast.success("Sale recorded");
      setModalOpen(false);
      loadBizData(selectedBiz);
    } catch (e: any) { toast.error(e?.message || "Failed to record sale"); }
    finally { setSaving(false); }
  };

  const activeSales = visibleSales.filter(s => s.status !== "void" && s.status !== "refunded");
  const stats = {
    total: activeSales.length,
    revenue: activeSales.reduce((a, s) => a + s.totalAmount, 0),
  };

  const columns: Column<ApiBizSale>[] = [
    { key: "saleRef", label: "Receipt", render: s => <span className="font-mono text-xs">{s.saleRef}</span>, sortable: true },
    { key: "date", label: "Date", render: s => s.date.split("T")[0], sortable: true },
    { key: "items", label: "Items", render: s => (s.items ?? []).map(i => `${i.name} ×${i.qty}`).join(", ") || "—" },
    { key: "totalAmount", label: "Total", render: s => <span className="font-mono font-semibold">Ksh {s.totalAmount.toLocaleString()}</span>, sortable: true },
    { key: "paymentMethod", label: "Payment", render: s => <Badge variant="outline">{s.paymentMethod}</Badge> },
    { key: "cashier", label: "Cashier", render: s => s.cashier || "—" },
    { key: "status", label: "Status", render: s => <Badge variant={s.status === "paid" ? "default" : "secondary"}>{s.status}</Badge> },
  ];

  const filters: FilterOption[] = [
    { key: "paymentMethod", label: "Payment", options: PAY_METHODS.map(m => ({ label: m, value: m })) },
  ];

  const exportColumns: ExportColumn<ApiBizSale>[] = [
    { label: "Receipt",        value: s => s.saleRef },
    { label: "Date",           value: s => s.date.split("T")[0] },
    { label: "Items",          value: s => (s.items ?? []).map(i => `${i.name} ×${i.qty}`).join(", ") || "—" },
    { label: "Total (Ksh)",    value: s => s.totalAmount, total: rows => rows.reduce((sum, s) => sum + s.totalAmount, 0) },
    { label: "Payment Method", value: s => s.paymentMethod },
    { label: "Cashier",        value: s => s.cashier || "—" },
    { label: "Status",         value: s => s.status },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">POS-style sales across sub-businesses</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`inventory-sales${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : `-${today()}`}`}
            title="Inventory Sales"
            rows={visibleSales}
            columns={exportColumns}
            disabled={!selectedBiz}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" onClick={() => selectedBiz && loadBizData(selectedBiz)} disabled={!selectedBiz}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={openNew} disabled={!selectedBiz}>
            <Plus className="h-4 w-4 mr-1.5" />Record Sale
          </Button>
        </div>
      </div>

      {/* Sub-business selector */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="w-72">
          <Label className="text-xs">Sub-Business</Label>
          <Select value={selectedBiz?.id ?? ""} onValueChange={onSelectBiz}>
            <SelectTrigger><SelectValue placeholder="Select sub-business..." /></SelectTrigger>
            <SelectContent>
              {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.type})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" disabled={!selectedBiz} onClick={() => selectedBiz && loadBizData(selectedBiz)}>Apply</Button>
      </div>

      {selectedBiz ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-primary">Ksh {stats.revenue.toLocaleString()}</p>
            </CardContent></Card>
          </div>

          <DataTable
            data={sales} columns={columns}
            searchKeys={["saleRef", "cashier"]}
            searchPlaceholder="Search sales..."
            filters={filters}
            onFilteredChange={setVisibleSales}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Store className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">Select a sub-business above to view its sales</p>
          {businesses.length === 0 && <p className="text-xs mt-1 opacity-70">No sub-businesses found for this station</p>}
        </div>
      )}

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record Sale"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Record Sale"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Product *</Label>
            <Select value={form.productId} onValueChange={handleProductSelect}>
              <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — Ksh {p.price} ({p.stockQty} {p.unit} in stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Quantity *</Label><Input type="number" min={1} value={form.qty || ""} onChange={e => setForm(f => ({ ...f, qty: +e.target.value }))} /></div>
          <div><Label>Unit Price (Ksh)</Label><Input type="number" step="0.01" value={form.unitPrice || ""} onChange={e => setForm(f => ({ ...f, unitPrice: +e.target.value }))} /></div>
          <div className="col-span-2 rounded bg-muted p-3 text-sm">
            Total: <span className="font-bold text-lg">Ksh {(form.qty * form.unitPrice).toLocaleString()}</span>
            {selectedBiz && selectedBiz.taxRate > 0 && (
              <span className="text-muted-foreground ml-2">(+{selectedBiz.taxRate}% tax)</span>
            )}
          </div>
          <div><Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Customer</Label><Input value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} placeholder="Walk-in" /></div>
          <div className="col-span-2"><Label>Cashier</Label><Input value={form.cashier} onChange={e => setForm(f => ({ ...f, cashier: e.target.value }))} /></div>
        </div>
      </ModalForm>
    </div>
  );
}
