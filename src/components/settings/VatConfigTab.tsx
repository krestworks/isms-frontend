import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useActiveStation } from "@/lib/useActiveStation";
import { settingsApi, VatConfig, ApiVatRate } from "@/lib/settingsApi";

type FormMode = "add" | "edit" | "view";

const defaultVatConfig: VatConfig = {
  currency: "KES", currencySymbol: "Ksh", vatEnabled: true,
  defaultRate: 16, invoicePrefix: "INV", receiptPrefix: "RCP",
};

const blank: Omit<ApiVatRate, "id" | "stationId"> = { name: "", rate: 0, appliesTo: "", status: "active" };

export function VatConfigTab() {
  const { stationId } = useActiveStation();
  const [config,  setConfig]  = useState<VatConfig>(defaultVatConfig);
  const [rates,   setRates]   = useState<ApiVatRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [modal,   setModal]   = useState<{ mode: FormMode; item?: ApiVatRate } | null>(null);
  const [form,    setForm]    = useState<Omit<ApiVatRate, "id" | "stationId">>(blank);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [cfgRes, ratesRes] = await Promise.all([
        settingsApi.config.get<VatConfig>("vat", stationId),
        settingsApi.vatRates.list(stationId),
      ]);
      if (cfgRes.data && Object.keys(cfgRes.data).length) setConfig(cfgRes.data);
      setRates(ratesRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load VAT config"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    if (!stationId) return toast.error("No station selected");
    setSaving(true);
    try {
      await settingsApi.config.set("vat", config, stationId);
      toast.success("Configuration saved");
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const openAdd  = () => { setForm(blank); setModal({ mode: "add" }); };
  const openView = (v: ApiVatRate) => { setForm({ name: v.name, rate: v.rate, appliesTo: v.appliesTo, status: v.status }); setModal({ mode: "view", item: v }); };
  const openEdit = (v: ApiVatRate) => { setForm({ name: v.name, rate: v.rate, appliesTo: v.appliesTo, status: v.status }); setModal({ mode: "edit", item: v }); };

  const handleDelete = async (v: ApiVatRate) => {
    try { await settingsApi.vatRates.delete(v.id); toast.success("VAT rate deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Name is required");
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await settingsApi.vatRates.create(form, stationId);
        toast.success("VAT rate added");
      } else if (modal?.mode === "edit" && modal.item) {
        await settingsApi.vatRates.update(modal.item.id, form);
        toast.success("VAT rate updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const columns: Column<ApiVatRate>[] = [
    { key: "name",      label: "Name",       sortable: true },
    { key: "rate",      label: "Rate (%)",   render: v => <span className="font-mono">{v.rate}%</span> },
    { key: "appliesTo", label: "Applies To" },
    { key: "status",    label: "Status",     render: v => <StatusBadge status={v.status} /> },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">VAT & Currency Configuration</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button onClick={saveConfig} size="sm" disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save Config"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Currency Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Currency Code</Label><Input value={config.currency} onChange={e => setConfig(c => ({ ...c, currency: e.target.value }))} /></div>
            <div><Label>Currency Symbol</Label><Input value={config.currencySymbol} onChange={e => setConfig(c => ({ ...c, currencySymbol: e.target.value }))} /></div>
            <div><Label>Invoice Prefix</Label><Input value={config.invoicePrefix} onChange={e => setConfig(c => ({ ...c, invoicePrefix: e.target.value }))} /></div>
            <div><Label>Receipt Prefix</Label><Input value={config.receiptPrefix} onChange={e => setConfig(c => ({ ...c, receiptPrefix: e.target.value }))} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">VAT Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable VAT</Label>
              <Switch checked={config.vatEnabled} onCheckedChange={v => setConfig(c => ({ ...c, vatEnabled: v }))} />
            </div>
            <div><Label>Default VAT Rate (%)</Label><Input type="number" value={config.defaultRate} onChange={e => setConfig(c => ({ ...c, defaultRate: Number(e.target.value) }))} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">VAT Rate Schedule</h4>
          <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Rate</Button>
        </div>
        <DataTable data={rates} columns={columns} searchKeys={["name", "appliesTo"]} searchPlaceholder="Search rates..." onView={openView} onEdit={openEdit} onDelete={handleDelete} />
      </div>

      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={isView ? "VAT Rate Details" : modal.mode === "add" ? "Add VAT Rate" : "Edit VAT Rate"} onSubmit={handleSave} isView={isView}>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Rate (%)</Label><Input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: Number(e.target.value) }))} readOnly={isView} /></div>
            <div><Label>Applies To</Label><Input value={form.appliesTo} onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
