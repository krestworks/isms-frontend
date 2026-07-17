import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";
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
import { fuelApi, ApiFuelSale, ApiFuelTank, ApiFuelPump, ApiFuelProduct } from "@/lib/fuelApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { useSession } from "@/data/sessionStore";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), tankId: "", pumpId: "", pumpNumber: 0, fuelType: "Super",
  litres: 0, pricePerLitre: 0, discount: 0, netAmount: 0,
  attendant: "", paymentMethod: "Cash", paymentStatus: "paid", customer: "",
};

export function PumpSalesTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();
  const can = usePermissions();
  const canRecord = can("fuel.sales.record");
  const canVoid   = can("fuel.sales.void");

  const [sales, setSales]       = useState<ApiFuelSale[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("FuelSale", stationId, sales.length);
  const [tanks, setTanks]       = useState<ApiFuelTank[]>([]);
  const [pumps, setPumps]       = useState<ApiFuelPump[]>([]);
  const [products, setProducts] = useState<ApiFuelProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate]     = useState(today());
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing]   = useState<ApiFuelSale | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [visibleSales, setVisibleSales] = useState<ApiFuelSale[]>([]);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [salesRes, tanksRes, pumpsRes, prodsRes] = await Promise.all([
        fuelApi.sales.list({ from: fromDate, to: toDate }, stationId),
        fuelApi.tanks.list(stationId),
        fuelApi.pumps.list(stationId),
        fuelApi.products.list(stationId),
      ]);
      setSales(salesRes.data ?? []);
      setTanks(tanksRes.data ?? []);
      setPumps(pumpsRes.data ?? []);
      setProducts(prodsRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load sales"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const activePumps = pumps.filter(p => p.status === "active");
  const activeTanks = tanks.filter(t => t.status !== "inactive");

  const updateForm = (k: string, v: any) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      next.netAmount = next.litres * next.pricePerLitre - next.discount;
      return next;
    });
  };

  const handleTankChange = (tankId: string) => {
    const tank = tanks.find(t => t.id === tankId);
    const product = tank ? products.find(p => p.fuelType === tank.fuelType && p.isActive) : null;
    setForm(f => {
      const next = { ...f, tankId, fuelType: tank?.fuelType ?? f.fuelType, pricePerLitre: product?.sellingPrice ?? f.pricePerLitre };
      next.netAmount = next.litres * next.pricePerLitre - next.discount;
      return next;
    });
  };

  const handlePumpChange = (pumpId: string) => {
    const pump = pumps.find(p => p.id === pumpId);
    if (!pump) return;
    setForm(f => {
      let next = { ...f, pumpId, pumpNumber: pump.pumpNumber };
      // auto-select tank if pump has one linked
      if (pump.tankId && !f.tankId) {
        const tank = tanks.find(t => t.id === pump.tankId);
        const product = tank ? products.find(p => p.fuelType === tank.fuelType && p.isActive) : null;
        next = { ...next, tankId: pump.tankId, fuelType: tank?.fuelType ?? next.fuelType, pricePerLitre: product?.sellingPrice ?? next.pricePerLitre };
      }
      next.netAmount = next.litres * next.pricePerLitre - next.discount;
      return next;
    });
  };

  const openNew = () => {
    const defaultPump = activePumps[0];
    const defaultTank = defaultPump?.tankId ? tanks.find(t => t.id === defaultPump.tankId) : activeTanks[0];
    const product = defaultTank ? products.find(p => p.fuelType === defaultTank.fuelType && p.isActive) : null;
    setForm({
      ...emptyForm,
      date: today(),
      pumpId: defaultPump?.id ?? "",
      pumpNumber: defaultPump?.pumpNumber ?? 0,
      tankId: defaultTank?.id ?? "",
      fuelType: defaultTank?.fuelType ?? "Super",
      pricePerLitre: product?.sellingPrice ?? 0,
      attendant: user.name || "",
    });
    setModalOpen(true);
  };

  const selectedTank = tanks.find(t => t.id === form.tankId);
  const insufficientStock = !!selectedTank && form.litres > selectedTank.currentLevel;
  const noPumps = activePumps.length === 0;
  const noTanks = activeTanks.length === 0;
  const canOpenSale = !noPumps && !noTanks;

  const handleSave = async () => {
    if (!form.pumpId)        return toast.error("Select a pump");
    if (!form.tankId)        return toast.error("Select a tank");
    if (!form.litres)        return toast.error("Enter litres");
    if (!form.pricePerLitre) return toast.error("Price per litre is required");
    if (insufficientStock)
      return toast.error(`Insufficient stock: tank has ${selectedTank!.currentLevel.toFixed(2)}L`);
    setSaving(true);
    try {
      await fuelApi.sales.create({
        tankId: form.tankId,
        pumpNumber: form.pumpNumber,
        fuelType: form.fuelType,
        litres: form.litres,
        pricePerLitre: form.pricePerLitre,
        discount: form.discount,
        netAmount: form.netAmount,
        attendant: form.attendant,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
        customer: form.customer,
        date: form.date,
      }, stationId);
      toast.success("Sale recorded");
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to record sale"); }
    finally { setSaving(false); }
  };

  const [pendingVoidSale, setPendingVoidSale] = useState<ApiFuelSale | null>(null);
  const [requestingVoid, setRequestingVoid] = useState(false);

  const requestVoid = async () => {
    if (!pendingVoidSale) return;
    setRequestingVoid(true);
    try {
      await fuelApi.sales.void(pendingVoidSale.id, stationId);
      toast.success("Void requested — a different user must approve it before it takes effect");
      setPendingVoidSale(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to request void"); }
    finally { setRequestingVoid(false); }
  };

  const totals = {
    revenue: visibleSales.reduce((s, r) => s + r.netAmount, 0),
    litres:  visibleSales.reduce((s, r) => s + r.litres, 0),
    count:   visibleSales.length,
  };

  const columns: Column<ApiFuelSale>[] = [
    { key: "receiptNo",   label: "Receipt",   render: s => <span className="font-mono text-xs">{s.receiptNo}</span>, sortable: true },
    { key: "date",        label: "Date",       render: s => s.date.split("T")[0], sortable: true },
    { key: "pumpNumber",  label: "Pump",       render: s => `Pump ${s.pumpNumber}` },
    { key: "fuelType",    label: "Fuel",       sortable: true },
    { key: "litres",      label: "Litres",     render: s => s.litres.toLocaleString() },
    { key: "netAmount",   label: "Amount",     render: s => <span className="font-mono">Ksh {s.netAmount.toLocaleString()}</span>, sortable: true },
    { key: "attendant",   label: "Attendant",  render: s => s.attendant || "—" },
    { key: "paymentMethod", label: "Payment" },
    { key: "paymentStatus", label: "Status",  render: s => <StatusBadge status={s.paymentStatus} /> },
  ];

  const filters: FilterOption[] = [
    { key: "paymentMethod", label: "Payment", options: PAY_METHODS.map(m => ({ label: m, value: m })) },
  ];

  const exportColumns: ExportColumn<ApiFuelSale>[] = [
    { label: "Receipt",        value: s => s.receiptNo },
    { label: "Date",           value: s => s.date.split("T")[0] },
    { label: "Pump",           value: s => `Pump ${s.pumpNumber}` },
    { label: "Fuel Type",      value: s => s.fuelType },
    { label: "Litres",         value: s => s.litres },
    { label: "Price/L (Ksh)",  value: s => s.pricePerLitre },
    { label: "Gross (Ksh)",    value: s => s.amount },
    { label: "Discount (Ksh)", value: s => s.discount },
    { label: "Net Amount (Ksh)",value: s => s.netAmount },
    { label: "Payment Method", value: s => s.paymentMethod },
    { label: "Status",         value: s => s.paymentStatus },
    { label: "Customer",       value: s => s.customer || "Walk-in" },
    { label: "Attendant",      value: s => s.attendant || "—" },
  ];

  const set = (k: string, v: any) => updateForm(k, v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Record and track pump sales</p>
        <div className="flex gap-2 flex-wrap">
          <ExportMenu
            filename={`fuel-sales_${fromDate}_to_${toDate}`}
            title="Fuel Pump Sales"
            rows={visibleSales}
            columns={exportColumns}
            subtitle={`${fromDate} to ${toDate}`}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canRecord && (
            <Button size="sm" onClick={openNew} disabled={!canOpenSale} title={noPumps ? "Set up pumps in the Inventory tab first" : noTanks ? "Set up tanks first" : ""}>
              <Plus className="h-4 w-4 mr-1.5" />Record Sale
            </Button>
          )}
        </div>
      </div>

      {(noPumps || noTanks) && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {noPumps && noTanks
            ? "No tanks or pumps configured. Go to Inventory → Pump Setup and Tanks to set up before recording sales."
            : noPumps
            ? "No pumps configured. Go to Inventory → Pump Setup to add pumps before recording sales."
            : "No active tanks configured. Add tanks in the Tanks tab before recording sales."}
        </div>
      )}

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Revenue",      value: `Ksh ${totals.revenue.toLocaleString()}`, color: "text-primary" },
          { label: "Litres Sold",  value: `${totals.litres.toLocaleString()} L` },
          { label: "Transactions", value: String(totals.count) },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color || ""}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={sales}
        columns={columns}
        searchKeys={["receiptNo", "attendant", "customer", "fuelType"]}
        searchPlaceholder="Search sales..."
        filters={filters}
        onView={s => setViewing(s)}
        onDelete={canVoid ? (s => setPendingVoidSale(s)) : undefined}
        onFilteredChange={rows => setVisibleSales(rows)}
        pendingDeleteIds={pendingDeleteIds}
      />

      <DangerConfirmModal
        open={!!pendingVoidSale}
        title="Request sale void"
        description={`This requests approval to void receipt ${pendingVoidSale?.receiptNo}. A different user with permission must approve it before the sale is actually voided and tank stock restored.`}
        confirmLabel="Request Void"
        loading={requestingVoid}
        onConfirm={requestVoid}
        onCancel={() => setPendingVoidSale(null)}
      />

      {/* Record Sale */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record Fuel Sale"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Record Sale"}
        submitDisabled={insufficientStock}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div>
            <Label>Pump *</Label>
            <Select value={form.pumpId} onValueChange={handlePumpChange}>
              <SelectTrigger><SelectValue placeholder="Select pump" /></SelectTrigger>
              <SelectContent>
                {activePumps.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    Pump {p.pumpNumber} — {p.name}{p.tank ? ` (${p.tank.fuelType})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tank *</Label>
            <Select value={form.tankId} onValueChange={handleTankChange}>
              <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
              <SelectContent>
                {activeTanks.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.fuelType}) — {t.currentLevel.toLocaleString()}L avail.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTank && (
              <p className={`text-xs mt-1 ${insufficientStock ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {insufficientStock
                  ? `⚠ Only ${selectedTank.currentLevel.toFixed(2)}L available — cannot sell ${form.litres}L`
                  : `Available: ${selectedTank.currentLevel.toFixed(2)}L / ${selectedTank.capacity}L`}
              </p>
            )}
          </div>
          <div>
            <Label>Fuel Type</Label>
            <Input value={form.fuelType} disabled className="bg-muted/50 text-muted-foreground" />
          </div>
          <div><Label>Litres *</Label><Input type="number" value={form.litres || ""} onChange={e => set("litres", +e.target.value)} /></div>
          <div>
            <Label>Price/Litre (Ksh) *</Label>
            <Input type="number" step="0.01" value={form.pricePerLitre || ""} onChange={e => set("pricePerLitre", +e.target.value)} />
            {form.pricePerLitre > 0 && <p className="text-xs text-muted-foreground mt-1">Auto-filled from pricing config</p>}
          </div>
          <div><Label>Discount (Ksh)</Label><Input type="number" value={form.discount || ""} onChange={e => set("discount", +e.target.value)} /></div>
          <div><Label>Net Amount (Ksh)</Label><Input value={`Ksh ${form.netAmount.toLocaleString()}`} disabled className="font-mono" /></div>
          <div><Label>Attendant</Label><Input value={form.attendant} onChange={e => set("attendant", e.target.value)} /></div>
          <div>
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Customer</Label><Input value={form.customer} onChange={e => set("customer", e.target.value)} placeholder="Walk-in" /></div>
        </div>
      </ModalForm>

      {/* View Sale */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sale Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Receipt:</span> <span className="font-mono">{viewing.receiptNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Pump:</span> Pump {viewing.pumpNumber}</div>
            <div><span className="text-muted-foreground">Fuel:</span> {viewing.fuelType}</div>
            <div><span className="text-muted-foreground">Litres:</span> {viewing.litres.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Price/L:</span> Ksh {viewing.pricePerLitre}</div>
            <div><span className="text-muted-foreground">Gross:</span> Ksh {viewing.amount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Discount:</span> Ksh {viewing.discount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Net:</span> <strong>Ksh {viewing.netAmount.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} /></div>
            <div><span className="text-muted-foreground">Customer:</span> {viewing.customer || "Walk-in"}</div>
            <div><span className="text-muted-foreground">Attendant:</span> {viewing.attendant || "—"}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
