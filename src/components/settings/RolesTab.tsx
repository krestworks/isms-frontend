import { useState } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  permissions: string[];
  status: string;
}

const allPermissions = [
  "dashboard.view", "fuel.view", "fuel.manage", "lpg.view", "lpg.manage",
  "water.view", "water.manage", "automotive.view", "automotive.manage",
  "carwash.view", "carwash.manage", "finance.view", "finance.manage",
  "clients.view", "clients.manage", "reports.view", "reports.generate",
  "settings.view", "settings.manage", "users.view", "users.manage",
];

const initial: Role[] = [
  { id: "ROLE-001", name: "Admin", description: "Full system access with all permissions", usersCount: 2, permissions: allPermissions, status: "active" },
  { id: "ROLE-002", name: "Manager", description: "Module management without system settings", usersCount: 3, permissions: allPermissions.filter(p => !p.includes("settings.manage") && !p.includes("users.manage")), status: "active" },
  { id: "ROLE-003", name: "Attendant", description: "Sales and basic inventory operations", usersCount: 8, permissions: ["dashboard.view", "fuel.view", "lpg.view", "water.view", "carwash.view", "clients.view"], status: "active" },
  { id: "ROLE-004", name: "Accountant", description: "Financial reports and billing access", usersCount: 2, permissions: ["dashboard.view", "finance.view", "finance.manage", "reports.view", "reports.generate", "clients.view"], status: "active" },
];

const blank: Omit<Role, "id"> = { name: "", description: "", usersCount: 0, permissions: [], status: "active" };

export function RolesTab() {
  const [data, setData] = useState(initial);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Role } | null>(null);
  const [form, setForm] = useState<Omit<Role, "id">>(blank);

  const openAdd = () => { setForm(blank); setModal({ mode: "add", item: {} as Role }); };
  const openView = (r: Role) => { setForm(r); setModal({ mode: "view", item: r }); };
  const openEdit = (r: Role) => { setForm(r); setModal({ mode: "edit", item: r }); };
  const handleDelete = (r: Role) => { setData(d => d.filter(x => x.id !== r.id)); toast.success("Role deleted"); };
  const handleSave = () => {
    if (modal?.mode === "add") {
      setData(d => [{ ...form, id: `ROLE-${String(d.length + 1).padStart(3, "0")}` }, ...d]);
      toast.success("Role created");
    } else {
      setData(d => d.map(x => x.id === modal?.item.id ? { ...x, ...form } : x));
      toast.success("Role updated");
    }
    setModal(null);
  };

  const togglePerm = (perm: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const columns: Column<Role>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Role Name", sortable: true },
    { key: "description", label: "Description" },
    { key: "usersCount", label: "Users", sortable: true },
    { key: "permissions", label: "Permissions", render: r => <span className="text-xs text-muted-foreground">{r.permissions.length} permissions</span> },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
  ];

  const isView = modal?.mode === "view";

  const permGroups = Object.entries(
    allPermissions.reduce((acc, p) => {
      const [mod] = p.split(".");
      (acc[mod] = acc[mod] || []).push(p);
      return acc;
    }, {} as Record<string, string[]>)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">RBAC Roles</h3>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> New Role</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "description"]} searchPlaceholder="Search roles..." onView={openView} onEdit={openEdit} onDelete={handleDelete} />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={isView ? "Role Details" : modal.mode === "add" ? "New Role" : "Edit Role"} onSubmit={handleSave} isView={isView}>
          <div className="space-y-3">
            <div><Label>Role Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Permissions</Label>
              <div className="space-y-3 max-h-[300px] overflow-y-auto border border-border rounded-lg p-3">
                {permGroups.map(([group, perms]) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{group}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {perms.map(p => (
                        <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={form.permissions.includes(p)} onCheckedChange={() => !isView && togglePerm(p)} disabled={isView} />
                          <span>{p.split(".")[1]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
