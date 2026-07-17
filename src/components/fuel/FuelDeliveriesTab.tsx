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
import { fuelApi, ApiFuelDelivery, ApiFuelTank } from "@/lib/fuelApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = { tankId: "", date: today(), litres: 0, supplier: "", deliveryNote: "" };

export function FuelDeliveriesTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();
  const can = usePermissions();
  const canRecord = can("fuel.deliveries.record");

  const [deliveries, setDeliveries] = useState<ApiFuelDelivery[]>([]);
  const [tanks, setTanks]           = useState<ApiFuelTank[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fromDate, setFromDate]     = useState(today());
  const [toDate, setToDate]         = useState(today());
  const [modalOpen, setModalOpen]   = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [visibleDeliveries, setVisibleDeliveries] = useState<ApiFuelDelivery[]>([]);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [delRes, tankRes] = await Promise.all([
        fuelApi.deliveries.list({ from: fromDate, to: toDate }, stationId),
        fuelApi.tanks.list(stationId),
      ]);
      setDeliveries(delRes.data ?? []);
      setTanks(tankRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load deliveries"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    const defaultTank = tanks[0];
    setForm({ ...emptyForm, date: today(), tankId: defaultTank?.id ?? "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.tankId || !form.litres || !form.date)
      return toast.error("Tank, date and litres are required");
    setSaving(true);
    try {
      await fuelApi.deliveries.create({
        tankId: form.tankId,
        date: form.date,
        litres: form.litres,
        supplier: form.supplier || undefined,
        deliveryNote: form.deliveryNote || undefined,
      }, stationId);
      toast.success("Delivery recorded");
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to record delivery"); }
    finally { setSaving(false); }
  };

  const totalLitres = deliveries.reduce((a, d) => a + d.litres, 0);

  const columns: Column<ApiFuelDelivery>[] = [
    { key: "date",         label: "Date",         render: d => d.date.split("T")[0], sortable: true },
    { key: "tank",         label: "Tank",         render: d => d.tank ? `${d.tank.name} (${d.tank.fuelType})` : "—" },
    { key: "litres",       label: "Litres",       render: d => <span className="font-mono">{d.litres.toLocaleString()} L</span>, sortable: true },
    { key: "supplier",     label: "Supplier",     render: d => d.supplier || "—" },
    { key: "deliveryNote", label: "Delivery Note", render: d => d.deliveryNote || "—" },
    { key: "recordedBy",   label: "Recorded By",  render: d => d.recordedBy || "—" },
  ];

  const exportColumns: ExportColumn<ApiFuelDelivery>[] = [
    { label: "Date",           value: d => d.date.split("T")[0] },
    { label: "Tank",           value: d => d.tank ? `${d.tank.name} (${d.tank.fuelType})` : "—" },
    { label: "Litres",         value: d => d.litres },
    { label: "Supplier",       value: d => d.supplier || "—" },
    { label: "Delivery Note",  value: d => d.deliveryNote || "—" },
    { label: "Recorded By",    value: d => d.recordedBy || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Track fuel deliveries received into tanks</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`fuel-deliveries_${fromDate}_to_${toDate}`}
            title="Fuel Deliveries"
            rows={visibleDeliveries}
            columns={exportColumns}
            subtitle={`${fromDate} to ${toDate}`}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canRecord && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Record Delivery</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Deliveries</p>
          <p className="text-xl font-bold">{deliveries.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Litres Received</p>
          <p className="text-xl font-bold text-primary">{totalLitres.toLocaleString()} L</p>
        </CardContent></Card>
      </div>

      <DataTable
        data={deliveries} columns={columns}
        searchKeys={["supplier", "deliveryNote", "recordedBy", "tank.name", "tank.fuelType"]}
        searchPlaceholder="Search deliveries..."
        onFilteredChange={setVisibleDeliveries}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Record Fuel Delivery"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Record Delivery"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Tank *</Label>
            <Select value={form.tankId} onValueChange={v => set("tankId", v)}>
              <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
              <SelectContent>
                {tanks.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.fuelType}) — {t.currentLevel.toLocaleString()}L current
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Litres Delivered *</Label><Input type="number" value={form.litres || ""} onChange={e => set("litres", +e.target.value)} placeholder="0" /></div>
          <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => set("supplier", e.target.value)} placeholder="Supplier name" /></div>
          <div><Label>Delivery Note #</Label><Input value={form.deliveryNote} onChange={e => set("deliveryNote", e.target.value)} placeholder="DN-12345" /></div>
          <div>
            <Label>Recorded By</Label>
            <Input value={user.name || "Current user"} disabled className="bg-muted/50 text-muted-foreground" />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
