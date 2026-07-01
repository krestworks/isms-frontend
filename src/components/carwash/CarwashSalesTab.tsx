import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { carwashApi, ApiCarwashSale, ApiCarwashPackage } from "@/lib/carwashApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { exportToCsv } from "@/lib/exportCsv";

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), vehicleReg: "", washPackage: "",
  attendant: "", paymentMethod: "Cash", amount: 0, status: "paid",
};

export function CarwashSalesTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();
  const can = usePermissions();
  const canManage = can("carwash.sales.record");

  const [records, setRecords]     = useState<ApiCarwashSale[]>([]);
  const [packages, setPackages]   = useState<ApiCarwashPackage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fromDate, setFromDate]   = useState(today());
  const [toDate, setToDate]       = useState(today());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<ApiCarwashSale | null>(null);
  const [viewing, setViewing]     = useState<ApiCarwashSale | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [salesRes, pkgRes] = await Promise.all([
        carwashApi.sales.list({ from: fromDate, to: toDate }, stationId),
        carwashApi.packages.list({ status: "active" }, stationId),
      ]);
      setRecords(salesRes.data ?? []);
      setPackages(pkgRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load sales"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const noPackages = packages.length === 0;

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handlePackageChange = (name: string) => {
    const pkg = packages.find(p => p.name === name);
    setForm(f => ({ ...f, washPackage: name, amount: pkg?.price ?? f.amount }));
  };

  const openNew = () => {
    const defaultPkg = packages[0];
    setEditing(null);
    setForm({
      ...emptyForm,
      date: today(),
      attendant: user.name || "",
      washPackage: defaultPkg?.name ?? "",
      amount: defaultPkg?.price ?? 0,
    });
    setModalOpen(true);
  };

  const openEdit = (s: ApiCarwashSale) => {
    setEditing(s);
    setForm({
      date: s.date.split("T")[0], vehicleReg: s.vehicleReg, washPackage: s.washPackage,
      attendant: s.attendant ?? "", paymentMethod: s.paymentMethod, amount: s.amount, status: s.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vehicleReg || !form.washPackage) return toast.error("Vehicle reg and package are required");
    if (!form.amount) return toast.error("Amount is required");
    setSaving(true);
    try {
      const payload = { ...form, attendant: form.attendant || undefined };
      if (editing) {
        await carwashApi.sales.update(editing.id, payload, stationId);
        toast.success("Sale updated");
      } else {
        await carwashApi.sales.create(payload, stationId);
        toast.success("Sale recorded");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save sale"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s: ApiCarwashSale) => {
    try {
      await carwashApi.sales.delete(s.id, stationId);
      toast.success("Sale deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const totals = {
    revenue: records.filter(s => s.status !== "voided").reduce((a, s) => a + s.amount, 0),
    count:   records.filter(s => s.status !== "voided").length,
  };

  const columns: Column<ApiCarwashSale>[] = [
    { key: "receiptNo",    label: "Receipt #",   render: s => <span className="font-mono text-xs">{s.receiptNo}</span>, sortable: true },
    { key: "date",         label: "Date",         render: s => s.date.split("T")[0], sortable: true },
    { key: "vehicleReg",   label: "Vehicle Reg" },
    { key: "washPackage",  label: "Package" },
    { key: "attendant",    label: "Attendant",    render: s => s.attendant || "—" },
    { key: "paymentMethod",label: "Payment" },
    { key: "amount",       label: "Amount (Ksh)", render: s => <span className="font-mono">Ksh {s.amount.toLocaleString()}</span>, sortable: true },
    { key: "status",       label: "Status",       render: s => <StatusBadge status={s.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status",        label: "Status",  options: [{ label: "Paid", value: "paid" }, { label: "Unpaid", value: "unpaid" }] },
    { key: "paymentMethod", label: "Payment", options: PAY_METHODS.map(m => ({ label: m, value: m })) },
    { key: "washPackage",   label: "Package", options: packages.map(p => ({ label: p.name, value: p.name })) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Record and track car wash sales</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(`carwash-sales-${today()}.csv`, records)}>
            <Download className="h-4 w-4 mr-1.5" />Export
          </Button>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && (
            <Button size="sm" onClick={openNew} disabled={noPackages} title={noPackages ? "Set up packages first" : ""}>
              <Plus className="h-4 w-4 mr-1.5" />Record Sale
            </Button>
          )}
        </div>
      </div>

      {noPackages && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No active wash packages configured. Go to Packages to create packages before recording sales.
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
        data={records} columns={columns}
        searchKeys={["receiptNo", "vehicleReg", "attendant"]}
        searchPlaceholder="Search sales..."
        filters={filters}
        onView={s => setViewing(s)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Sale" : "Record Sale"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Record"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Vehicle Reg *</Label><Input value={form.vehicleReg} onChange={e => set("vehicleReg", e.target.value)} placeholder="KBZ 123A" /></div>
          <div>
            <Label>Package *</Label>
            <Select value={form.washPackage} onValueChange={handlePackageChange}>
              <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
              <SelectContent>
                {packages.map(p => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name} — Ksh {p.price.toLocaleString()} ({p.duration} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Attendant</Label><Input value={form.attendant} onChange={e => set("attendant", e.target.value)} /></div>
          <div>
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => set("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (Ksh)</Label>
            <Input type="number" value={form.amount || ""} onChange={e => set("amount", +e.target.value)} />
            {form.washPackage && <p className="text-xs text-muted-foreground mt-1">Auto-filled from package price</p>}
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sale Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Receipt:</span> <span className="font-mono">{viewing.receiptNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Vehicle:</span> {viewing.vehicleReg}</div>
            <div><span className="text-muted-foreground">Package:</span> {viewing.washPackage}</div>
            <div><span className="text-muted-foreground">Attendant:</span> {viewing.attendant || "—"}</div>
            <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod}</div>
            <div><span className="text-muted-foreground">Amount:</span> <strong>Ksh {viewing.amount.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}

export default CarwashSalesTab;
