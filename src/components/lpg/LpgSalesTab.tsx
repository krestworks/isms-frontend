import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, AlertTriangle, Printer, Download } from "lucide-react";
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
import { lpgApi, ApiLpgSale, ApiLpgCylinder } from "@/lib/lpgApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";
import { openPdfInNewTab, downloadPdf } from "@/lib/pdfDoc";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];
const EXCHANGE_TYPES = ["Exchange", "New", "Refill"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), customer: "", cylinderSize: "", quantity: 1, unitPrice: 0,
  discount: 0, totalAmount: 0, paymentMethod: "Cash", paymentStatus: "paid",
  attendant: "", exchangeType: "Exchange",
};

interface SizeOption { size: string; available: number; price: number; }

export function LpgSalesTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();
  const can = usePermissions();
  const canRecord = can("lpg.sales.record");
  const canVoid   = can("lpg.sales.void");

  const [sales, setSales]         = useState<ApiLpgSale[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("LpgSale", stationId, sales.length);
  const [cylinders, setCylinders] = useState<ApiLpgCylinder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fromDate, setFromDate]   = useState(today());
  const [toDate, setToDate]       = useState(today());
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing]     = useState<ApiLpgSale | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [visibleSales, setVisibleSales] = useState<ApiLpgSale[]>([]);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [salesRes, cylRes] = await Promise.all([
        lpgApi.sales.list({ from: fromDate, to: toDate }, stationId),
        lpgApi.cylinders.list({ status: "available" }, stationId),
      ]);
      setSales(salesRes.data ?? []);
      setCylinders(cylRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load sales"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  // Group cylinders by size: count available + average selling price.
  // Must match the backend's stock check (lpgController.createSale), which only
  // counts cylinders with status === "available" — otherwise this shows sizes
  // as in-stock (counting sold/with_customer cylinders too) when the backend
  // would reject the sale.
  const sizeOptions: SizeOption[] = Object.values(
    cylinders.filter(c => c.status === "available").reduce<Record<string, SizeOption>>((acc, c) => {
      if (!acc[c.size]) acc[c.size] = { size: c.size, available: 0, price: 0 };
      acc[c.size].available += 1;
      acc[c.size].price = c.sellingPrice; // last one wins — they should match per size
      return acc;
    }, {})
  ).sort((a, b) => parseFloat(a.size) - parseFloat(b.size));

  const noStock = sizeOptions.length === 0;

  const updateForm = (k: string, v: any) => {
    setForm(f => {
      const next = { ...f, [k]: typeof f[k as keyof typeof f] === "number" ? +v : v };
      next.totalAmount = next.quantity * next.unitPrice - next.discount;
      return next;
    });
  };

  const handleSizeChange = (size: string) => {
    const opt = sizeOptions.find(s => s.size === size);
    setForm(f => {
      const next = { ...f, cylinderSize: size, unitPrice: opt?.price ?? f.unitPrice };
      next.totalAmount = next.quantity * next.unitPrice - next.discount;
      return next;
    });
  };

  const openNew = () => {
    const defaultSize = sizeOptions[0];
    setForm({
      ...emptyForm,
      date: today(),
      attendant: user.name || "",
      cylinderSize: defaultSize?.size ?? "",
      unitPrice: defaultSize?.price ?? 0,
    });
    setModalOpen(true);
  };

  const selectedSizeOpt = sizeOptions.find(s => s.size === form.cylinderSize);
  const insufficientStock = !!selectedSizeOpt && form.quantity > selectedSizeOpt.available;

  const handleSave = async () => {
    if (!form.cylinderSize) return toast.error("Select a cylinder size");
    if (!form.unitPrice)    return toast.error("Unit price is required");
    if (insufficientStock)
      return toast.error(`Only ${selectedSizeOpt!.available} ${form.cylinderSize} cylinder(s) in stock`);
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

  const [pendingVoidSale, setPendingVoidSale] = useState<ApiLpgSale | null>(null);
  const [requestingVoid, setRequestingVoid] = useState(false);

  const requestVoid = async () => {
    if (!pendingVoidSale) return;
    setRequestingVoid(true);
    try {
      await lpgApi.sales.void(pendingVoidSale.id, stationId);
      toast.success("Void requested — a different user must approve it before it takes effect");
      setPendingVoidSale(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to request void"); }
    finally { setRequestingVoid(false); }
  };

  const totals = {
    revenue: visibleSales.filter(s => s.paymentStatus !== "voided").reduce((a, s) => a + s.totalAmount, 0),
    count:   visibleSales.filter(s => s.paymentStatus !== "voided").length,
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
    { key: "cylinderSize", label: "Size",   options: sizeOptions.map(s => ({ label: s.size, value: s.size })) },
    { key: "exchangeType", label: "Type",   options: EXCHANGE_TYPES.map(t => ({ label: t, value: t })) },
    { key: "paymentStatus",label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Voided", value: "voided" }] },
  ];

  const exportColumns: ExportColumn<ApiLpgSale>[] = [
    { label: "Receipt",        value: s => s.receiptNo },
    { label: "Date",           value: s => s.date.split("T")[0] },
    { label: "Customer",       value: s => s.customer || "Walk-in" },
    { label: "Size",           value: s => s.cylinderSize },
    { label: "Qty",            value: s => s.quantity, total: rows => rows.reduce((sum, s) => sum + s.quantity, 0) },
    { label: "Unit Price (Ksh)",value: s => s.unitPrice },
    { label: "Discount (Ksh)", value: s => s.discount, total: rows => rows.reduce((sum, s) => sum + s.discount, 0) },
    { label: "Total (Ksh)",    value: s => s.totalAmount, total: rows => rows.reduce((sum, s) => sum + s.totalAmount, 0) },
    { label: "Type",           value: s => s.exchangeType },
    { label: "Payment Method", value: s => s.paymentMethod },
    { label: "Status",         value: s => s.paymentStatus },
    { label: "Attendant",      value: s => s.attendant || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Record and track LPG cylinder sales</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`lpg-sales_${fromDate}_to_${toDate}`}
            title="LPG Sales"
            rows={visibleSales}
            columns={exportColumns}
            subtitle={`${fromDate} to ${toDate}`}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canRecord && (
            <Button size="sm" onClick={openNew} disabled={noStock} title={noStock ? "No full cylinders in stock" : ""}>
              <Plus className="h-4 w-4 mr-1.5" />Record Sale
            </Button>
          )}
        </div>
      </div>

      {noStock && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No full cylinders in stock. Add cylinders in the Cylinders tab before recording sales.
        </div>
      )}

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
        onDelete={canVoid ? (s => s.paymentStatus !== "voided" ? setPendingVoidSale(s) : undefined) : undefined}
        onFilteredChange={setVisibleSales}
        pendingDeleteIds={pendingDeleteIds}
      />

      <DangerConfirmModal
        open={!!pendingVoidSale}
        title="Request sale void"
        description={`This requests approval to void receipt ${pendingVoidSale?.receiptNo}. A different user with permission must approve it before the sale is actually voided and the cylinder returned to stock.`}
        confirmLabel="Request Void"
        loading={requestingVoid}
        onConfirm={requestVoid}
        onCancel={() => setPendingVoidSale(null)}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record LPG Sale"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Record Sale"}
        submitDisabled={insufficientStock}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div>
            <Label>Cylinder Size *</Label>
            <Select value={form.cylinderSize} onValueChange={handleSizeChange}>
              <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
              <SelectContent>
                {sizeOptions.map(s => (
                  <SelectItem key={s.size} value={s.size}>
                    {s.size} — {s.available} in stock · Ksh {s.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSizeOpt && (
              <p className={`text-xs mt-1 ${insufficientStock ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {insufficientStock
                  ? `⚠ Only ${selectedSizeOpt.available} in stock`
                  : `${selectedSizeOpt.available} full cylinder(s) available`}
              </p>
            )}
          </div>
          <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity || ""} onChange={e => set("quantity", +e.target.value)} /></div>
          <div>
            <Label>Unit Price (Ksh) *</Label>
            <Input type="number" step="0.01" value={form.unitPrice || ""} onChange={e => set("unitPrice", +e.target.value)} />
            {form.unitPrice > 0 && <p className="text-xs text-muted-foreground mt-1">Auto-filled from cylinder pricing</p>}
          </div>
          <div><Label>Discount (Ksh)</Label><Input type="number" value={form.discount || ""} onChange={e => set("discount", +e.target.value)} /></div>
          <div><Label>Total (Ksh)</Label><Input value={`Ksh ${form.totalAmount.toLocaleString()}`} disabled className="font-mono" /></div>
          <div>
            <Label>Exchange Type</Label>
            <Select value={form.exchangeType} onValueChange={v => set("exchangeType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXCHANGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Customer</Label><Input value={form.customer} onChange={e => set("customer", e.target.value)} placeholder="Walk-in" /></div>
          <div><Label>Attendant</Label><Input value={form.attendant} disabled className="bg-muted/50 text-muted-foreground" /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sale Details" isView
        footerExtra={<>
          <Button variant="outline" size="sm" onClick={() => viewing && openPdfInNewTab(`/lpg/sales/${viewing.id}/receipt.pdf`)}><Printer className="h-3.5 w-3.5 mr-1.5" />Print</Button>
          <Button variant="outline" size="sm" onClick={() => viewing && downloadPdf(`/lpg/sales/${viewing.id}/receipt.pdf`, `${viewing.receiptNo}.pdf`)}><Download className="h-3.5 w-3.5 mr-1.5" />Download</Button>
        </>}>
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
