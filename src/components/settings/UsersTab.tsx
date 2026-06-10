import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usersApi, ApiUser } from "@/lib/usersApi";
import { useStations } from "@/data/stationsCache";

const VALID_ROLES = ["Admin", "Manager", "Accountant", "Attendant", "LocationHead", "Employee"];

type FormMode = "add" | "edit" | "view";
interface ModalState { mode: FormMode; user?: ApiUser; }

const blank = { name: "", email: "", phone: "", password: "", activeRole: "Employee", homeLocationId: "", roles: ["Employee"] };

export function UsersTab() {
  const stations                    = useStations();
  const [data,    setData]          = useState<ApiUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modal,   setModal]         = useState<ModalState | null>(null);
  const [form,    setForm]          = useState(blank);
  const [saving,  setSaving]        = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ limit: 100 });
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof blank, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm(blank); setModal({ mode: "add" }); };
  const openView = (u: ApiUser) => {
    setForm({ name: u.name, email: u.email, phone: u.phone ?? "", password: "", activeRole: u.activeRole, homeLocationId: "", roles: u.roles });
    setModal({ mode: "view", user: u });
  };
  const openEdit = (u: ApiUser) => {
    setForm({ name: u.name, email: u.email, phone: u.phone ?? "", password: "", activeRole: u.activeRole, homeLocationId: "", roles: u.roles });
    setModal({ mode: "edit", user: u });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        if (!form.email || !form.password || !form.name) return toast.error("Name, email and password are required");
        await usersApi.create({
          name: form.name, email: form.email, password: form.password,
          phone: form.phone || undefined, activeRole: form.activeRole,
          homeLocation: form.homeLocationId || undefined, // sends station ID
          roles: form.roles,
        });
        toast.success("User created");
      } else if (modal?.mode === "edit" && modal.user) {
        await usersApi.assignRoles(modal.user.id, form.roles);
        toast.success("Roles updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleStatusToggle = async (u: ApiUser) => {
    const next = u.status === "Active" ? "Inactive" : "Active";
    try { await usersApi.updateStatus(u.id, next); toast.success(`User ${next.toLowerCase()}`); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to update status"); }
  };

  const toggleRole = (role: string) => {
    set("roles", form.roles.includes(role)
      ? form.roles.filter(r => r !== role)
      : [...form.roles, role]);
  };

  const columns: Column<ApiUser>[] = [
    { key: "name",        label: "Name",       sortable: true },
    { key: "email",       label: "Email" },
    { key: "phone",       label: "Phone",      render: u => u.phone || "—" },
    { key: "roles",       label: "Roles",      render: u => <div className="flex flex-wrap gap-1">{u.roles.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}</div> },
    { key: "activeRole",  label: "Active Role" },
    { key: "homeLocation",label: "Location",   render: u => u.homeLocation || "—" },
    { key: "lastLogin",   label: "Last Login", render: u => u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never" },
    { key: "status",      label: "Status",     render: u => <StatusBadge status={u.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" },
      { label: "Suspended", value: "Suspended" },
    ]},
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Users</h3>
          <p className="text-sm text-muted-foreground">{data.length} users registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add User</Button>
        </div>
      </div>

      <DataTable
        data={data} columns={columns}
        searchKeys={["name", "email"]} searchPlaceholder="Search users..."
        filters={filters}
        onView={openView}
        onEdit={openEdit}
        extraActions={[{ label: "Toggle Status", onClick: handleStatusToggle }]}
      />

      {modal && (
        <ModalForm
          open onClose={() => setModal(null)}
          title={isView ? "User Details" : modal.mode === "add" ? "Add User" : "Edit Roles"}
          onSubmit={handleSave} isView={isView}
          submitLabel={saving ? "Saving..." : modal.mode === "edit" ? "Update Roles" : "Create User"}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Full Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} readOnly={isView || modal.mode === "edit"} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} readOnly={isView || modal.mode === "edit"} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} readOnly={isView} /></div>
              {modal.mode === "add" && (
                <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Temporary password" /></div>
              )}
            </div>

            {isView && modal.user?.homeLocation && (
              <div><Label>Home Location</Label><Input value={modal.user.homeLocation} readOnly /></div>
            )}

            {modal.mode === "add" && (
              <>
                <div><Label>Active Role</Label>
                  <Select value={form.activeRole} onValueChange={v => set("activeRole", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VALID_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Home Station (optional)</Label>
                  <Select value={form.homeLocationId} onValueChange={v => set("homeLocationId", v)}>
                    <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— none —</SelectItem>
                      {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label className="mb-2 block">Roles {isView ? "" : "(click to toggle)"}</Label>
              <div className="flex flex-wrap gap-2">
                {VALID_ROLES.map(r => (
                  <Badge
                    key={r}
                    variant={form.roles.includes(r) ? "default" : "outline"}
                    className={`cursor-pointer text-sm px-3 py-1 ${isView ? "pointer-events-none" : ""}`}
                    onClick={() => !isView && toggleRole(r)}>
                    {r}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Employee is always included.</p>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
