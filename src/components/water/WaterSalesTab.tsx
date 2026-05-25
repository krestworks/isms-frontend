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
import { waterApi, ApiWaterSale } from "@/lib/waterApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { exportToCsv } from "@/lib/exportCsv";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), customer: "", litres: 0, pricePerLitre: 0, discount: 0,
  paymentMethod: "Cash", paymentStatus: "paid", attendant: "",
};

export function WaterSalesTab() {
  const { stationId } = useActiveStation();
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

  const openNew = () => { setForm({ ...emptyForm, date: today() }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.litres || !form.pricePerLitre) return toast.error("Litres and price are required");
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

  const handleVoid = async (s: ApiWaterSale) => {
    try {
      await waterApi.sales.void(s.id, stationId);
      toast.success("Sale voided");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to void"); }
  };

  const totals = {
    revenue:     sales.filter(s => s.paymentStatus !== "voided").reduce((a, s) => a + s.totalAmount, 0),
    litresSold:  sales.filter(s => s.paymentStatus !== "voided").reduce((a, s) => a + s.litres, 0),
    count:       sales.filter(s => s.paymentStatus !== "voided").length,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Record and track water sales</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(`water-sales-${today()}.csv`, sales)}>
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
        onDelete={canVoid ? (s => s.paymentStatus !== "voided" ? handleVoid(s) : undefined) : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record Water Sale"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Record Sale"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Customer</Label><Input value={form.customer} onChange={e => set("customer", e.target.value)} placeholder="Walk-in" /></div>
          <div><Label>Litres *</Label><Input type="number" value={form.litres || ""} onChange={e => set("litres", +e.target.value)} /></div>
          <div><Label>Price/Litre (Ksh) *</Label><Input type="number" step="0.01" value={form.pricePerLitre || ""} onChange={e => set("pricePerLitre", +e.target.value)} /></div>
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
