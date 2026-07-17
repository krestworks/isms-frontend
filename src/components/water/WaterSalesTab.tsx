import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { waterApi, ApiWaterSale, ApiWaterSummary, ApiWaterPricePackage } from "@/lib/waterApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { usePermissions } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), customer: "", litres: 0, pricePerLitre: 0, discount: 0,
  paymentMethod: "Cash", paymentStatus: "paid", attendant: "", packageId: "",
};

export function WaterSalesTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();
  const can = usePermissions();
  const canRecord = can("water.sales.record");
  const canVoid   = can("water.sales.record");

  const [sales, setSales]       = useState<ApiWaterSale[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate]     = useState(today());
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing]   = useState<ApiWaterSale | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [availableWater, setAvailableWater] = useState<number | null>(null);
  const [visibleSales, setVisibleSales] = useState<ApiWaterSale[]>([]);
  const [packages, setPackages] = useState<ApiWaterPricePackage[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("WaterSale", stationId, sales.length);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await waterApi.sales.list({ from: fromDate, to: toDate }, stationId);
      setSales(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load sales"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = async () => {
    setForm({ ...emptyForm, date: today(), attendant: user.name || "" });
    setModalOpen(true);
    try {
      const [summaryRes, pkgRes] = await Promise.all([
        waterApi.summary(stationId),
        waterApi.pricePackages.list({ status: "active" }, stationId),
      ]);
      setAvailableWater(summaryRes.data?.availableWater ?? null);
      setPackages(pkgRes.data ?? []);
    } catch { /* non-critical */ }
  };

  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    setForm(f => ({ ...f, packageId, pricePerLitre: pkg ? Math.round((pkg.price / pkg.litres) * 100) / 100 : f.pricePerLitre }));
  };

  const insufficientWater = availableWater !== null && form.litres > availableWater;

  const handleSave = async () => {
    if (!form.litres || !form.pricePerLitre) return toast.error("Litres and price are required");
    if (insufficientWater)
      return toast.error(`Insufficient water: only ${availableWater!.toFixed(0)}L available. Log production first.`);
    setSaving(true);
    try {
      const totalAmount = form.litres * form.pricePerLitre - form.discount;
      await waterApi.sales.create({
        date: form.date, customer: form.customer || undefined, litres: form.litres,
        pricePerLitre: form.pricePerLitre, discount: form.discount, totalAmount,
        paymentMethod: form.paymentMethod, paymentStatus: form.paymentStatus,
        attendant: form.attendant || undefined,
      }, stationId);
      toast.success("Sale recorded");
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to record sale"); }
    finally { setSaving(false); }
  };

  const [pendingVoidSale, setPendingVoidSale] = useState<ApiWaterSale | null>(null);
  const [requestingVoid, setRequestingVoid] = useState(false);

  const requestVoid = async () => {
    if (!pendingVoidSale) return;
    setRequestingVoid(true);
    try {
      await waterApi.sales.void(pendingVoidSale.id, stationId);
      toast.success("Void requested — a different user must approve it before it takes effect");
      setPendingVoidSale(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to request void"); }
    finally { setRequestingVoid(false); }
  };

  const totals = {
    revenue:     visibleSales.filter(s => s.paymentStatus !== "voided").reduce((a, s) => a + s.totalAmount, 0),
    litresSold:  visibleSales.filter(s => s.paymentStatus !== "voided").reduce((a, s) => a + s.litres, 0),
    count:       visibleSales.filter(s => s.paymentStatus !== "voided").length,
  };

  const totalAmount = form.litres * form.pricePerLitre - form.discount;

  const columns: Column<ApiWaterSale>[] = [
    { key: "receiptNo",    label: "Receipt",    render: s => <span className="font-mono text-xs">{s.receiptNo}</span>, sortable: true },
    { key: "date",         label: "Date",        render: s => s.date.split("T")[0], sortable: true },
    { key: "customer",     label: "Customer",    render: s => s.customer || "Walk-in" },
    { key: "litres",       label: "Litres (L)",  render: s => s.litres.toLocaleString(), sortable: true },
    { key: "pricePerLitre",label: "Price/L",     render: s => `Ksh ${s.pricePerLitre}` },
    { key: "totalAmount",  label: "Total (Ksh)", render: s => <span className="font-mono">Ksh {s.totalAmount.toLocaleString()}</span>, sortable: true },
    { key: "paymentMethod",label: "Payment" },
    { key: "paymentStatus",label: "Status",      render: s => <StatusBadge status={s.paymentStatus} /> },
  ];

  const filters: FilterOption[] = [
    { key: "paymentStatus", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Voided", value: "voided" }] },
    { key: "paymentMethod", label: "Method", options: PAY_METHODS.map(m => ({ label: m, value: m })) },
  ];

  const exportColumns: ExportColumn<ApiWaterSale>[] = [
    { label: "Receipt",        value: s => s.receiptNo },
    { label: "Date",           value: s => s.date.split("T")[0] },
    { label: "Customer",       value: s => s.customer || "Walk-in" },
    { label: "Litres (L)",     value: s => s.litres },
    { label: "Price/L (Ksh)",  value: s => s.pricePerLitre },
    { label: "Discount (Ksh)", value: s => s.discount },
    { label: "Total (Ksh)",    value: s => s.totalAmount },
    { label: "Payment Method", value: s => s.paymentMethod },
    { label: "Status",         value: s => s.paymentStatus },
    { label: "Attendant",      value: s => s.attendant || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Record and track water sales</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`water-sales_${fromDate}_to_${toDate}`}
            title="Water Sales"
            rows={visibleSales}
            columns={exportColumns}
            subtitle={`${fromDate} to ${toDate}`}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canRecord && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Record Sale</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-xl font-bold text-primary">Ksh {totals.revenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Litres Sold</p>
          <p className="text-xl font-bold">{totals.litresSold.toLocaleString()} L</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <p className="text-xl font-bold">{totals.count}</p>
        </CardContent></Card>
      </div>

      <DataTable
        data={sales} columns={columns}
        searchKeys={["receiptNo", "customer", "attendant"]}
        searchPlaceholder="Search sales..."
        filters={filters}
        onView={s => setViewing(s)}
        onDelete={canVoid ? (s => s.paymentStatus !== "voided" ? setPendingVoidSale(s) : undefined) : undefined}
        onFilteredChange={setVisibleSales}
        pendingDeleteIds={pendingDeleteIds}
      />

      <DangerConfirmModal
        open={!!pendingVoidSale}
        title="Request sale void"
        description={`This requests approval to void receipt ${pendingVoidSale?.receiptNo}. A different user with permission must approve it before the sale is actually voided.`}
        confirmLabel="Request Void"
        loading={requestingVoid}
        onConfirm={requestVoid}
        onCancel={() => setPendingVoidSale(null)}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record Water Sale"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Record Sale"}
        submitDisabled={insufficientWater}>
        <div className="grid grid-cols-2 gap-4">
          {availableWater !== null && (
            <div className={`col-span-2 text-xs px-3 py-2 rounded-md ${insufficientWater ? "bg-destructive/10 text-destructive font-medium" : "bg-muted text-muted-foreground"}`}>
              {insufficientWater
                ? `⚠ Only ${availableWater.toFixed(0)}L in stock — log more production before selling`
                : `Stock available: ${availableWater.toFixed(0)}L`}
            </div>
          )}
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Customer</Label><Input value={form.customer} onChange={e => set("customer", e.target.value)} placeholder="Walk-in" /></div>
          <div><Label>Litres *</Label><Input type="number" value={form.litres || ""} onChange={e => set("litres", +e.target.value)} /></div>
          <div>
            <Label>Package</Label>
            <Select value={form.packageId} onValueChange={handlePackageChange}>
              <SelectTrigger><SelectValue placeholder={packages.length ? "Select package" : "No packages set up"} /></SelectTrigger>
              <SelectContent>
                {packages.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — Ksh {(p.price / p.litres).toFixed(2)}/L
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Price/Litre (Ksh) *</Label>
            <Input type="number" step="0.01" value={form.pricePerLitre || ""} onChange={e => set("pricePerLitre", +e.target.value)} />
            {form.packageId && <p className="text-xs text-muted-foreground mt-1">Auto-filled from package pricing — edit if needed</p>}
          </div>
          <div><Label>Discount (Ksh)</Label><Input type="number" value={form.discount || ""} onChange={e => set("discount", +e.target.value)} /></div>
          <div><Label>Total (Ksh)</Label><Input value={`Ksh ${totalAmount.toLocaleString()}`} disabled className="font-mono" /></div>
          <div><Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Attendant</Label><Input value={form.attendant} onChange={e => set("attendant", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sale Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Receipt:</span> <span className="font-mono">{viewing.receiptNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Customer:</span> {viewing.customer || "Walk-in"}</div>
            <div><span className="text-muted-foreground">Litres:</span> {viewing.litres.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Price/Litre:</span> Ksh {viewing.pricePerLitre}</div>
            <div><span className="text-muted-foreground">Discount:</span> Ksh {viewing.discount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Total:</span> <strong>Ksh {viewing.totalAmount.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} /></div>
            <div><span className="text-muted-foreground">Attendant:</span> {viewing.attendant || "—"}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
