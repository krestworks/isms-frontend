import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, BizType } from "@/lib/bizApi";

const TYPE_LABELS: Record<BizType, string> = {
  mart:       "Mini Mart",
  pharmacy:   "Pharmacy",
  restaurant: "Restaurant",
  bakery:     "Bakery",
};

const TYPES: BizType[] = ["mart", "pharmacy", "restaurant", "bakery"];

const emptyForm: { name: string; type: BizType; taxRate: number; currency: string; status: string; receiptHeader: string; receiptFooter: string } = {
  name: "", type: "mart", taxRate: 16, currency: "KES", status: "active",
  receiptHeader: "", receiptFooter: "",
};

export default function SubBusinessesTab() {
  const [data, setData]       = useState<ApiBizBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiBizBusiness | null>(null);
  const [viewing, setViewing] = useState<ApiBizBusiness | null>(null);
  const [form, setForm]       = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bizApi.businesses.list();
      setData(res.data ?? []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total:  data.length,
    active: data.filter(d => d.status === "active").length,
    types:  new Set(data.map(d => d.type)).size,
  };

  const columns: Column<ApiBizBusiness>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", sortable: true },
    { key: "type", label: "Type", render: i => <Badge variant="outline">{TYPE_LABELS[i.type] ?? i.type}</Badge> },
    { key: "currency", label: "Currency" },
    { key: "taxRate", label: "Tax Rate", render: i => `${i.taxRate}%` },
    { key: "createdAt", label: "Since", sortable: true, render: i => i.createdAt.split("T")[0] },
    { key: "status", label: "Status", render: i => <StatusBadge status={i.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "type",   label: "Type",   options: TYPES.map(t => ({ label: TYPE_LABELS[t], value: t })) },
    { key: "status", label: "Status", options: ["active", "inactive"].map(s => ({ label: s, value: s })) },
  ];

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };
  const openEdit = (i: ApiBizBusiness) => {
    setEditing(i);
    setForm({
      name: i.name, type: i.type, taxRate: i.taxRate, currency: i.currency,
      status: i.status, receiptHeader: i.receiptHeader ?? "", receiptFooter: i.receiptFooter ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Business name is required");
    try {
      if (editing) {
        const res = await bizApi.businesses.update(editing.id, form);
        setData(d => d.map(x => x.id === editing.id ? res.data : x));
        toast.success("Sub-business updated");
      } else {
        const res = await bizApi.businesses.create(form);
        setData(d => [...d, res.data]);
        toast.success("Sub-business created");
      }
      setModalOpen(false);
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  const handleDelete = async (i: ApiBizBusiness) => {
    try {
      await bizApi.businesses.delete(i.id);
      setData(d => d.filter(x => x.id !== i.id));
      toast.success("Sub-business removed");
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sub-Businesses</h3>
          <p className="text-sm text-muted-foreground">Mini Marts, Pharmacies & other sub-businesses on station</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Sub-Business</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",      value: stats.total,  color: "" },
          { label: "Active",     value: stats.active, color: "text-green-600" },
          { label: "Categories", value: stats.types,  color: "text-primary" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["name", "id"]} searchPlaceholder="Search sub-businesses…" filters={filters} onView={i => setViewing(i)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Sub-Business" : "Add Sub-Business"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Create"}>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tax Rate (%)</Label><Input type="number" value={form.taxRate} onChange={e => set("taxRate", Number(e.target.value))} /></div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={e => set("currency", e.target.value)} placeholder="KES" /></div>
          </div>
          <div><Label>Receipt Header</Label><Textarea value={form.receiptHeader} onChange={e => set("receiptHeader", e.target.value)} placeholder="e.g. Business name, address, tagline" /></div>
          <div><Label>Receipt Footer</Label><Textarea value={form.receiptFooter} onChange={e => set("receiptFooter", e.target.value)} placeholder="e.g. Thank you for shopping with us" /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sub-Business" isView>
        {viewing && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><Badge variant="outline">{viewing.id}</Badge><StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Type:</span> {TYPE_LABELS[viewing.type] ?? viewing.type}</div>
            <div><span className="text-muted-foreground">Tax Rate:</span> {viewing.taxRate}%</div>
            <div><span className="text-muted-foreground">Currency:</span> {viewing.currency}</div>
            {viewing.receiptHeader && <div><span className="text-muted-foreground">Receipt Header:</span> {viewing.receiptHeader}</div>}
            {viewing.receiptFooter && <div><span className="text-muted-foreground">Receipt Footer:</span> {viewing.receiptFooter}</div>}
            <div><span className="text-muted-foreground">Created:</span> {viewing.createdAt.split("T")[0]}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
