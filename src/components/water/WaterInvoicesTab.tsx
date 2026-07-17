import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, Printer, Mail, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { BrandedDocHeader } from "@/components/shared/BrandedDocHeader";
import { waterApi, ApiWaterInvoice, ApiWaterInvoiceItem } from "@/lib/waterApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";
import { openPdfInNewTab, downloadPdf } from "@/lib/pdfDoc";

const today = () => new Date().toISOString().split("T")[0];
const emptyItem = (): ApiWaterInvoiceItem => ({ description: "", litres: 0, rate: 0, amount: 0 });

/** An invoice reads as overdue once its due date has passed and it's still unpaid — computed, never stored, so it can't drift from "today". */
function isOverdue(inv: ApiWaterInvoice): boolean {
  return inv.status === "pending" && !!inv.dueDate && inv.dueDate.split("T")[0] < today();
}
function displayStatus(inv: ApiWaterInvoice): string {
  return isOverdue(inv) ? "overdue" : inv.status;
}

const emptyForm = {
  date: today(), dueDate: "", client: "", type: "TAX INVOICE",
  status: "pending", items: [emptyItem()],
};

function recalc(items: ApiWaterInvoiceItem[]) {
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const vatAmount = Math.round(subtotal * 0.16);
  return { subtotal, vatAmount, totalAmount: subtotal + vatAmount };
}

export function WaterInvoicesTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("water.invoices.issue");

  const [records, setRecords]   = useState<ApiWaterInvoice[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("WaterInvoice", stationId, records.length);
  const [visibleRecords, setVisibleRecords] = useState<ApiWaterInvoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiWaterInvoice | null>(null);
  const [viewing, setViewing]   = useState<ApiWaterInvoice | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  const [emailTarget, setEmailTarget] = useState<ApiWaterInvoice | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const openEmail = (inv: ApiWaterInvoice) => { setEmailTarget(inv); setEmailAddress(""); };

  const handleSendEmail = async () => {
    if (!emailTarget) return;
    if (!emailAddress.trim()) return toast.error("Enter a recipient email address");
    setSendingEmail(true);
    try {
      const res = await waterApi.invoices.email(emailTarget.id, { email: emailAddress.trim(), name: emailTarget.client }, stationId);
      toast.success(res.data?.dev ? "Email logged (SMTP not configured in this environment)" : `Invoice emailed to ${emailAddress.trim()}`);
      setEmailTarget(null);
    } catch (e: any) { toast.error(e?.message || "Failed to send invoice email"); }
    finally { setSendingEmail(false); }
  };

  const handlePrint = (inv: ApiWaterInvoice) => openPdfInNewTab(`/water/invoices/${inv.id}/pdf`)
    .catch((e: any) => toast.error(e?.message || "Failed to open invoice PDF"));
  const handleDownload = (inv: ApiWaterInvoice) => downloadPdf(`/water/invoices/${inv.id}/pdf`, `${inv.invoiceNo}.pdf`)
    .catch((e: any) => toast.error(e?.message || "Failed to download invoice PDF"));

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await waterApi.invoices.list({ from: fromDate || undefined, to: toDate || undefined }, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load invoices"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: today(), items: [emptyItem()] });
    setModalOpen(true);
  };
  const openEdit = (inv: ApiWaterInvoice) => {
    setEditing(inv);
    setForm({
      date: inv.date.split("T")[0], dueDate: inv.dueDate?.split("T")[0] ?? "",
      client: inv.client, type: inv.type, status: inv.status,
      items: inv.items.length ? inv.items : [emptyItem()],
    });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const updateItem = (idx: number, field: keyof ApiWaterInvoiceItem, value: string | number) => {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, [field]: value };
        next.amount = next.litres * next.rate;
        return next;
      });
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const computed = recalc(form.items);

  const handleSave = async () => {
    if (!form.client) return toast.error("Client is required");
    setSaving(true);
    try {
      const payload = {
        ...form, ...computed,
        dueDate: form.dueDate || undefined,
      };
      if (editing) {
        await waterApi.invoices.update(editing.id, payload, stationId);
        toast.success("Invoice updated");
      } else {
        await waterApi.invoices.create(payload, stationId);
        toast.success("Invoice created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save invoice"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (inv: ApiWaterInvoice) => {
    try {
      await waterApi.invoices.delete(inv.id, stationId);
      toast.success("Invoice deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const rows = records.map(r => ({ ...r, displayStatus: displayStatus(r) }));

  const columns: Column<typeof rows[number]>[] = [
    { key: "invoiceNo",  label: "Invoice #",   sortable: true, render: i => <span className="font-mono text-xs">{i.invoiceNo}</span> },
    { key: "date",       label: "Date",          render: i => i.date.split("T")[0], sortable: true },
    { key: "client",     label: "Client",        sortable: true },
    { key: "type",       label: "Type",          render: i => <span className="text-xs">{i.type}</span> },
    { key: "subtotal",   label: "Subtotal (Ksh)",render: i => i.subtotal.toLocaleString() },
    { key: "vatAmount",  label: "VAT (Ksh)",     render: i => i.vatAmount.toLocaleString() },
    { key: "totalAmount",label: "Total (Ksh)",   sortable: true, render: i => <span className="font-mono font-bold">Ksh {i.totalAmount.toLocaleString()}</span> },
    { key: "displayStatus", label: "Status",     render: i => <StatusBadge status={i.displayStatus} /> },
  ];

  const filters: FilterOption[] = [
    { key: "displayStatus", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Overdue", value: "overdue" }] },
    { key: "type",   label: "Type",   options: [{ label: "Tax Invoice", value: "TAX INVOICE" }, { label: "Receipt", value: "RECEIPT" }] },
  ];

  const exportColumns: ExportColumn<typeof rows[number]>[] = [
    { label: "Invoice #",     value: i => i.invoiceNo },
    { label: "Date",          value: i => i.date.split("T")[0] },
    { label: "Due Date",      value: i => i.dueDate?.split("T")[0] || "—" },
    { label: "Client",        value: i => i.client },
    { label: "Type",          value: i => i.type },
    { label: "Subtotal (Ksh)",value: i => i.subtotal },
    { label: "VAT (Ksh)",     value: i => i.vatAmount },
    { label: "Total (Ksh)",   value: i => i.totalAmount },
    { label: "Status",        value: i => i.displayStatus },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Invoices and receipts for water sales</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`water-invoices${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Water Invoices"
            rows={visibleRecords.map(r => ({ ...r, displayStatus: displayStatus(r) }))}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Create Invoice</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <DataTable
        data={rows} columns={columns}
        searchKeys={["invoiceNo", "client"]}
        searchPlaceholder="Search invoices..."
        filters={filters}
        onView={i => setViewing(i)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        extraActions={[{ label: "Download", icon: Download, onClick: handleDownload }]}
        onFilteredChange={setVisibleRecords}
        pendingDeleteIds={pendingDeleteIds}
      />

      {/* Create / Edit modal */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Invoice" : "Create Invoice"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Create"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
            <div><Label>Client *</Label><Input value={form.client} onChange={e => set("client", e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="TAX INVOICE">Tax Invoice</SelectItem><SelectItem value="RECEIPT">Receipt</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <Label>Line Items</Label>
          <div className="space-y-2">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
              <span>Description</span><span>Litres</span><span>Rate (Ksh)</span><span>Amount</span><span />
            </div>
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
                <Input placeholder="e.g. Purified Water" value={it.description} onChange={e => updateItem(i, "description", e.target.value)} />
                <Input type="number" placeholder="0" value={it.litres || ""} onChange={e => updateItem(i, "litres", +e.target.value)} />
                <Input type="number" placeholder="0" step="0.01" value={it.rate || ""} onChange={e => updateItem(i, "rate", +e.target.value)} />
                <Input value={`Ksh ${it.amount.toLocaleString()}`} disabled className="font-mono text-xs" />
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(i)} disabled={form.items.length === 1}>×</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
          </div>

          <Separator />
          <div className="flex justify-end">
            <div className="w-52 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">Ksh {computed.subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT (16%)</span><span className="font-mono">Ksh {computed.vatAmount.toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between font-bold"><span>Total</span><span className="font-mono">Ksh {computed.totalAmount.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </ModalForm>

      {/* View modal */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title={viewing?.type ?? "Invoice"} isView
        footerExtra={<>
          <Button variant="outline" size="sm" onClick={() => viewing && handlePrint(viewing)}><Printer className="h-3.5 w-3.5 mr-1.5" />Print</Button>
          <Button variant="outline" size="sm" onClick={() => viewing && handleDownload(viewing)}><Download className="h-3.5 w-3.5 mr-1.5" />Download</Button>
          <Button variant="outline" size="sm" onClick={() => viewing && openEmail(viewing)}><Mail className="h-3.5 w-3.5 mr-1.5" />Email</Button>
        </>}>
        {viewing && (
          <div className="border border-border rounded-lg p-6 space-y-4 bg-background">
            <div ref={viewRef} className="space-y-4">
            <BrandedDocHeader
              docTitle={viewing.type}
              docRef={viewing.invoiceNo}
              docDate={viewing.date.split("T")[0]}
            />
            <div className="flex justify-end -mt-4"><StatusBadge status={displayStatus(viewing)} /></div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Bill To</p>
                <p className="font-medium">{viewing.client}</p>
              </div>
              <div className="text-right text-sm">
                <div><span className="text-muted-foreground text-xs">Date: </span>{viewing.date.split("T")[0]}</div>
                {viewing.dueDate && <div><span className="text-muted-foreground text-xs">Due: </span>{viewing.dueDate.split("T")[0]}</div>}
              </div>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50"><th className="text-left p-2 text-xs font-semibold">Description</th><th className="text-right p-2 text-xs">Litres</th><th className="text-right p-2 text-xs">Rate</th><th className="text-right p-2 text-xs">Amount</th></tr></thead>
                <tbody>
                  {viewing.items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-right">{(it.litres ?? 0).toLocaleString()} L</td>
                      <td className="p-2 text-right font-mono">Ksh {it.rate ?? 0}</td>
                      <td className="p-2 text-right font-mono">Ksh {(it.amount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <div className="w-52 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">Ksh {viewing.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (16%)</span><span className="font-mono">Ksh {viewing.vatAmount.toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Total</span><span className="font-mono">Ksh {viewing.totalAmount.toLocaleString()}</span></div>
              </div>
            </div>
            </div>{/* /viewRef */}
          </div>
        )}
      </ModalForm>

      {/* Email invoice modal */}
      <ModalForm open={!!emailTarget} onClose={() => setEmailTarget(null)}
        title={`Email ${emailTarget?.type ?? "Invoice"} ${emailTarget?.invoiceNo ?? ""}`}
        onSubmit={handleSendEmail} submitLabel={sendingEmail ? "Sending..." : "Send"} submitDisabled={sendingEmail}>
        <div className="space-y-2">
          <Label>Recipient Email *</Label>
          <Input type="email" autoFocus value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="client@example.com" />
          <p className="text-xs text-muted-foreground">Sends a formatted copy of this invoice to the address above.</p>
        </div>
      </ModalForm>
    </div>
  );
}
