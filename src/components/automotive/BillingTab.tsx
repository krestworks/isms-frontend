import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { autoApi, ApiAutoBill } from "@/lib/autoApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";
import { openPdfInNewTab, downloadPdf } from "@/lib/pdfDoc";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), serviceRef: "", customerName: "", vehicleReg: "",
  labourCharges: 0, partsCost: 0, discount: 0,
  paymentMethod: "Cash", paymentStatus: "pending", paidAmount: 0,
};

export function BillingTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("auto.billing.manage");

  const [records, setRecords]   = useState<ApiAutoBill[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("AutoBill", stationId, records.length);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiAutoBill | null>(null);
  const [viewing, setViewing]   = useState<ApiAutoBill | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [visibleRecords, setVisibleRecords] = useState<ApiAutoBill[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await autoApi.bills.list({ from: fromDate || undefined, to: toDate || undefined }, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load bills"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const totalAmount = form.labourCharges + form.partsCost - form.discount;
  const balance = totalAmount - form.paidAmount;

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: today() }); setModalOpen(true); };
  const openEdit = (b: ApiAutoBill) => {
    setEditing(b);
    setForm({
      date: b.date.split("T")[0], serviceRef: b.serviceRef ?? "", customerName: b.customerName,
      vehicleReg: b.vehicleReg, labourCharges: b.labourCharges, partsCost: b.partsCost,
      discount: b.discount, paymentMethod: b.paymentMethod, paymentStatus: b.paymentStatus,
      paidAmount: b.paidAmount,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customerName || !form.vehicleReg) return toast.error("Customer name and vehicle reg required");
    setSaving(true);
    try {
      const payload = { ...form, serviceRef: form.serviceRef || undefined };
      if (editing) {
        await autoApi.bills.update(editing.id, payload, stationId);
        toast.success("Bill updated");
      } else {
        await autoApi.bills.create(payload, stationId);
        toast.success("Bill created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save bill"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (b: ApiAutoBill) => {
    try {
      await autoApi.bills.delete(b.id, stationId);
      toast.success("Bill deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const totals = {
    revenue: records.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + b.totalAmount, 0),
    outstanding: records.filter(b => b.paymentStatus !== "paid").reduce((s, b) => s + b.balance, 0),
    count: records.length,
  };

  const columns: Column<ApiAutoBill>[] = [
    { key: "billNo",        label: "Bill #",     render: b => <span className="font-mono text-xs">{b.billNo}</span>, sortable: true },
    { key: "date",          label: "Date",         render: b => b.date.split("T")[0], sortable: true },
    { key: "serviceRef",    label: "Service Ref",  render: b => b.serviceRef || "—" },
    { key: "customerName",  label: "Customer",     sortable: true },
    { key: "vehicleReg",    label: "Vehicle" },
    { key: "totalAmount",   label: "Total (Ksh)",  render: b => <span className="font-mono">Ksh {b.totalAmount.toLocaleString()}</span>, sortable: true },
    { key: "paidAmount",    label: "Paid (Ksh)",   render: b => `Ksh ${b.paidAmount.toLocaleString()}` },
    { key: "balance",       label: "Balance",      render: b => <span className={b.balance > 0 ? "text-destructive font-medium" : ""}>Ksh {b.balance.toLocaleString()}</span> },
    { key: "paymentMethod", label: "Method" },
    { key: "paymentStatus", label: "Status",       render: b => <StatusBadge status={b.paymentStatus} /> },
  ];

  const filters: FilterOption[] = [
    { key: "paymentStatus", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Partial", value: "partial" }] },
    { key: "paymentMethod", label: "Method", options: PAY_METHODS.map(m => ({ label: m, value: m })) },
  ];

  const exportColumns: ExportColumn<ApiAutoBill>[] = [
    { label: "Bill #",         value: b => b.billNo },
    { label: "Date",           value: b => b.date.split("T")[0] },
    { label: "Service Ref",    value: b => b.serviceRef || "—" },
    { label: "Customer",       value: b => b.customerName },
    { label: "Vehicle",        value: b => b.vehicleReg },
    { label: "Labour (Ksh)",   value: b => b.labourCharges, total: rows => rows.reduce((sum, b) => sum + b.labourCharges, 0) },
    { label: "Parts (Ksh)",    value: b => b.partsCost, total: rows => rows.reduce((sum, b) => sum + b.partsCost, 0) },
    { label: "Discount (Ksh)", value: b => b.discount, total: rows => rows.reduce((sum, b) => sum + b.discount, 0) },
    { label: "Total (Ksh)",    value: b => b.totalAmount, total: rows => rows.reduce((sum, b) => sum + b.totalAmount, 0) },
    { label: "Paid (Ksh)",     value: b => b.paidAmount, total: rows => rows.reduce((sum, b) => sum + b.paidAmount, 0) },
    { label: "Balance (Ksh)",  value: b => b.balance, total: rows => rows.reduce((sum, b) => sum + b.balance, 0) },
    { label: "Payment Method", value: b => b.paymentMethod },
    { label: "Status",         value: b => b.paymentStatus },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Revenue Collected</p>
          <p className="text-xl font-bold text-primary">Ksh {totals.revenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-xl font-bold text-destructive">Ksh {totals.outstanding.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Bills</p>
          <p className="text-xl font-bold">{totals.count}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Customer billing and payment tracking</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`auto-bills${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Automotive Bills"
            rows={visibleRecords}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New Bill</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["billNo", "customerName", "vehicleReg", "serviceRef"]}
        searchPlaceholder="Search bills..."
        filters={filters}
        onView={b => setViewing(b)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        onFilteredChange={setVisibleRecords}
        pendingDeleteIds={pendingDeleteIds}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Bill" : "New Bill"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Service Ref</Label><Input value={form.serviceRef} onChange={e => set("serviceRef", e.target.value)} placeholder="SR-..." /></div>
          <div><Label>Customer *</Label><Input value={form.customerName} onChange={e => set("customerName", e.target.value)} /></div>
          <div><Label>Vehicle Reg *</Label><Input value={form.vehicleReg} onChange={e => set("vehicleReg", e.target.value)} /></div>
          <div><Label>Labour Charges (Ksh)</Label><Input type="number" value={form.labourCharges || ""} onChange={e => set("labourCharges", +e.target.value)} /></div>
          <div><Label>Parts Cost (Ksh)</Label><Input type="number" value={form.partsCost || ""} onChange={e => set("partsCost", +e.target.value)} /></div>
          <div><Label>Discount (Ksh)</Label><Input type="number" value={form.discount || ""} onChange={e => set("discount", +e.target.value)} /></div>
          <div><Label>Total (Ksh)</Label><Input value={`Ksh ${totalAmount.toLocaleString()}`} disabled className="font-mono" /></div>
          <div><Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Payment Status</Label>
            <Select value={form.paymentStatus} onValueChange={v => set("paymentStatus", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Paid Amount (Ksh)</Label><Input type="number" value={form.paidAmount || ""} onChange={e => set("paidAmount", +e.target.value)} /></div>
          <div><Label>Balance (Ksh)</Label><Input value={`Ksh ${balance.toLocaleString()}`} disabled className={`font-mono ${balance > 0 ? "text-destructive" : ""}`} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Bill Details" isView
        footerExtra={<>
          <Button variant="outline" size="sm" onClick={() => viewing && openPdfInNewTab(`/auto/bills/${viewing.id}/receipt.pdf`)}><Printer className="h-3.5 w-3.5 mr-1.5" />Print</Button>
          <Button variant="outline" size="sm" onClick={() => viewing && downloadPdf(`/auto/bills/${viewing.id}/receipt.pdf`, `${viewing.billNo}.pdf`)}><Download className="h-3.5 w-3.5 mr-1.5" />Download</Button>
        </>}>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Bill #:</span> <span className="font-mono">{viewing.billNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Service Ref:</span> {viewing.serviceRef || "—"}</div>
            <div><span className="text-muted-foreground">Customer:</span> {viewing.customerName}</div>
            <div><span className="text-muted-foreground">Vehicle:</span> {viewing.vehicleReg}</div>
            <div><span className="text-muted-foreground">Labour:</span> Ksh {viewing.labourCharges.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Parts:</span> Ksh {viewing.partsCost.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Discount:</span> Ksh {viewing.discount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Total:</span> <strong>Ksh {viewing.totalAmount.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Paid:</span> Ksh {viewing.paidAmount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Balance:</span> <span className={viewing.balance > 0 ? "text-destructive font-medium" : ""}>Ksh {viewing.balance.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
