import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { carwashApi, ApiCarwashBooking } from "@/lib/carwashApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const PACKAGES = ["Basic Rinse", "Full Wash", "Premium Detail", "Interior Clean"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), time: "", client: "", phone: "", vehicleReg: "", washPackage: "Full Wash", status: "pending",
};

export function BookingsTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("carwash.bookings.manage");

  const [records, setRecords]   = useState<ApiCarwashBooking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiCarwashBooking | null>(null);
  const [viewing, setViewing]   = useState<ApiCarwashBooking | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [visibleRecords, setVisibleRecords] = useState<ApiCarwashBooking[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await carwashApi.bookings.list({ from: fromDate || undefined, to: toDate || undefined }, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load bookings"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: today() }); setModalOpen(true); };
  const openEdit = (b: ApiCarwashBooking) => {
    setEditing(b);
    setForm({
      date: b.date.split("T")[0], time: b.time ?? "", client: b.client,
      phone: b.phone ?? "", vehicleReg: b.vehicleReg, washPackage: b.washPackage, status: b.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.client || !form.vehicleReg || !form.washPackage) return toast.error("Client, vehicle reg, and package are required");
    setSaving(true);
    try {
      const payload = { ...form, time: form.time || undefined, phone: form.phone || undefined };
      if (editing) {
        await carwashApi.bookings.update(editing.id, payload, stationId);
        toast.success("Booking updated");
      } else {
        await carwashApi.bookings.create(payload, stationId);
        toast.success("Booking created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save booking"); }
    finally { setSaving(false); }
  };

  const [pendingDelete, setPendingDelete] = useState<ApiCarwashBooking | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (b: ApiCarwashBooking) => setPendingDelete(b);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await carwashApi.bookings.delete(pendingDelete.id, stationId);
      toast.success("Booking deleted");
      setPendingDelete(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  const stats = {
    pending:   visibleRecords.filter(r => r.status === "pending").length,
    confirmed: visibleRecords.filter(r => r.status === "confirmed").length,
    completed: visibleRecords.filter(r => r.status === "completed").length,
  };

  const columns: Column<ApiCarwashBooking>[] = [
    { key: "bookingRef", label: "Ref #",       render: b => <span className="font-mono text-xs">{b.bookingRef}</span>, sortable: true },
    { key: "date",       label: "Date",          render: b => b.date.split("T")[0], sortable: true },
    { key: "time",       label: "Time",          render: b => b.time || "—" },
    { key: "client",     label: "Client",        sortable: true },
    { key: "phone",      label: "Phone",         render: b => b.phone || "—" },
    { key: "vehicleReg", label: "Vehicle Reg" },
    { key: "washPackage",label: "Package" },
    { key: "status",     label: "Status",        render: b => <StatusBadge status={b.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Confirmed", value: "confirmed" }, { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" }] },
    { key: "washPackage", label: "Package", options: PACKAGES.map(p => ({ label: p, value: p })) },
  ];

  const exportColumns: ExportColumn<ApiCarwashBooking>[] = [
    { label: "Ref #",   value: b => b.bookingRef },
    { label: "Date",    value: b => b.date.split("T")[0] },
    { label: "Time",    value: b => b.time || "—" },
    { label: "Client",  value: b => b.client },
    { label: "Phone",   value: b => b.phone || "—" },
    { label: "Vehicle", value: b => b.vehicleReg },
    { label: "Package", value: b => b.washPackage },
    { label: "Status",  value: b => b.status },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.confirmed}</p>
          <p className="text-xs text-muted-foreground">Confirmed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Scheduled wash appointments</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`carwash-bookings${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Car Wash Bookings"
            rows={visibleRecords}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New Booking</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["bookingRef", "client", "vehicleReg"]}
        searchPlaceholder="Search bookings..."
        filters={filters}
        onView={b => setViewing(b)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        onFilteredChange={setVisibleRecords}
      />

      <DangerConfirmModal
        open={!!pendingDelete}
        title={`Delete booking "${pendingDelete?.bookingRef}"?`}
        description="This booking will be permanently deleted."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Booking" : "New Booking"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Book"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Time</Label><Input type="time" value={form.time} onChange={e => set("time", e.target.value)} /></div>
          <div><Label>Client *</Label><Input value={form.client} onChange={e => set("client", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Vehicle Reg *</Label><Input value={form.vehicleReg} onChange={e => set("vehicleReg", e.target.value)} /></div>
          <div><Label>Package *</Label>
            <Select value={form.washPackage} onValueChange={v => set("washPackage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PACKAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Booking Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Ref #:</span> <span className="font-mono">{viewing.bookingRef}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Time:</span> {viewing.time || "—"}</div>
            <div><span className="text-muted-foreground">Client:</span> {viewing.client}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.phone || "—"}</div>
            <div><span className="text-muted-foreground">Vehicle:</span> {viewing.vehicleReg}</div>
            <div><span className="text-muted-foreground">Package:</span> {viewing.washPackage}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}

export default BookingsTab;
