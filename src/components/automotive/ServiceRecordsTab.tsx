import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { autoApi, ApiAutoServiceRecord, ApiAutoServicePrice, ApiAutoTechnician } from "@/lib/autoApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";

const STATUSES = ["pending", "in-progress", "completed", "invoiced"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), vehicleReg: "", vehicleMake: "", customerName: "", customerPhone: "",
  serviceType: "", description: "", technician: "", estimatedCost: 0,
  actualCost: 0, status: "pending", startTime: "", endTime: "",
};

export function ServiceRecordsTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();
  const can = usePermissions();
  const canManage = can("auto.services.record");

  const [records, setRecords]         = useState<ApiAutoServiceRecord[]>([]);
  const [pricing, setPricing]         = useState<ApiAutoServicePrice[]>([]);
  const [technicians, setTechnicians] = useState<ApiAutoTechnician[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState<ApiAutoServiceRecord | null>(null);
  const [viewing, setViewing]         = useState<ApiAutoServiceRecord | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [recRes, priceRes, techRes] = await Promise.all([
        autoApi.serviceRecords.list({}, stationId),
        autoApi.pricing.list({ status: "active" }, stationId),
        autoApi.technicians.list({ status: "active" }, stationId),
      ]);
      setRecords(recRes.data ?? []);
      setPricing(priceRes.data ?? []);
      setTechnicians(techRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load service records"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const noPricing = pricing.length === 0;
  const noTechs   = technicians.length === 0;

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleServiceTypeChange = (serviceName: string) => {
    const price = pricing.find(p => p.serviceName === serviceName);
    setForm(f => ({
      ...f,
      serviceType: serviceName,
      estimatedCost: price?.totalPrice ?? f.estimatedCost,
    }));
  };

  const openNew = () => {
    setEditing(null);
    const defaultTech = technicians[0];
    const defaultSvc  = pricing[0];
    setForm({
      ...emptyForm,
      date: today(),
      technician: defaultTech?.name ?? (user.name || ""),
      serviceType: defaultSvc?.serviceName ?? "",
      estimatedCost: defaultSvc?.totalPrice ?? 0,
    });
    setModalOpen(true);
  };

  const openEdit = (r: ApiAutoServiceRecord) => {
    setEditing(r);
    setForm({
      date: r.date.split("T")[0], vehicleReg: r.vehicleReg, vehicleMake: r.vehicleMake ?? "",
      customerName: r.customerName, customerPhone: r.customerPhone ?? "",
      serviceType: r.serviceType, description: r.description ?? "", technician: r.technician ?? "",
      estimatedCost: r.estimatedCost, actualCost: r.actualCost, status: r.status,
      startTime: r.startTime ?? "", endTime: r.endTime ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vehicleReg || !form.customerName || !form.serviceType)
      return toast.error("Vehicle reg, customer name, and service type are required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        vehicleMake: form.vehicleMake || undefined,
        customerPhone: form.customerPhone || undefined,
        description: form.description || undefined,
        technician: form.technician || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
      };
      if (editing) {
        await autoApi.serviceRecords.update(editing.id, payload, stationId);
        toast.success("Service record updated");
      } else {
        await autoApi.serviceRecords.create(payload, stationId);
        toast.success("Service record created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (r: ApiAutoServiceRecord) => {
    try {
      await autoApi.serviceRecords.delete(r.id, stationId);
      toast.success("Record deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const stats = {
    pending:    records.filter(r => r.status === "pending").length,
    inProgress: records.filter(r => r.status === "in-progress").length,
    completed:  records.filter(r => r.status === "completed").length,
  };

  const columns: Column<ApiAutoServiceRecord>[] = [
    { key: "serviceNo",    label: "Service #",   render: r => <span className="font-mono text-xs">{r.serviceNo}</span>, sortable: true },
    { key: "date",         label: "Date",          render: r => r.date.split("T")[0], sortable: true },
    { key: "vehicleReg",   label: "Vehicle",       sortable: true },
    { key: "vehicleMake",  label: "Make/Model",    render: r => r.vehicleMake || "—" },
    { key: "customerName", label: "Customer",      sortable: true },
    { key: "serviceType",  label: "Service" },
    { key: "technician",   label: "Technician",    render: r => r.technician || "—" },
    { key: "estimatedCost",label: "Est. Cost",     render: r => `Ksh ${r.estimatedCost.toLocaleString()}` },
    { key: "actualCost",   label: "Actual Cost",   render: r => r.actualCost ? `Ksh ${r.actualCost.toLocaleString()}` : "—" },
    { key: "status",       label: "Status",        render: r => <StatusBadge status={r.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status",      label: "Status",  options: STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })) },
    { key: "serviceType", label: "Service", options: pricing.map(p => ({ label: p.serviceName, value: p.serviceName })) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
      </div>

      {(noPricing || noTechs) && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {noPricing && "No service types configured — add them in the Pricing tab. "}
          {noTechs && "No active technicians configured — add them in the Technicians tab."}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Vehicle service and repair records</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New Service</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["serviceNo", "vehicleReg", "customerName", "technician", "serviceType"]}
        searchPlaceholder="Search records..."
        filters={filters}
        onView={r => setViewing(r)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Service Record" : "New Service Record"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Create"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Vehicle Reg *</Label><Input value={form.vehicleReg} onChange={e => set("vehicleReg", e.target.value)} placeholder="KBZ 123A" /></div>
          <div><Label>Make/Model</Label><Input value={form.vehicleMake} onChange={e => set("vehicleMake", e.target.value)} placeholder="Toyota Hilux" /></div>
          <div><Label>Customer Name *</Label><Input value={form.customerName} onChange={e => set("customerName", e.target.value)} /></div>
          <div><Label>Customer Phone</Label><Input value={form.customerPhone} onChange={e => set("customerPhone", e.target.value)} /></div>
          <div>
            <Label>Service Type *</Label>
            {pricing.length > 0 ? (
              <Select value={form.serviceType} onValueChange={handleServiceTypeChange}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {pricing.map(p => (
                    <SelectItem key={p.id} value={p.serviceName}>
                      {p.serviceName} — Ksh {p.totalPrice.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.serviceType} onChange={e => set("serviceType", e.target.value)} placeholder="e.g. Full Service" />
            )}
          </div>
          <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} /></div>
          <div>
            <Label>Technician</Label>
            {technicians.length > 0 ? (
              <Select value={form.technician} onValueChange={v => set("technician", v)}>
                <SelectTrigger><SelectValue placeholder="Assign technician" /></SelectTrigger>
                <SelectContent>
                  {technicians.map(t => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}{t.specialization ? ` (${t.specialization})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.technician} onChange={e => set("technician", e.target.value)} />
            )}
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estimated Cost (Ksh)</Label>
            <Input type="number" value={form.estimatedCost || ""} onChange={e => set("estimatedCost", +e.target.value)} />
            {form.serviceType && pricing.length > 0 && <p className="text-xs text-muted-foreground mt-1">Auto-filled from service pricing</p>}
          </div>
          <div><Label>Actual Cost (Ksh)</Label><Input type="number" value={form.actualCost || ""} onChange={e => set("actualCost", +e.target.value)} /></div>
          <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} /></div>
          <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Service Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Service #:</span> <span className="font-mono">{viewing.serviceNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Vehicle:</span> {viewing.vehicleReg}</div>
            <div><span className="text-muted-foreground">Make/Model:</span> {viewing.vehicleMake || "—"}</div>
            <div><span className="text-muted-foreground">Customer:</span> {viewing.customerName}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.customerPhone || "—"}</div>
            <div><span className="text-muted-foreground">Service:</span> {viewing.serviceType}</div>
            <div><span className="text-muted-foreground">Technician:</span> {viewing.technician || "—"}</div>
            <div><span className="text-muted-foreground">Est. Cost:</span> Ksh {viewing.estimatedCost.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Actual Cost:</span> {viewing.actualCost ? `Ksh ${viewing.actualCost.toLocaleString()}` : "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Start:</span> {viewing.startTime || "—"}</div>
            {viewing.endTime && <div><span className="text-muted-foreground">End:</span> {viewing.endTime}</div>}
            {viewing.description && <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {viewing.description}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
