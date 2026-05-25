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
import { lpgApi, ApiLpgSale } from "@/lib/lpgApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { exportToCsv } from "@/lib/exportCsv";

const SIZES = ["6kg", "13kg", "22.5kg", "25kg", "50kg"];
const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];
const EXCHANGE_TYPES = ["Exchange", "New", "Refill"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), customer: "", cylinderSize: "13kg", quantity: 1, unitPrice: 0,
  discount: 0, totalAmount: 0, paymentMethod: "Cash", paymentStatus: "paid",
  attendant: "", exchangeType: "Exchange",
};

export function LpgSalesTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canRecord = can("lpg.sales.record");
  const canVoid   = can("lpg.sales.void");

  const [sales, setSales]       = useState<ApiLpgSale[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate]     = useState(today());
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing]   = useState<ApiLpgSale | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await lpgApi.sales.list({ from: fromDate, to: toDate }, stationId);
      setSales(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load sales"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const updateForm = (k: string, v: any) => {
    setForm(f => {
      const next = { ...f, [k]: typeof f[k as keyof typeof f] === "number" ? +v : v };
      next.totalAmount = next.quantity * next.unitPrice - next.discount;
      return next;
    });
  };

  const openNew = () => { setForm({ ...emptyForm, date: today() }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.date || !form.cylinderSize || !form.unitPrice) return toast.error("Date, size, and price are required");
    setSaving(true);
    try {
      await lpgApi.sales.create({
        date: form.date, customer: form.customer || undefined, cylinderSize: form.cylinderSize,
        quantity: form.quantity, unitPrice: form.unitPrice, discount: form.discount,
        paymentMethod: form.paymentMethod, paymentStatus: form.paymentStatus,
        attendant: form.attendant || undefined, exchangeType: form.exchangeType,
      }, stationId);
      toast.success("Sale recorded");
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to record sale"); }
    finally { setSaving(false); }
  };

  const handleVoid = async (s: ApiLpgSale) => {
    try {
      await lpgApi.sales.void(s.id, stationId);
      toast.success("Sale voided");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to void"); }
  };

  const totals = {
    revenue: sales.filter(s => s.paymentStatus !== "voided").reduce((a, s) => a + s.totalAmount, 0),
    count:   sales.filter(s => s.paymentStatus !== "voided").length,
  };

  const set = (k: string, v: any) => updateForm(k, v);

  const columns: Column<ApiLpgSale>[] = [
    { key: "receiptNo",    label: "Receipt",   render: s => <span className="font-mono text-xs">{s.receiptNo}</span>, sortable: true },
    { key: "date",         label: "Date",      render: s => s.date.split("T")[0], sortable: true },
    { key: "customer",     label: "Customer",  render: s => s.customer || "Walk-in" },
    { key: "cylinderSize", label: "Size",      sortable: true },
    { key: "quantity",     label: "Qty" },
    { key: "totalAmount",  label: "Amount",    render: s => <span className="font-mono">Ksh {s.totalAmount.toLocaleString()}</span>, sortable: true },
    { key: "exchangeType", label: "Type" },
    { key: "paymentMethod",label: "Payment" },
    { key: "paymentStatus",label: "Status",   render: s => <StatusBadge status={s.paymentStatus} /> },
  ];

  const filters: FilterOption[] = [
    { key: "cylinderSize", label: "Size",     options: SIZES.map(s => ({ label: s, value: s })) },
    { key: "exchangeType", label: "Type",     options: EXCHANGE_TYPES.map(t => ({ label: t, value: t })) },
    { key: "paymentStatus",label: "Status",   options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Voided", value: "voided" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Record and track LPG cylinder sales</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(`lpg-sales-${today()}.csv`, sales)}>
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

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-xl font-bold text-primary">Ksh {totals.revenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <p className="text-xl font-bold">{totals.count}</p>
        </CardContent></Card>
      </div>

      <DataTable
        data={sales} columns={columns}
        searchKeys={["receiptNo", "customer", "attendant", "cylinderSize"]}
        searchPlaceholder="Search sales..."
        filters={filters}
        onView={s => setViewing(s)}
        onDelete={canVoid ? (s => s.paymentStatus !== "voided" ? handleVoid(s) : undefined) : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record LPG Sale"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Record Sale"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Cylinder Size</Label>
            <Select value={form.cylinderSize} onValueChange={v => set("cylinderSize", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input type="number" value={form.quantity || ""} onChange={e => set("quantity", +e.target.value)} /></div>
          <div><Label>Unit Price (Ksh) *</Label><Input type="number" value={form.unitPrice || ""} onChange={e => set("unitPrice", +e.target.value)} /></div>
          <div><Label>Discount (Ksh)</Label><Input type="number" value={form.discount || ""} onChange={e => set("discount", +e.target.value)} /></div>
          <div><Label>Total (Ksh)</Label><Input value={`Ksh ${form.totalAmount.toLocaleString()}`} disabled className="font-mono" /></div>
          <div><Label>Exchange Type</Label>
            <Select value={form.exchangeType} onValueChange={v => set("exchangeType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXCHANGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Customer</Label><Input value={form.customer} onChange={e => set("customer", e.target.value)} placeholder="Walk-in" /></div>
          <div><Label>Attendant</Label><Input value={form.attendant} onChange={e => set("attendant", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sale Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Receipt:</span> <span className="font-mono">{viewing.receiptNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Customer:</span> {viewing.customer || "Walk-in"}</div>
            <div><span className="text-muted-foreground">Size:</span> {viewing.cylinderSize}</div>
            <div><span className="text-muted-foreground">Qty:</span> {viewing.quantity}</div>
            <div><span className="text-muted-foreground">Unit Price:</span> Ksh {viewing.unitPrice.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Discount:</span> Ksh {viewing.discount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Total:</span> <strong>Ksh {viewing.totalAmount.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Type:</span> {viewing.exchangeType}</div>
            <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} /></div>
            <div><span className="text-muted-foreground">Attendant:</span> {viewing.attendant || "—"}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
