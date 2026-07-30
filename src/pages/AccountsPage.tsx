import { useEffect, useState, useCallback } from "react";
import {
  Plus, Building2, Users, MapPin, CheckCircle2, XCircle, Clock,
  AlertCircle, Mail, Phone, Pencil, RefreshCw, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordConfirmModal } from "@/components/shared/PasswordConfirmModal";
import { accountsApi, ApiAccount, ApiAccountDetail } from "@/lib/accountsApi";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  Active:    "bg-green-500/10 text-green-600 border-green-500/20",
  Pending:   "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Suspended: "bg-red-500/10 text-red-600 border-red-500/20",
  Inactive:  "bg-muted text-muted-foreground",
  Cancelled: "bg-muted text-muted-foreground",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  Active:    CheckCircle2,
  Pending:   Clock,
  Suspended: XCircle,
  Inactive:  AlertCircle,
  Cancelled: AlertCircle,
};

function AccountStatusBadge({ status }: { status: string }) {
  const Icon = STATUS_ICON[status] ?? AlertCircle;
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${STATUS_COLORS[status] ?? ""}`}>
      <Icon className="h-3 w-3" /> {status}
    </Badge>
  );
}

interface CreateForm {
  name: string;
  contactEmail: string;
  adminName: string;
  adminEmail: string;
  phone: string;
}

const emptyForm: CreateForm = { name: "", contactEmail: "", adminName: "", adminEmail: "", phone: "" };

export default function AccountsPage() {
  const [accounts, setAccounts]         = useState<ApiAccount[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating]         = useState(false);
  const [showCreate, setShowCreate]     = useState(false);
  const [form, setForm]                 = useState<CreateForm>(emptyForm);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ accountId: string; status: ApiAccount["status"] } | null>(null);

  // Detail panel
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [detail, setDetail]                 = useState<ApiAccountDetail | null>(null);
  const [detailLoading, setDetailLoading]   = useState(false);
  const [detailTab, setDetailTab]           = useState("overview");
  const [editMode, setEditMode]             = useState(false);
  const [editForm, setEditForm]             = useState({ name: "", contactEmail: "", contactPhone: "" });
  const [saving, setSaving]                 = useState(false);
  const [resending, setResending]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountsApi.list({ status: statusFilter === "all" ? undefined : statusFilter, limit: 50 });
      setAccounts(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setEditMode(false);
    setDetailTab("overview");
    setDetail(null);
    try {
      const res = await accountsApi.get(id);
      setDetail(res.data);
      setEditForm({
        name: res.data.name,
        contactEmail: res.data.contactEmail ?? "",
        contactPhone: res.data.contactPhone ?? "",
      });
    } catch {
      toast.error("Failed to load account details");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setEditMode(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await accountsApi.create({
        name: form.name,
        contactEmail: form.contactEmail,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        phone: form.phone || undefined,
      });
      if (res.emailSent === false) {
        toast.warning(`Account "${form.name}" created, but the invite email failed to send (${res.emailError ?? "unknown error"}). Use "Resend Invite" from the account detail panel.`, { duration: 8000 });
      } else {
        toast.success(`Account "${form.name}" created. Invite sent to ${form.adminEmail}.`);
      }
      setForm(emptyForm);
      setShowCreate(false);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

  // Status changes (activate/suspend/deactivate) require re-entering the
  // account password first (see PasswordConfirmModal below) — previously
  // these fired immediately on click with no confirmation of any kind.
  function requestStatusChange(accountId: string, status: ApiAccount["status"]) {
    setPendingStatusChange({ accountId, status });
  }

  async function handleStatusChange(accountId: string, status: ApiAccount["status"]) {
    try {
      await accountsApi.updateStatus(accountId, status);
      const label = status === "Active" ? "activated" : status === "Suspended" ? "suspended" : "deactivated";
      toast.success(`Account ${label}`);
      load();
      if (detail?.id === accountId) {
        const res = await accountsApi.get(accountId);
        setDetail(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update account status");
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    try {
      await accountsApi.update(detail.id, {
        name: editForm.name || undefined,
        contactEmail: editForm.contactEmail || undefined,
        contactPhone: editForm.contactPhone || undefined,
      });
      toast.success("Account details updated");
      setEditMode(false);
      const res = await accountsApi.get(detail.id);
      setDetail(res.data);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  async function handleResendInvite() {
    if (!detail) return;
    setResending(true);
    try {
      const res = await accountsApi.resendInvite(detail.id);
      if (res.emailSent === false) {
        toast.warning(res.message ?? `Invite email failed to send (${res.emailError ?? "unknown error"})`, { duration: 8000 });
      } else {
        toast.success(res.message ?? "Invite resent");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to resend invite");
    } finally {
      setResending(false);
    }
  }

  const stats = [
    { label: "Total",     value: total,                                                 color: "" },
    { label: "Active",    value: accounts.filter(a => a.status === "Active").length,    color: "text-green-600" },
    { label: "Pending",   value: accounts.filter(a => a.status === "Pending").length,   color: "text-yellow-600" },
    { label: "Suspended", value: accounts.filter(a => a.status === "Suspended").length, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Account Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage business accounts on this platform</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Account
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label} Accounts</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Accounts grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-5 h-28" /></Card>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No accounts found</p>
            <p className="text-xs text-muted-foreground mt-1">Create the first business account to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map(account => (
            <Card
              key={account.id}
              className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => openDetail(account.id)}
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{account.name}</CardTitle>
                    {account.contactEmail && (
                      <p className="text-[11px] text-muted-foreground truncate">{account.contactEmail}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <AccountStatusBadge status={account.status} />
                  {account._count && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{account._count.users}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{account._count.stations}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Created {new Date(account.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Account Detail Dialog ── */}
      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col gap-0 p-0">
          <DialogTitle className="sr-only">Account Details</DialogTitle>

          {detailLoading || !detail ? (
            <div className="flex items-center justify-center p-16">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6 pb-4 border-b shrink-0">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold leading-tight">{detail.name}</h2>
                      <AccountStatusBadge status={detail.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      {detail.contactEmail && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3" />{detail.contactEmail}
                        </span>
                      )}
                      {detail.contactPhone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />{detail.contactPhone}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(detail.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Status actions */}
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {detail.status !== "Active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950"
                      onClick={() => requestStatusChange(detail.id, "Active")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Activate
                    </Button>
                  )}
                  {detail.status === "Active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/20 hover:bg-destructive/5"
                      onClick={() => requestStatusChange(detail.id, "Suspended")}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" /> Suspend Account
                    </Button>
                  )}
                  {(detail.status === "Active" || detail.status === "Suspended") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => requestStatusChange(detail.id, "Cancelled")}
                    >
                      <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> Deactivate
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-6 mt-3 justify-start shrink-0">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="stations">
                    Stations{detail.stations?.length ? ` (${detail.stations.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="users">
                    Users{detail.users?.length ? ` (${detail.users.length})` : ""}
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto p-6 pt-4">
                  {/* ── Overview ── */}
                  <TabsContent value="overview" className="mt-0">
                    <form onSubmit={handleSaveEdit} className="space-y-4 max-w-md">
                      <div className="space-y-1.5">
                        <Label>Business Name</Label>
                        <Input
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Contact Email</Label>
                        <Input
                          type="email"
                          value={editForm.contactEmail}
                          onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))}
                          disabled={!editMode}
                          placeholder="contact@example.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone Number</Label>
                        <Input
                          value={editForm.contactPhone}
                          onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))}
                          disabled={!editMode}
                          placeholder="+254 700 000 000"
                        />
                      </div>

                      {editMode ? (
                        <div className="flex items-center gap-2 pt-2">
                          <Button type="submit" size="sm" disabled={saving}>
                            {saving ? "Saving…" : "Save Changes"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditMode(false);
                              setEditForm({
                                name: detail.name,
                                contactEmail: detail.contactEmail ?? "",
                                contactPhone: detail.contactPhone ?? "",
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => setEditMode(true)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Details
                        </Button>
                      )}
                    </form>
                  </TabsContent>

                  {/* ── Stations ── */}
                  <TabsContent value="stations" className="mt-0">
                    {!detail.stations || detail.stations.length === 0 ? (
                      <div className="py-10 text-center">
                        <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-muted-foreground">No stations in this account yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.stations.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{s.name}</p>
                                <p className="text-xs text-muted-foreground">{s.type}</p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                s.status === "Active"
                                  ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950"
                                  : s.status === "Maintenance"
                                  ? "text-yellow-600 border-yellow-200 bg-yellow-50"
                                  : "text-muted-foreground"
                              }
                            >
                              {s.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── Users ── */}
                  <TabsContent value="users" className="mt-0">
                    {!detail.users || detail.users.length === 0 ? (
                      <div className="py-10 text-center">
                        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-muted-foreground">No users in this account yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.users.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-primary">
                                  {u.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{u.name}</p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="secondary" className="text-xs">{u.activeRole}</Badge>
                              <Badge
                                variant="outline"
                                className={
                                  u.status === "Active"
                                    ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950"
                                    : u.status === "Pending"
                                    ? "text-yellow-600 border-yellow-200 bg-yellow-50"
                                    : "text-muted-foreground"
                                }
                              >
                                {u.status}
                              </Badge>
                              {u.status === "Pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={resending}
                                  onClick={handleResendInvite}
                                >
                                  <RefreshCw className={`h-3 w-3 mr-1 ${resending ? "animate-spin" : ""}`} />
                                  Resend Invite
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Account Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Business Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Business Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="Acme Fuels Ltd"
              />
            </div>
            <div className="space-y-1">
              <Label>Contact Email *</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                required
                placeholder="contact@acme.co.ke"
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+254 700 000 000"
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Admin User (will receive an invite)</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Admin Name *</Label>
                  <Input
                    value={form.adminName}
                    onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))}
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Admin Email *</Label>
                  <Input
                    type="email"
                    value={form.adminEmail}
                    onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                    required
                    placeholder="admin@acme.co.ke"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create Account"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PasswordConfirmModal
        open={!!pendingStatusChange}
        title={
          pendingStatusChange?.status === "Active" ? "Activate this account?"
          : pendingStatusChange?.status === "Suspended" ? "Suspend this account?"
          : "Deactivate this account?"
        }
        description={
          pendingStatusChange?.status === "Active"
            ? "Users will regain access immediately once confirmed."
            : "Users will lose access to this account immediately once confirmed."
        }
        confirmLabel={
          pendingStatusChange?.status === "Active" ? "Activate"
          : pendingStatusChange?.status === "Suspended" ? "Suspend"
          : "Deactivate"
        }
        variant={pendingStatusChange?.status === "Active" ? "default" : "destructive"}
        onConfirm={() => {
          if (pendingStatusChange) handleStatusChange(pendingStatusChange.accountId, pendingStatusChange.status);
          setPendingStatusChange(null);
        }}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
}
