import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { fuelApi, ApiFuelSale, ApiFuelTank } from "@/lib/fuelApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { exportToCsv } from "@/lib/exportCsv";

const FUEL_TYPES = ["Super", "Diesel", "Kerosene", "V-Power", "Jet A-1", "Heavy Fuel Oil"];
const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), tankId: "", pumpNumber: 1, fuelType: "Super",
  litres: 0, pricePerLitre: 0, discount: 0, netAmount: 0,
  attendant: "", paymentMethod: "Cash", paymentStatus: "paid", customer: "",
};

export function PumpSalesTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canRecord = can("fuel.sales.record");
  const canVoid   = can("fuel.sales.void");

  const [sales, setSales]       = useState<ApiFuelSale[]>([]);
  const [tanks, setTanks]       = useState<ApiFuelTank[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate]     = useState(today());
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing]   = useState<ApiFuelSale | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [salesRes, tanksRes] = await Promise.all([
        fuelApi.sales.list({ from: fromDate, to: toDate }, stationId),
        fuelApi.tanks.list(stationId),
      ]);
      setSales(salesRes.data ?? []);
      setTanks(tanksRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load sales"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const updateForm = (k: string, v: any) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      const amount = next.litres * next.pricePerLitre;
      next.netAmount = amount - next.discount;
      return next;
    });
  };

  const openNew = () => {
    const defaultTank = tanks[0];
    setForm({
      ...emptyForm,
      date: today(),
      tankId: defaultTank?.id ?? "",
      fuelType: defaultTank?.fuelType ?? "Super",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.litres || !form.pricePerLitre)
      return toast.error("Date, litres, and price are required");
    setSaving(true);
    try {
      await fuelApi.sales.create({
        tankId: form.tankId || undefined,
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

  const handleVoid = async (s: ApiFuelSale) => {
    try {
      await fuelApi.sales.void(s.id, stationId);
      toast.success("Sale voided");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to void sale"); }
  };

  const totals = {
    revenue: sales.reduce((s, r) => s + r.netAmount, 0),
    litres:  sales.reduce((s, r) => s + r.litres, 0),
    count:   sales.length,
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
    { key: "fuelType",     label: "Fuel",    options: FUEL_TYPES.map(f => ({ label: f, value: f })) },
    { key: "paymentMethod", label: "Payment", options: PAY_METHODS.map(m => ({ label: m, value: m })) },
  ];

  const set = (k: string, v: any) => updateForm(k, v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Record and track pump sales</p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(`fuel-sales-${today()}.csv`, sales)}>
            <Download className="h-4 w-4 mr-1.5" />Export
          </Button>
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
        {[
          { label: "Revenue",      value: `Ksh ${totals.revenue.toLocaleString()}`,    color: "text-primary" },
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
        onDelete={canVoid ? handleVoid : undefined}
      />

      {/* Record Sale */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record Fuel Sale"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Record Sale"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div>
            <Label>Tank</Label>
            <Select value={form.tankId} onValueChange={v => { set("tankId", v); const t = tanks.find(x => x.id === v); if (t) set("fuelType", t.fuelType); }}>
              <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
              <SelectContent>
                {tanks.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.fuelType})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pump Number</Label>
            <Select value={String(form.pumpNumber)} onValueChange={v => set("pumpNumber", +v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>Pump {n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fuel Type</Label>
            <Select value={form.fuelType} onValueChange={v => set("fuelType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Litres *</Label><Input type="number" value={form.litres || ""} onChange={e => set("litres", +e.target.value)} /></div>
          <div><Label>Price/Litre (Ksh) *</Label><Input type="number" value={form.pricePerLitre || ""} onChange={e => set("pricePerLitre", +e.target.value)} /></div>
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
