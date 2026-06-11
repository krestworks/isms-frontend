import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Tag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizCategory, ApiBizProduct } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";

interface Props { business: ApiBizBusiness; }

const COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#ec4899","#14b8a6","#f97316",
  "#06b6d4","#84cc16","#6366f1","#f43f5e",
];

const emptyForm = { name: "", color: "#3b82f6" };

export function CategoriesTab({ business }: Props) {
  const can = usePermissions();
  const canManage = can("business.products.manage");

  const [records,  setRecords]  = useState<ApiBizCategory[]>([]);
  const [products, setProducts] = useState<ApiBizProduct[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]  = useState<ApiBizCategory | null>(null);
  const [form,      setForm]     = useState(emptyForm);
  const [saving,    setSaving]   = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; description?: string; onConfirm: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        bizApi.categories.list(business.id),
        bizApi.products.list(business.id),
      ]);
      setRecords(cRes.data ?? []);
      setProducts(pRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load categories"); }
    finally { setLoading(false); }
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew  = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: ApiBizCategory) => {
    setEditing(c);
    setForm({ name: c.name, color: c.color ?? "#3b82f6" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Category name is required");
    setSaving(true);
    try {
      if (editing) {
        await bizApi.categories.update(editing.id, form);
        toast.success("Category updated");
      } else {
        await bizApi.categories.create({ ...form, businessId: business.id });
        toast.success("Category added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const doDeleteCategory = async (c: ApiBizCategory) => {
    try {
      await bizApi.categories.delete(c.id);
      toast.success("Category deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const handleDelete = (c: ApiBizCategory) => {
    const count = products.filter(p => p.categoryId === c.id).length;
    setConfirmDlg({
      title: `Delete "${c.name}"?`,
      description: count > 0
        ? `This category has ${count} product(s). They will become uncategorised.`
        : "This category will be permanently deleted.",
      onConfirm: () => doDeleteCategory(c),
    });
  };

  // Build a product-count map
  const countMap: Record<string, { total: number; active: number }> = {};
  for (const p of products) {
    if (!p.categoryId) continue;
    if (!countMap[p.categoryId]) countMap[p.categoryId] = { total: 0, active: 0 };
    countMap[p.categoryId].total++;
    if (p.status === "active") countMap[p.categoryId].active++;
  }

  const uncategorised = products.filter(p => !p.categoryId).length;

  const columns: Column<ApiBizCategory>[] = [
    {
      key: "color", label: "",
      render: c => (
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (c.color ?? "#888") + "22" }}>
          <Tag className="h-4 w-4" style={{ color: c.color ?? "#888" }} />
        </div>
      ),
    },
    { key: "name", label: "Category Name", sortable: true },
    {
      key: "id", label: "Products",
      render: c => {
        const cnt = countMap[c.id];
        if (!cnt) return <span className="text-xs text-muted-foreground">0 products</span>;
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs font-semibold">
              <Package className="h-3 w-3 mr-1" />{cnt.total}
            </Badge>
            {cnt.active < cnt.total && (
              <span className="text-xs text-muted-foreground">{cnt.active} active</span>
            )}
          </div>
        );
      },
    },
    { key: "createdAt", label: "Created", render: c => c.createdAt.split("T")[0] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{records.length} categories</p>
          {uncategorised > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {uncategorised} uncategorised product{uncategorised > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" />Add Category
          </Button>
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["name"]}
        searchPlaceholder="Search categories..."
        onEdit={openEdit}
        onDelete={canManage ? handleDelete : undefined}
      />

      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        confirmLabel="Delete"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />

      <ModalForm
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Category" : "Add Category"}
        onSubmit={handleSave}
        submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="space-y-4">
          <div>
            <Label>Category Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Beverages, Electronics..." />
          </div>
          <div>
            <Label>Colour</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => set("color", c)}
                  className={`h-8 w-8 rounded-lg transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-md" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {/* Preview */}
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: form.color + "18", border: `1px solid ${form.color}44` }}>
              <div className="h-6 w-6 rounded-md" style={{ backgroundColor: form.color }} />
              <span className="text-sm font-medium" style={{ color: form.color }}>{form.name || "Preview"}</span>
            </div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
