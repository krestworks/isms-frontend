import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizExpense } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

interface Props { business: ApiBizBusiness; }

const today        = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
const CATEGORIES = ["Utilities", "Supplies", "Maintenance", "Salaries", "Transport", "Marketing", "Miscellaneous"];
const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Bank Transfer"];

const emptyForm = { date: today(), description: "", amount: 0, category: "Miscellaneous", paymentMethod: "Cash", recordedBy: "" };

export function ExpensesTab({ business }: Props) {
  const can = usePermissions();
  const canManage = can("business.expenses.record");

  const [records,   setRecords]   = useState<ApiBizExpense[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("BizExpense", business.stationId, records.length);
  const [loading,   setLoading]   = useState(true);
  const [fromDate,  setFromDate]  = useState(firstOfMonth());
  const [toDate,    setToDate]    = useState(today());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<ApiBizExpense | null>(null);
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);
  const [visibleRecords, setVisibleRecords] = useState<ApiBizExpense[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bizApi.expenses.list(business.id, { from: fromDate, to: toDate });
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load expenses"); }
    finally { setLoading(false); }
  }, [business.id, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew  = () => { setEditing(null); setForm({ ...emptyForm, date: today() }); setModalOpen(true); };
  const openEdit = (e: ApiBizExpense) => {
    setEditing(e);
    setForm({ date: e.date, description: e.description, amount: e.amount, category: e.category ?? "Miscellaneous", paymentMethod: e.paymentMethod, recordedBy: e.recordedBy ?? "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) return toast.error("Description and amount are required");
    setSaving(true);
    try {
      const payload = { ...form, businessId: business.id };
      if (editing) { await bizApi.expenses.update(editing.id, payload); toast.success("Expense updated"); }
      else         { await bizApi.expenses.create(payload);              toast.success("Expense recorded"); }
      setModalOpen(false); load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (e: ApiBizExpense) => {
    try { await bizApi.expenses.delete(e.id); toast.success("Expense deleted"); load(); }
    catch (e: any) { toast.error((e as any)?.message || "Failed to delete"); }
  };

  const totalExpenses = visibleRecords.reduce((s, e) => s + e.amount, 0);

  const columns: Column<ApiBizExpense>[] = [
    { key: "date",          label: "Date",        sortable: true },
    { key: "description",   label: "Description" },
    { key: "category",      label: "Category",    render: e => e.category || "—" },
    { key: "paymentMethod", label: "Payment" },
    { key: "amount",        label: "Amount",      render: e => <span className="font-bold">Ksh {e.amount.toLocaleString()}</span>, sortable: true },
    { key: "recordedBy",    label: "By",          render: e => e.recordedBy || "—" },
  ];

  const exportColumns: ExportColumn<ApiBizExpense>[] = [
    { label: "Date",           value: e => e.date.split("T")[0] },
    { label: "Description",    value: e => e.description },
    { label: "Category",       value: e => e.category || "—" },
    { label: "Payment Method", value: e => e.paymentMethod },
    { label: "Amount (Ksh)",   value: e => e.amount },
    { label: "Recorded By",    value: e => e.recordedBy || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Business expense tracking</p>
        <div className="flex gap-2">
          <ExportMenu filename={`expenses_${fromDate}_to_${toDate}`} title="Business Expenses" rows={visibleRecords} columns={exportColumns} subtitle={`${fromDate} to ${toDate}`} />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Record Expense</Button>
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <Card><CardContent className="p-4">
        <p className="text-sm text-muted-foreground">Total Expenses ({records.length} records)</p>
        <p className="text-2xl font-bold text-destructive">Ksh {totalExpenses.toLocaleString()}</p>
      </CardContent></Card>

      <DataTable
        data={records} columns={columns}
        searchKeys={["description","category"]} searchPlaceholder="Search expenses..."
        onEdit={openEdit}
        onDelete={canManage ? handleDelete : undefined}
        onFilteredChange={setVisibleRecords}
        pendingDeleteIds={pendingDeleteIds}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Expense" : "Record Expense"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Record"}>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Amount (Ksh) *</Label><Input type="number" value={form.amount || ""} onChange={e => set("amount", +e.target.value)} /></div>
          <div className="col-span-2"><Label>Description *</Label><Input value={form.description} onChange={e => set("description", e.target.value)} /></div>
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Recorded By</Label><Input value={form.recordedBy} onChange={e => set("recordedBy", e.target.value)} /></div>
        </div>
      </ModalForm>
    </div>
  );
}
