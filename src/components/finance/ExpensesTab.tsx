import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { financeApi, ApiFinanceExpense } from "@/lib/financeApi";
import { useActiveStation } from "@/lib/useActiveStation";

const modules            = ["General", "Fuel", "LPG", "Water", "Automotive", "Car Wash"];
const expenseCategories  = ["Fuel Purchase", "LPG Stock", "Utilities", "Salaries", "Maintenance", "Supplies", "Transport", "Rent", "Insurance", "Miscellaneous"];
const paymentMethods     = ["Cash", "M-Pesa", "Bank Transfer", "Cheque"];

const blank: Partial<ApiFinanceExpense> = { date: new Date().toISOString().slice(0, 10), module: "General", status: "pending" };

const columns: Column<ApiFinanceExpense>[] = [
  { key: "date",          label: "Date",        sortable: true },
  { key: "module",        label: "Module" },
  { key: "category",      label: "Category" },
  { key: "vendor",        label: "Vendor",      render: r => r.vendor || "—" },
  { key: "amount",        label: "Amount (Ksh)", sortable: true, render: r => `Ksh ${r.amount.toLocaleString()}` },
  { key: "paymentMethod", label: "Payment" },
  { key: "status",        label: "Status",       render: r => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "module",   label: "Module",   options: modules.map(m => ({ label: m, value: m })) },
  { key: "category", label: "Category", options: expenseCategories.map(c => ({ label: c, value: c })) },
];

export function ExpensesTab() {
  const { stationId } = useActiveStation();
  const [data,    setData]    = useState<ApiFinanceExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ mode: "add" | "edit" | "view"; id?: string } | null>(null);
  const [form,    setForm]    = useState<Partial<ApiFinanceExpense>>({ ...blank });
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.expenses.list(stationId);
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load expenses"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof ApiFinanceExpense, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm({ ...blank, date: new Date().toISOString().slice(0, 10) }); setModal({ mode: "add" }); };
  const openEdit = (r: ApiFinanceExpense) => { setForm({ ...r }); setModal({ mode: "edit", id: r.id }); };
  const openView = (r: ApiFinanceExpense) => { setForm({ ...r }); setModal({ mode: "view", id: r.id }); };

  const handleSave = async () => {
    if (!form.description || !form.amount) return toast.error("Description and amount are required");
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await financeApi.expenses.create(form, stationId);
        toast.success("Expense logged");
      } else if (modal?.mode === "edit" && modal.id) {
        await financeApi.expenses.update(modal.id, form);
        toast.success("Expense updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (r: ApiFinanceExpense) => {
    try { await financeApi.expenses.delete(r.id); toast.success("Expense deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} expense entries</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Log Expense</Button>
        </div>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["vendor", "description"]} searchPlaceholder="Search expenses..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />

      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Log Expense" : modal.mode === "edit" ? "Edit Expense" : "Expense Details"} onClose={() => setModal(null)} onSubmit={handleSave} isView={isView} submitLabel={saving ? "Saving..." : modal.mode === "edit" ? "Update" : "Log"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={e => set("date", e.target.value)} disabled={isView} /></div>
            <div><Label>Module</Label>
              <Select value={form.module || "General"} onValueChange={v => set("module", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={form.category || "__none__"} onValueChange={v => set("category", v === "__none__" ? "" : v)} disabled={isView}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select —</SelectItem>
                  {expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (Ksh)</Label><Input type="number" value={form.amount || ""} onChange={e => set("amount", Number(e.target.value))} disabled={isView} /></div>
            <div><Label>Vendor</Label><Input value={form.vendor || ""} onChange={e => set("vendor", e.target.value)} disabled={isView} /></div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod || "Cash"} onValueChange={v => set("paymentMethod", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{paymentMethods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description || ""} onChange={e => set("description", e.target.value)} disabled={isView} /></div>
            <div><Label>Approved By</Label><Input value={form.approvedBy || ""} onChange={e => set("approvedBy", e.target.value)} disabled={isView} /></div>
            <div><Label>Status</Label>
              <Select value={form.status || "pending"} onValueChange={v => set("status", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
