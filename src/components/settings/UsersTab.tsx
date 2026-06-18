import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Link2, Copy, Check, Users2, UserPlus, Search, Send } from "lucide-react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { usersApi, ApiUser, HrEmployeeStub } from "@/lib/usersApi";
import { useStations } from "@/data/stationsCache";

const VALID_ROLES = ["Admin", "Manager", "Accountant", "Attendant", "LocationHead", "Employee"];

type FormMode = "add" | "edit" | "view";
interface ModalState { mode: FormMode; user?: ApiUser; }

const blank = { name: "", email: "", phone: "", password: "", activeRole: "Employee", homeLocationId: "_none_", roles: ["Employee"], sendInvite: false };

// ── HR Bulk Invite row state ──────────────────────────────────────────────────

interface HrRow extends HrEmployeeStub {
  selected: boolean;
  emailInput: string;    // only needed if user is null (truly unlinked)
  roles: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UsersTab() {
  const stations = useStations();

  // User list
  const [data,    setData]    = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal (view/edit/add-manual)
  const [modal,   setModal]   = useState<ModalState | null>(null);
  const [form,    setForm]    = useState(blank);
  const [saving,  setSaving]  = useState(false);

  // Invite link dialog
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied,     setCopied]     = useState(false);

  // Add-dialog tabs
  const [addOpen, setAddOpen] = useState(false);
  const [addTab,  setAddTab]  = useState<"manual" | "from-hr">("manual");

  // HR bulk-invite tab
  const [hrRows,       setHrRows]       = useState<HrRow[]>([]);
  const [hrLoading,    setHrLoading]    = useState(false);
  const [hrSearch,     setHrSearch]     = useState("");
  const [bulkRoles,    setBulkRoles]    = useState<string[]>(["Employee"]);
  const [bulkSending,  setBulkSending]  = useState(false);
  const [bulkResults,  setBulkResults]  = useState<{ name?: string; email?: string; dev_invite_link?: string; error?: string }[]>([]);

  // ── Load users ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ limit: 100 });
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Load HR employees needing invite ────────────────────────────────────────

  const loadHr = useCallback(async () => {
    setHrLoading(true);
    try {
      const res = await usersApi.hrNeedsInvite();
      setHrRows((res.data ?? []).map(emp => ({
        ...emp,
        selected: false,
        emailInput: emp.user?.email || "",
        roles: ["Employee"],
      })));
    } catch (e: any) { toast.error(e?.message || "Failed to load HR employees"); }
    finally { setHrLoading(false); }
  }, []);

  // ── Manual form helpers ─────────────────────────────────────────────────────

  const set = (k: keyof typeof blank, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => {
    setForm(blank);
    setBulkResults([]);
    setHrSearch("");
    setAddTab("manual");
    setAddOpen(true);
  };

  const openView = (u: ApiUser) => {
    setForm({ name: u.name, email: u.email, phone: u.phone ?? "", password: "", activeRole: u.activeRole, homeLocationId: "_none_", roles: u.roles, sendInvite: false });
    setModal({ mode: "view", user: u });
  };

  const openEdit = (u: ApiUser) => {
    setForm({ name: u.name, email: u.email, phone: u.phone ?? "", password: "", activeRole: u.activeRole, homeLocationId: u.homeLocation || "_none_", roles: u.roles, sendInvite: false });
    setModal({ mode: "edit", user: u });
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Save manual user ────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        if (!form.email || !form.name) return toast.error("Name and email are required");
        if (!form.sendInvite && !form.password) return toast.error("Password is required (or enable Send Invite)");
        const res = await usersApi.create({
          name: form.name, email: form.email,
          password: form.sendInvite ? undefined : form.password,
          sendInvite: form.sendInvite,
          phone: form.phone || undefined, activeRole: form.activeRole,
          homeLocation: form.homeLocationId !== "_none_" ? form.homeLocationId : undefined,
          roles: form.roles,
        });
        setModal(null);
        if (res.dev_invite_link) {
          setInviteLink(res.dev_invite_link as string);
        } else {
          toast.success("User created");
        }
        load();
        return;
      } else if (modal?.mode === "edit" && modal.user) {
        await Promise.all([
          usersApi.update(modal.user.id, {
            name: form.name || undefined,
            phone: form.phone || null,
            homeLocation: form.homeLocationId !== "_none_" ? form.homeLocationId : null,
          }),
          usersApi.assignRoles(modal.user.id, form.roles),
        ]);
        toast.success("User updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  // ── HR tab helpers ──────────────────────────────────────────────────────────

  const toggleHrSelect = (id: string) =>
    setHrRows(rows => rows.map(r => r.id === id ? { ...r, selected: !r.selected } : r));

  const toggleAll = (checked: boolean) =>
    setHrRows(rows => rows.map(r => ({ ...r, selected: checked })));

  const setHrEmail = (id: string, email: string) =>
    setHrRows(rows => rows.map(r => r.id === id ? { ...r, emailInput: email } : r));

  const toggleBulkRole = (role: string) =>
    setBulkRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);

  const filteredHr = hrRows.filter(r => {
    if (!hrSearch) return true;
    const q = hrSearch.toLowerCase();
    return (r.name?.toLowerCase().includes(q) ||
      r.employeeNumber?.toLowerCase().includes(q) ||
      r.department?.name?.toLowerCase().includes(q) ||
      r.jobTitle?.title?.toLowerCase().includes(q));
  });

  const selectedHr = hrRows.filter(r => r.selected);

  const handleBulkInvite = async () => {
    if (selectedHr.length === 0) return toast.error("Select at least one employee");

    // Validate: unlinked employees must have email filled in
    const missingEmail = selectedHr.filter(r => !r.user && !r.emailInput.trim());
    if (missingEmail.length > 0) {
      return toast.error(`${missingEmail.length} employee(s) have no email — fill in their email addresses first`);
    }

    setBulkSending(true);
    setBulkResults([]);
    try {
      const entries = selectedHr.map(r => ({
        employeeId: r.id,
        email:  r.user ? undefined : r.emailInput.trim(),
        name:   r.user ? undefined : (r.name || r.emailInput.split("@")[0]),
        roles:  bulkRoles.length > 0 ? bulkRoles : ["Employee"],
      }));

      const res = await usersApi.bulkInviteFromHr(entries);
      setBulkResults(res.data ?? []);
      const ok    = (res.data ?? []).filter(d => !d.error).length;
      const fail  = (res.data ?? []).filter(d =>  d.error).length;
      toast.success(`${ok} invite(s) sent${fail > 0 ? `, ${fail} failed` : ""}`);
      load();
      loadHr();
    } catch (e: any) { toast.error(e?.message || "Bulk invite failed"); }
    finally { setBulkSending(false); }
  };

  const handleInviteClose = () => { setInviteLink(null); setCopied(false); };

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

  // ── Table columns ───────────────────────────────────────────────────────────

  const columns: Column<ApiUser>[] = [
    { key: "name",        label: "Name",       sortable: true },
    { key: "email",       label: "Email" },
    { key: "phone",       label: "Phone",      render: u => u.phone || "—" },
    { key: "roles",       label: "Roles",      render: u => <div className="flex flex-wrap gap-1">{u.roles.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}</div> },
    { key: "activeRole",  label: "Active Role" },
    { key: "homeLocation",label: "Location",   render: u => stations.find(s => s.id === u.homeLocation)?.name || u.homeLocation || "—" },
    { key: "lastLogin",   label: "Last Login", render: u => u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never" },
    { key: "status",      label: "Status",     render: u => <StatusBadge status={u.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [
      { label: "Active",    value: "Active" },
      { label: "Inactive",  value: "Inactive" },
      { label: "Suspended", value: "Suspended" },
      { label: "Pending",   value: "Pending" },
    ]},
  ];

  const isView = modal?.mode === "view";

  // ── Render ──────────────────────────────────────────────────────────────────

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

      {/* ── View / Edit modal ─────────────────────────────────────────────── */}
      {modal && modal.mode !== "add" && (
        <ModalForm
          open onClose={() => setModal(null)}
          title={isView ? "User Details" : "Edit User"}
          onSubmit={handleSave} isView={isView}
          submitLabel={saving ? "Saving..." : "Save Changes"}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Full Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} readOnly={isView} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} readOnly /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} readOnly={isView} /></div>
            </div>

            {!isView && (
              <div>
                <Label>Home Station</Label>
                <Select value={form.homeLocationId} onValueChange={v => set("homeLocationId", v)}>
                  <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— none —</SelectItem>
                    {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
          </div>
        </ModalForm>
      )}

      {/* ── Add User dialog (tabbed) ──────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={v => { if (!v) { setAddOpen(false); setBulkResults([]); } }}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Add User
            </DialogTitle>
          </DialogHeader>

          <Tabs value={addTab} onValueChange={v => {
            setAddTab(v as "manual" | "from-hr");
            if (v === "from-hr" && hrRows.length === 0) loadHr();
          }} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-3 w-auto justify-start shrink-0">
              <TabsTrigger value="manual" className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" /> New User
              </TabsTrigger>
              <TabsTrigger value="from-hr" className="gap-1.5">
                <Users2 className="h-3.5 w-3.5" /> From HR Employees
              </TabsTrigger>
            </TabsList>

            {/* ── Manual tab ─────────────────────────────────────────────── */}
            <TabsContent value="manual" className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Full Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="John Doe" /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="john@company.com" /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Optional" /></div>
                {!form.sendInvite && (
                  <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Temporary password" /></div>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.sendInvite}
                  onChange={e => { set("sendInvite", e.target.checked); if (e.target.checked) set("password", ""); }}
                  className="rounded"
                />
                <span className="font-medium">Send invite link instead of password</span>
                <span className="text-xs text-muted-foreground ml-1">(user activates via link)</span>
              </label>

              <div>
                <Label>Home Station</Label>
                <Select value={form.homeLocationId} onValueChange={v => set("homeLocationId", v)}>
                  <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— none —</SelectItem>
                    {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Active Role</Label>
                <Select value={form.activeRole} onValueChange={v => set("activeRole", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VALID_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Roles (click to toggle)</Label>
                <div className="flex flex-wrap gap-2">
                  {VALID_ROLES.map(r => (
                    <Badge
                      key={r}
                      variant={form.roles.includes(r) ? "default" : "outline"}
                      className="cursor-pointer text-sm px-3 py-1"
                      onClick={() => toggleRole(r)}>
                      {r}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Employee role is always included.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  setSaving(true);
                  try {
                    if (!form.email || !form.name) return toast.error("Name and email are required");
                    if (!form.sendInvite && !form.password) return toast.error("Password is required (or enable Send Invite)");
                    const res = await usersApi.create({
                      name: form.name, email: form.email,
                      password: form.sendInvite ? undefined : form.password,
                      sendInvite: form.sendInvite,
                      phone: form.phone || undefined, activeRole: form.activeRole,
                      homeLocation: form.homeLocationId !== "_none_" ? form.homeLocationId : undefined,
                      roles: form.roles,
                    });
                    setAddOpen(false);
                    if (res.dev_invite_link) {
                      setInviteLink(res.dev_invite_link as string);
                    } else {
                      toast.success("User created");
                    }
                    load();
                  } catch (e: any) { toast.error(e?.message || "Failed to create user"); }
                  finally { setSaving(false); }
                }} disabled={saving}>
                  {saving ? "Creating..." : "Create User"}
                </Button>
              </div>
            </TabsContent>

            {/* ── From HR tab ─────────────────────────────────────────────── */}
            <TabsContent value="from-hr" className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-3">
              <p className="text-sm text-muted-foreground">
                Select HR employees who need system access. Each will receive an invite link to set their own password.
                Employees with existing <Badge variant="outline" className="text-[10px]">Pending</Badge> accounts will get a fresh invite.
              </p>

              {/* Bulk role assignment */}
              <div>
                <Label className="mb-1.5 block text-xs">Roles to assign (applies to all selected)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {VALID_ROLES.map(r => (
                    <Badge
                      key={r}
                      variant={bulkRoles.includes(r) ? "default" : "outline"}
                      className="cursor-pointer text-xs px-2 py-0.5"
                      onClick={() => toggleBulkRole(r)}>
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Search + select all */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-sm"
                    placeholder="Search by name, employee#, department…"
                    value={hrSearch}
                    onChange={e => setHrSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={() => loadHr()} disabled={hrLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${hrLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>

              {/* Employee list */}
              <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
                {hrLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading HR employees…</div>
                ) : filteredHr.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {hrRows.length === 0
                      ? "No HR employees are awaiting system access."
                      : "No results for your search."}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        <th className="text-left p-2 w-8">
                          <input
                            type="checkbox"
                            checked={filteredHr.length > 0 && filteredHr.every(r => r.selected)}
                            onChange={e => toggleAll(e.target.checked)}
                          />
                        </th>
                        <th className="text-left p-2 font-medium">Name / Emp#</th>
                        <th className="text-left p-2 font-medium">Dept / Role</th>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-left p-2 font-medium w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHr.map(row => (
                        <tr key={row.id} className={`border-t hover:bg-muted/30 ${row.selected ? "bg-primary/5" : ""}`}>
                          <td className="p-2">
                            <input type="checkbox" checked={row.selected} onChange={() => toggleHrSelect(row.id)} />
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{row.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{row.employeeNumber}</div>
                          </td>
                          <td className="p-2">
                            <div>{row.department?.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{row.jobTitle?.title || "—"}</div>
                          </td>
                          <td className="p-2">
                            {row.user ? (
                              <span className="text-muted-foreground text-xs">{row.user.email}</span>
                            ) : (
                              <Input
                                className="h-7 text-xs"
                                placeholder="Enter email…"
                                value={row.emailInput}
                                onChange={e => setHrEmail(row.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                              />
                            )}
                          </td>
                          <td className="p-2">
                            {row.user
                              ? <Badge variant="outline" className="text-[10px]">{row.user.status}</Badge>
                              : <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">No Account</Badge>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Results after send */}
              {bulkResults.length > 0 && (
                <div className="border rounded-lg p-3 space-y-1.5 max-h-36 overflow-y-auto bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invite Results</p>
                  {bulkResults.map((r, i) => (
                    <div key={i} className="text-xs flex items-center gap-2">
                      {r.error
                        ? <><span className="text-destructive font-medium">✗</span> <span>{r.name || r.email} — {r.error}</span></>
                        : <><span className="text-green-600 font-medium">✓</span> <span className="truncate">{r.name} ({r.email})</span>
                            {r.dev_invite_link && (
                              <button
                                className="ml-auto text-primary underline shrink-0"
                                onClick={() => { navigator.clipboard.writeText(r.dev_invite_link!); toast.success("Copied!"); }}>
                                Copy link
                              </button>
                            )}
                          </>
                      }
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t shrink-0">
                <span className="text-sm text-muted-foreground">{selectedHr.length} employee(s) selected</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Close</Button>
                  <Button onClick={handleBulkInvite} disabled={bulkSending || selectedHr.length === 0}>
                    <Send className="h-4 w-4 mr-1.5" />
                    {bulkSending ? "Sending…" : `Send ${selectedHr.length > 0 ? selectedHr.length + " " : ""}Invite${selectedHr.length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ── Invite link dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!inviteLink} onOpenChange={handleInviteClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" /> User Invite Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this link with the user. They click it to set their password and activate their account.
              In production this is sent automatically by email.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2.5 rounded break-all border">{inviteLink}</code>
              <Button size="icon" variant="outline" onClick={handleCopyLink} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {copied && <p className="text-xs text-green-600">Link copied to clipboard!</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyLink}>
              {copied ? <><Check className="h-4 w-4 mr-1.5" /> Copied</> : <><Copy className="h-4 w-4 mr-1.5" /> Copy Link</>}
            </Button>
            <Button onClick={handleInviteClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
