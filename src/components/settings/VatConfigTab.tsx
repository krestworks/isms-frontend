import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";

interface VatRate {
  id: string;
  name: string;
  rate: number;
  appliesTo: string;
  status: string;
}

const initialConfig = { currency: "KES", currencySymbol: "Ksh", vatEnabled: true, defaultRate: 16, invoicePrefix: "INV", receiptPrefix: "RCP" };

const initialRates: VatRate[] = [
  { id: "VAT-001", name: "Standard Rate", rate: 16, appliesTo: "Fuel, LPG, Auto Services, Car Wash", status: "active" },
  { id: "VAT-002", name: "Zero Rate", rate: 0, appliesTo: "Water (potable)", status: "active" },
  { id: "VAT-003", name: "Exempt", rate: 0, appliesTo: "Medical supplies", status: "inactive" },
];

const blank = { name: "", rate: 0, appliesTo: "", status: "active" };

export function VatConfigTab() {
  const [config, setConfig] = useState(initialConfig);
  const [rates, setRates] = useState(initialRates);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: VatRate } | null>(null);
  const [form, setForm] = useState<Omit<VatRate, "id">>(blank);

  const openAdd = () => { setForm(blank); setModal({ mode: "add", item: {} as VatRate }); };
  const openView = (v: VatRate) => { setForm(v); setModal({ mode: "view", item: v }); };
  const openEdit = (v: VatRate) => { setForm(v); setModal({ mode: "edit", item: v }); };
  const handleDelete = (v: VatRate) => { setRates(d => d.filter(x => x.id !== v.id)); toast.success("VAT rate deleted"); };
  const handleSave = () => {
    if (modal?.mode === "add") {
      setRates(d => [{ ...form, id: `VAT-${String(d.length + 1).padStart(3, "0")}` }, ...d]);
      toast.success("VAT rate added");
    } else {
      setRates(d => d.map(x => x.id === modal?.item.id ? { ...x, ...form } : x));
      toast.success("VAT rate updated");
    }
    setModal(null);
  };

  const columns: Column<VatRate>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", sortable: true },
    { key: "rate", label: "Rate (%)", render: v => <span className="font-mono">{v.rate}%</span> },
    { key: "appliesTo", label: "Applies To" },
    { key: "status", label: "Status", render: v => <StatusBadge status={v.status} /> },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">VAT & Currency Configuration</h3>
        <Button onClick={() => toast.success("Configuration saved")} size="sm"><Save className="h-4 w-4 mr-1" /> Save</Button>
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
