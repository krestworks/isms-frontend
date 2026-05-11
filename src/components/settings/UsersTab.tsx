import { useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { usersStore, useUsers, UserAccount } from "@/data/usersStore";
import { useLocations } from "@/data/locationsStore";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/data/sessionStore";
import { usePermission, guardAction } from "@/lib/actionPermissions";

const ALL_ROLES: Role[] = ["Admin", "Manager", "Accountant", "Attendant", "LocationHead", "Employee"];
const ALL_MODULES = ["All", "Fuel", "LPG", "Water", "Automotive", "Car Wash", "Inventory", "HR", "Finance", "Reports", "Settings", "Locations"];

const blank: Omit<UserAccount, "id" | "lastLogin"> = { name: "", email: "", phone: "", roles: ["Employee"], modules: [], homeLocation: undefined, status: "active" };

export function UsersTab() {
  const data = useUsers();
  const locations = useLocations();
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: UserAccount } | null>(null);
  const [form, setForm] = useState<Omit<UserAccount, "id" | "lastLogin">>(blank);
  const canCreate = usePermission("settings.user.create");
  const canUpdate = usePermission("settings.user.update");
  const canDelete = usePermission("settings.user.update");

  const openAdd = () => { setForm(blank); setModal({ mode: "add", item: {} as UserAccount }); };
  const openView = (u: UserAccount) => { setForm(u); setModal({ mode: "view", item: u }); };
  const openEdit = (u: UserAccount) => { setForm(u); setModal({ mode: "edit", item: u }); };
  const handleDelete = (u: UserAccount) => { if (!guardAction("settings.user.update", "remove a user")) return; usersStore.remove(u.id); toast.success("User removed"); };
  const handleSave = () => {
    if (modal?.mode === "add") { if (!guardAction("settings.user.create", "create a user")) return; usersStore.add(form); toast.success("User created"); }
    else if (modal) { if (!guardAction("settings.user.update", "update a user")) return; usersStore.update(modal.item.id, form); toast.success("User updated"); }
    setModal(null);
  };

  const columns: Column<UserAccount>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email" },
    { key: "roles", label: "Roles", render: u => <div className="flex flex-wrap gap-1">{u.roles.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}</div> },
    { key: "modules", label: "Module Access", render: u => <div className="flex flex-wrap gap-1 max-w-[280px]">{u.modules.slice(0, 4).map(m => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}{u.modules.length > 4 && <span className="text-xs text-muted-foreground">+{u.modules.length - 4}</span>}</div> },
    { key: "homeLocation", label: "Home Loc.", render: u => u.homeLocation || "—" },
    { key: "lastLogin", label: "Last Login" },
    { key: "status", label: "Status", render: u => <StatusBadge status={u.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Users</h3>
          <p className="text-sm text-muted-foreground">Each onboarded staff gets a portal login automatically</p>
        </div>
        {canCreate && <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add User</Button>}
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "email"]} searchPlaceholder="Search users..." filters={filters} onView={openView} onEdit={canUpdate ? openEdit : undefined} onDelete={canDelete ? handleDelete : undefined} />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={isView ? "User Details" : modal.mode === "add" ? "Add User" : "Edit User"} onSubmit={handleSave} isView={isView}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Full Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} readOnly={isView} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} readOnly={isView} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} readOnly={isView} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))} disabled={isView}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Roles (multi-select)</Label>
              <MultiSelect options={ALL_ROLES} value={form.roles} onChange={(v) => setForm(f => ({ ...f, roles: v as Role[] }))} disabled={isView} placeholder="Assign roles..." />
              <p className="text-xs text-muted-foreground mt-1">Users with multiple roles can switch between them in the header.</p>
            </div>
            <div>
              <Label>Module Access</Label>
              <MultiSelect options={ALL_MODULES} value={form.modules} onChange={(v) => setForm(f => ({ ...f, modules: v }))} disabled={isView} placeholder="Choose modules..." />
              <p className="text-xs text-muted-foreground mt-1">Pick "All" for full access, or specific modules.</p>
            </div>
            <div>
              <Label>Home Location (for Location Head)</Label>
              <Select value={form.homeLocation || "none"} onValueChange={v => setForm(f => ({ ...f, homeLocation: v === "none" ? undefined : v }))} disabled={isView}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {locations.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">If set, this user only sees data for this location.</p>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
