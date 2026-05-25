import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { rolesApi, allPermissionsApi, ApiRole } from "@/lib/usersApi";

type FormMode = "add" | "edit" | "view";

const blank: Omit<ApiRole, "id" | "usersCount"> = { name: "", description: "", permissions: [], status: "active" };

export function RolesTab() {
  const [data,    setData]    = useState<ApiRole[]>([]);
  const [allPerms, setAllPerms] = useState<{ code: string; description?: string | null; category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ mode: FormMode; id?: string } | null>(null);
  const [form,    setForm]    = useState<Omit<ApiRole, "id" | "usersCount">>(blank);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([rolesApi.list(), allPermissionsApi.list()]);
      setData(rRes.data ?? []);
      // Flatten grouped permissions
      const grouped = pRes.data?.permissions ?? {};
      const flat = Object.entries(grouped).flatMap(([cat, perms]) =>
        perms.map(p => ({ code: p.code, description: p.description, category: cat }))
      );
      setAllPerms(flat);
    } catch (e: any) { toast.error(e?.message || "Failed to load roles"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof blank, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm({ ...blank }); setModal({ mode: "add" }); };
  const openView = (r: ApiRole) => { setForm({ name: r.name, description: r.description ?? "", permissions: r.permissions, status: r.status }); setModal({ mode: "view", id: r.id }); };
  const openEdit = (r: ApiRole) => { setForm({ name: r.name, description: r.description ?? "", permissions: r.permissions, status: r.status }); setModal({ mode: "edit", id: r.id }); };

  const handleSave = async () => {
    if (!form.name) return toast.error("Role name is required");
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await rolesApi.create({ name: form.name, description: form.description || undefined, permissions: form.permissions });
        toast.success("Role created");
      } else if (modal?.mode === "edit" && modal.id) {
        await rolesApi.update(modal.id, { name: form.name, description: form.description || undefined, permissions: form.permissions });
        toast.success("Role updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (r: ApiRole) => {
    try { await rolesApi.delete(r.id); toast.success("Role deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const togglePerm = (code: string) => {
    set("permissions", form.permissions.includes(code)
      ? form.permissions.filter(p => p !== code)
      : [...form.permissions, code]);
  };

  const permGroups = allPerms.reduce((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {} as Record<string, typeof allPerms>);

  const columns: Column<ApiRole>[] = [
    { key: "name",        label: "Role Name",   sortable: true },
    { key: "description", label: "Description", render: r => r.description || "—" },
    { key: "usersCount",  label: "Users",       sortable: true },
    { key: "permissions", label: "Permissions", render: r => <span className="text-xs text-muted-foreground">{r.permissions.length} permissions</span> },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">RBAC Roles</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />New Role</Button>
        </div>
      </div>

      <DataTable
        data={data} columns={columns}
        searchKeys={["name", "description"]} searchPlaceholder="Search roles..."
        onView={openView} onEdit={openEdit} onDelete={handleDelete}
      />

      {modal && (
        <ModalForm
          open onClose={() => setModal(null)}
          title={isView ? "Role Details" : modal.mode === "add" ? "New Role" : "Edit Role"}
          onSubmit={handleSave} isView={isView}
          submitLabel={saving ? "Saving..." : modal.mode === "edit" ? "Update" : "Create"}>
          <div className="space-y-3">
            <div><Label>Role Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} readOnly={isView} /></div>
            <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)} readOnly={isView} /></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Permissions</Label>
                {!isView && (
                  <div className="flex gap-2 text-xs">
                    <button type="button" className="text-primary hover:underline" onClick={() => set("permissions", allPerms.map(p => p.code))}>All</button>
                    <button type="button" className="text-muted-foreground hover:underline" onClick={() => set("permissions", [])}>None</button>
                  </div>
                )}
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto border border-border rounded-lg p-3">
                {Object.entries(permGroups).map(([group, perms]) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{group}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {perms.map(p => (
                        <label key={p.code} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={form.permissions.includes(p.code)} onCheckedChange={() => !isView && togglePerm(p.code)} disabled={isView} />
                          <span title={p.description ?? p.code}>{p.code.split(".").slice(1).join(".")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {allPerms.length === 0 && <p className="text-xs text-muted-foreground">Loading permissions…</p>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{form.permissions.length} of {allPerms.length} selected</p>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
