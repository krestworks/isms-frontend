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
import { lpgApi, ApiLpgInvoice, ApiLpgInvoiceItem } from "@/lib/lpgApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";
import { openPdfInNewTab, downloadPdf } from "@/lib/pdfDoc";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];
const today = () => new Date().toISOString().split("T")[0];

/** An invoice reads as overdue once its due date has passed and it's still unpaid — computed, never stored, so it can't drift from "today". */
function isOverdue(inv: ApiLpgInvoice): boolean {
  return inv.paymentStatus === "pending" && !!inv.dueDate && inv.dueDate.split("T")[0] < today();
}
function displayStatus(inv: ApiLpgInvoice): string {
  return isOverdue(inv) ? "overdue" : inv.paymentStatus;
}

const emptyItem = (): ApiLpgInvoiceItem => ({ description: "", qty: 1, unitPrice: 0, total: 0 });

const emptyForm = {
  date: today(), dueDate: "", client: "", clientPhone: "", clientAddress: "",
  type: "invoice", paymentStatus: "pending", paymentMethod: "Invoice", paidDate: "",
  vatRate: 16, discount: 0,
  items: [emptyItem()],
};

function recalc(items: ApiLpgInvoiceItem[], vatRate: number, discount: number) {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const vatAmount = Math.round(subtotal * vatRate / 100);
  return { subtotal, vatAmount, totalAmount: subtotal + vatAmount - discount };
}

export function InvoicesTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("lpg.invoices.manage");

  const [records, setRecords]   = useState<ApiLpgInvoice[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("LpgInvoice", stationId, records.length);
  const [visibleRecords, setVisibleRecords] = useState<ApiLpgInvoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiLpgInvoice | null>(null);
  const [viewing, setViewing]   = useState<ApiLpgInvoice | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  const [emailTarget, setEmailTarget] = useState<ApiLpgInvoice | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const openEmail = (inv: ApiLpgInvoice) => { setEmailTarget(inv); setEmailAddress(""); };

  const handleSendEmail = async () => {
    if (!emailTarget) return;
    if (!emailAddress.trim()) return toast.error("Enter a recipient email address");
    setSendingEmail(true);
    try {
      const res = await lpgApi.invoices.email(emailTarget.id, { email: emailAddress.trim(), name: emailTarget.client }, stationId);
      toast.success(res.data?.dev ? "Email logged (SMTP not configured in this environment)" : `Invoice emailed to ${emailAddress.trim()}`);
      setEmailTarget(null);
    } catch (e: any) { toast.error(e?.message || "Failed to send invoice email"); }
    finally { setSendingEmail(false); }
  };

  const handlePrint = (inv: ApiLpgInvoice) => openPdfInNewTab(`/lpg/invoices/${inv.id}/pdf`)
    .catch((e: any) => toast.error(e?.message || "Failed to open invoice PDF"));
  const handleDownload = (inv: ApiLpgInvoice) => downloadPdf(`/lpg/invoices/${inv.id}/pdf`, `${inv.invoiceNo}.pdf`)
    .catch((e: any) => toast.error(e?.message || "Failed to download invoice PDF"));

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await lpgApi.invoices.list({ from: fromDate || undefined, to: toDate || undefined }, stationId);
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
  const openEdit = (inv: ApiLpgInvoice) => {
    setEditing(inv);
    setForm({
      date: inv.date.split("T")[0], dueDate: inv.dueDate?.split("T")[0] ?? "",
      client: inv.client, clientPhone: inv.clientPhone ?? "", clientAddress: inv.clientAddress ?? "",
      type: inv.type, paymentStatus: inv.paymentStatus, paymentMethod: inv.paymentMethod,
      paidDate: inv.paidDate?.split("T")[0] ?? "", vatRate: inv.vatRate, discount: inv.discount,
      items: inv.items.length ? inv.items : [emptyItem()],
    });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const updateItem = (idx: number, field: keyof ApiLpgInvoiceItem, value: string | number) => {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, [field]: value };
        next.total = next.qty * next.unitPrice;
        return next;
      });
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const computed = recalc(form.items, form.vatRate, form.discount);

  const handleSave = async () => {
    if (!form.client) return toast.error("Client is required");
    if (!form.items.length) return toast.error("At least one line item is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...computed,
        dueDate: form.dueDate || undefined,
        paidDate: form.paidDate || undefined,
        clientPhone: form.clientPhone || undefined,
        clientAddress: form.clientAddress || undefined,
      };
      if (editing) {
        await lpgApi.invoices.update(editing.id, payload, stationId);
        toast.success("Invoice updated");
      } else {
        await lpgApi.invoices.create(payload, stationId);
        toast.success("Invoice created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save invoice"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (inv: ApiLpgInvoice) => {
    try {
      await lpgApi.invoices.delete(inv.id, stationId);
      toast.success("Invoice deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const rows = records.map(r => ({ ...r, displayStatus: displayStatus(r) }));

  const columns: Column<typeof rows[number]>[] = [
    { key: "invoiceNo",    label: "Invoice #",    sortable: true, render: i => <span className="font-mono text-xs">{i.invoiceNo}</span> },
    { key: "date",         label: "Date",          render: i => i.date.split("T")[0], sortable: true },
    { key: "client",       label: "Client",        sortable: true },
    { key: "type",         label: "Type",          render: i => <span className="capitalize text-xs">{i.type}</span> },
    { key: "subtotal",     label: "Subtotal (Ksh)",render: i => i.subtotal.toLocaleString() },
    { key: "vatAmount",    label: "VAT (Ksh)",     render: i => i.vatAmount.toLocaleString() },
    { key: "totalAmount",  label: "Total (Ksh)",   sortable: true, render: i => <span className="font-mono font-bold">Ksh {i.totalAmount.toLocaleString()}</span> },
    { key: "displayStatus",label: "Status",        render: i => <StatusBadge status={i.displayStatus} /> },
    { key: "paymentMethod",label: "Payment" },
  ];

  const filters: FilterOption[] = [
    { key: "displayStatus", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }, { label: "Overdue", value: "overdue" }] },
    { key: "type",          label: "Type",   options: [{ label: "Invoice", value: "invoice" }, { label: "Receipt", value: "receipt" }] },
  ];

  const exportColumns: ExportColumn<typeof rows[number]>[] = [
    { label: "Invoice #",     value: i => i.invoiceNo },
    { label: "Date",          value: i => i.date.split("T")[0] },
    { label: "Due Date",      value: i => i.dueDate?.split("T")[0] || "—" },
    { label: "Client",        value: i => i.client },
    { label: "Type",          value: i => i.type },
    { label: "Subtotal (Ksh)",value: i => i.subtotal },
    { label: "VAT (Ksh)",     value: i => i.vatAmount },
    { label: "Discount (Ksh)",value: i => i.discount },
    { label: "Total (Ksh)",   value: i => i.totalAmount },
    { label: "Status",        value: i => i.displayStatus },
    { label: "Payment Method",value: i => i.paymentMethod },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Receipts and invoices for all LPG transactions</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`lpg-invoices${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="LPG Invoices"
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
            <div><Label>Client Phone</Label><Input value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} /></div>
            <div className="col-span-2"><Label>Client Address</Label><Input value={form.clientAddress} onChange={e => set("clientAddress", e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="receipt">Receipt</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Payment Status</Label>
              <Select value={form.paymentStatus} onValueChange={v => set("paymentStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Discount (Ksh)</Label><Input type="number" value={form.discount || ""} onChange={e => set("discount", +e.target.value)} /></div>
          </div>

          <Separator />
          <Label>Line Items</Label>
          <div className="space-y-2">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
              <span>Description</span><span>Qty</span><span>Unit Price</span><span>Total</span><span />
            </div>
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
                <Input placeholder="e.g. 13kg Exchange" value={it.description} onChange={e => updateItem(i, "description", e.target.value)} />
                <Input type="number" value={it.qty || ""} onChange={e => updateItem(i, "qty", +e.target.value)} />
                <Input type="number" value={it.unitPrice || ""} onChange={e => updateItem(i, "unitPrice", +e.target.value)} />
                <Input value={`Ksh ${it.total.toLocaleString()}`} disabled className="font-mono text-xs" />
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(i)} disabled={form.items.length === 1}>×</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
          </div>

          <Separator />
          <div className="flex justify-end">
            <div className="w-52 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">Ksh {computed.subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT ({form.vatRate}%)</span><span className="font-mono">Ksh {computed.vatAmount.toLocaleString()}</span></div>
              {form.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono text-green-600">-Ksh {form.discount.toLocaleString()}</span></div>}
              <Separator />
              <div className="flex justify-between font-bold"><span>Total</span><span className="font-mono">Ksh {computed.totalAmount.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </ModalForm>

      {/* View modal */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title={viewing?.type === "receipt" ? "Receipt" : "Invoice"} isView
        footerExtra={<>
          <Button variant="outline" size="sm" onClick={() => viewing && handlePrint(viewing)}><Printer className="h-3.5 w-3.5 mr-1.5" />Print</Button>
          <Button variant="outline" size="sm" onClick={() => viewing && handleDownload(viewing)}><Download className="h-3.5 w-3.5 mr-1.5" />Download</Button>
          <Button variant="outline" size="sm" onClick={() => viewing && openEmail(viewing)}><Mail className="h-3.5 w-3.5 mr-1.5" />Email</Button>
        </>}>
        {viewing && (
          <div className="border border-border rounded-lg p-6 space-y-4 bg-background">
            <div ref={viewRef} className="space-y-4">
            <BrandedDocHeader
              docTitle={viewing.type === "receipt" ? "RECEIPT" : "TAX INVOICE"}
              docRef={viewing.invoiceNo}
              docDate={viewing.date.split("T")[0]}
            />
            <div className="flex justify-end -mt-4"><StatusBadge status={displayStatus(viewing)} /></div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Bill To</p>
                <p className="font-medium">{viewing.client}</p>
                {viewing.clientPhone && <p className="text-xs text-muted-foreground">{viewing.clientPhone}</p>}
                {viewing.clientAddress && <p className="text-xs text-muted-foreground">{viewing.clientAddress}</p>}
              </div>
              <div className="text-right text-sm">
                <div><span className="text-muted-foreground text-xs">Date: </span>{viewing.date.split("T")[0]}</div>
                {viewing.dueDate && <div><span className="text-muted-foreground text-xs">Due: </span>{viewing.dueDate.split("T")[0]}</div>}
              </div>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50"><th className="text-left p-2 text-xs font-semibold">Description</th><th className="text-right p-2 text-xs">Qty</th><th className="text-right p-2 text-xs">Price</th><th className="text-right p-2 text-xs">Total</th></tr></thead>
                <tbody>
                  {viewing.items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-right">{it.qty}</td>
                      <td className="p-2 text-right font-mono">Ksh {it.unitPrice.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono">Ksh {it.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <div className="w-52 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">Ksh {viewing.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT ({viewing.vatRate}%)</span><span className="font-mono">Ksh {viewing.vatAmount.toLocaleString()}</span></div>
                {viewing.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono text-green-600">-Ksh {viewing.discount.toLocaleString()}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold"><span>Total</span><span className="font-mono">Ksh {viewing.totalAmount.toLocaleString()}</span></div>
              </div>
            </div>
            {viewing.paidDate && (
              <p className="text-xs text-muted-foreground text-center">Paid on {viewing.paidDate.split("T")[0]} via {viewing.paymentMethod}</p>
            )}
            </div>{/* /viewRef */}
          </div>
        )}
      </ModalForm>

      {/* Email invoice modal */}
      <ModalForm open={!!emailTarget} onClose={() => setEmailTarget(null)}
        title={`Email ${emailTarget?.type === "receipt" ? "Receipt" : "Invoice"} ${emailTarget?.invoiceNo ?? ""}`}
        onSubmit={handleSendEmail} submitLabel={sendingEmail ? "Sending..." : "Send"} submitDisabled={sendingEmail}>
        <div className="space-y-2">
          <Label>Recipient Email *</Label>
          <Input type="email" autoFocus value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="client@example.com" />
          <p className="text-xs text-muted-foreground">Sends a formatted copy of this {emailTarget?.type === "receipt" ? "receipt" : "invoice"} to the address above.</p>
        </div>
      </ModalForm>
    </div>
  );
}
