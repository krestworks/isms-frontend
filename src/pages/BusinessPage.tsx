import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Plus, RefreshCw, ShoppingCart, Pill, UtensilsCrossed, Croissant, Trash2, CheckCircle2, Lock } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalForm } from "@/components/shared/ModalForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, BizType } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";
import { useActiveStation } from "@/lib/useActiveStation";

const BIZ_TYPES: { type: BizType; label: string; icon: React.ElementType; desc: string; color: string; bg: string }[] = [
  { type: "mart",       label: "Mart",       icon: ShoppingCart,    desc: "Convenience store & retail POS",     color: "text-blue-600",   bg: "bg-blue-500/10 border-blue-200" },
  { type: "pharmacy",   label: "Pharmacy",   icon: Pill,            desc: "Drug store with prescriptions",       color: "text-green-600",  bg: "bg-green-500/10 border-green-200" },
  { type: "restaurant", label: "Restaurant", icon: UtensilsCrossed, desc: "Food service with table management", color: "text-orange-600", bg: "bg-orange-500/10 border-orange-200" },
  { type: "Tyre Centre",     label: "Tyre Centre",     icon: Croissant,       desc: "Tyre Centre & confectionery retail",       color: "text-yellow-600", bg: "bg-yellow-500/10 border-yellow-200" },
];

const emptyForm = { name: "", taxRate: 16, receiptHeader: "", receiptFooter: "" };

export default function BusinessPage() {
  const navigate  = useNavigate();
  const { stationId } = useActiveStation();
  const can       = usePermissions();
  const canManage = can("business.setup.manage");

  const [businesses, setBusinesses] = useState<ApiBizBusiness[]>([]);
  const [loading, setLoading]       = useState(true);
  const [enabling, setEnabling]     = useState<BizType | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; description?: string; onConfirm: () => void } | null>(null);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await bizApi.businesses.list(stationId);
      setBusinesses(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load businesses"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load, stationId]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openEnable = (type: BizType) => {
    setForm({ ...emptyForm, name: BIZ_TYPES.find(t => t.type === type)?.label ?? "" } as any);
    setEnabling(type);
  };

  const handleCreate = async () => {
    if (!form.name) return toast.error("Business name is required");
    if (!enabling)  return;
    setSaving(true);
    try {
      await bizApi.businesses.create({ ...form, type: enabling }, stationId);
      toast.success(`${form.name} enabled`);
      setEnabling(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to enable business"); }
    finally { setSaving(false); }
  };

  const handleDelete = (b: ApiBizBusiness, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDlg({
      title: `Remove ${b.name}?`,
      description: "This will permanently delete the business and all its data. This action cannot be undone.",
      onConfirm: async () => {
        try {
          await bizApi.businesses.delete(b.id);
          toast.success("Business removed");
          load();
        } catch (err: any) { toast.error(err?.message || "Failed to remove"); }
      },
    });
  };

  const enabledMap = new Map(businesses.map(b => [b.type, b]));

  return (
    <ModulePageShell title="Business" description="Manage sub-businesses at this station" icon={Store}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Select a business type to open it, or enable one that isn&apos;t set up yet.
          </p>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BIZ_TYPES.map(t => <div key={t.type} className="h-44 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BIZ_TYPES.map(meta => {
              const Icon    = meta.icon;
              const biz     = enabledMap.get(meta.type);
              const enabled = !!biz;

              if (enabled && biz) {
                return (
                  <Card
                    key={meta.type}
                    className="cursor-pointer hover:shadow-md transition-all hover:border-primary/40 group"
                    onClick={() => navigate(`/business/${biz.id}`)}
                  >
                    <CardContent className="p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${meta.bg} ${meta.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <Badge variant={biz.status === "active" ? "default" : "secondary"} className="text-xs">
                            {biz.status}
                          </Badge>
                          {canManage && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                              onClick={e => handleDelete(biz, e)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold">{biz.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                        <p className="text-xs text-muted-foreground mt-2">Tax: {biz.taxRate}% · {biz.currency}</p>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-auto" onClick={e => { e.stopPropagation(); navigate(`/business/${biz.id}`); }}>
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card key={meta.type} className="border-dashed opacity-70 hover:opacity-100 transition-opacity">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${meta.bg} ${meta.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <Lock className="h-4 w-4 text-muted-foreground mt-1" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{meta.label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                      <p className="text-xs text-muted-foreground mt-2">Not enabled at this station</p>
                    </div>
                    {canManage ? (
                      <Button size="sm" className="w-full mt-auto" onClick={() => openEnable(meta.type)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />Enable
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center mt-auto pt-1">Contact admin to enable</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        confirmLabel="Remove"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />

      <ModalForm
        open={!!enabling}
        onClose={() => setEnabling(null)}
        title={`Enable ${BIZ_TYPES.find(t => t.type === enabling)?.label ?? ""}`}
        onSubmit={handleCreate}
        submitLabel={saving ? "Enabling..." : "Enable"}
      >
        <div className="space-y-4">
          <div>
            <Label>Display Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Station Mart" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tax Rate (%)</Label>
              <Input type="number" value={form.taxRate} onChange={e => set("taxRate", +e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Receipt Header</Label>
            <Input value={form.receiptHeader} onChange={e => set("receiptHeader", e.target.value)} placeholder="Optional header text on receipts" />
          </div>
          <div>
            <Label>Receipt Footer</Label>
            <Input value={form.receiptFooter} onChange={e => set("receiptFooter", e.target.value)} placeholder="Optional footer text on receipts" />
          </div>
        </div>
      </ModalForm>
    </ModulePageShell>
  );
}
