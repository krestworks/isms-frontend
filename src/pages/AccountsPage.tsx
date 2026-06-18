import { useEffect, useState, useCallback } from "react";
import { Plus, Building2, Users, MoreHorizontal, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { accountsApi, ApiAccount } from "@/lib/accountsApi";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  Active:    "bg-green-500/10 text-green-600 border-green-500/20",
  Pending:   "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Suspended: "bg-red-500/10 text-red-600 border-red-500/20",
  Inactive:  "bg-muted text-muted-foreground",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  Active:    CheckCircle2,
  Pending:   Clock,
  Suspended: XCircle,
  Inactive:  AlertCircle,
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
  const [accounts, setAccounts]     = useState<ApiAccount[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating]     = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState<CreateForm>(emptyForm);
  const [devLink, setDevLink]       = useState<string | null>(null);

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
      toast.success(`Account "${form.name}" created`);
      if (res.dev_invite_link) setDevLink(res.dev_invite_link);
      setForm(emptyForm);
      setShowCreate(false);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(account: ApiAccount, status: ApiAccount["status"]) {
    try {
      await accountsApi.updateStatus(account.id, status);
      toast.success(`Account ${status.toLowerCase()}`);
      load();
    } catch {
      toast.error("Failed to update account status");
    }
  }

  const stats = [
    { label: "Total",     value: total,                                                     color: "" },
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

      {/* Accounts list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 h-28" />
            </Card>
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
            <Card key={account.id} className="hover:border-primary/40 transition-colors">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {account.status !== "Active" && (
                      <DropdownMenuItem onClick={() => handleStatusChange(account, "Active")}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" /> Activate
                      </DropdownMenuItem>
                    )}
                    {account.status !== "Suspended" && (
                      <DropdownMenuItem onClick={() => handleStatusChange(account, "Suspended")} className="text-destructive">
                        <XCircle className="h-3.5 w-3.5 mr-2" /> Suspend
                      </DropdownMenuItem>
                    )}
                    {account.status !== "Inactive" && (
                      <DropdownMenuItem onClick={() => handleStatusChange(account, "Inactive")}>
                        <AlertCircle className="h-3.5 w-3.5 mr-2" /> Deactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <AccountStatusBadge status={account.status} />
                  {account._count && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {account._count.users}</span>
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {account._count.stations}</span>
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

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Business Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Business Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Acme Fuels Ltd" />
            </div>
            <div className="space-y-1">
              <Label>Contact Email *</Label>
              <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} required placeholder="contact@acme.co.ke" />
            </div>
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Admin User (will receive an invite)</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Admin Name *</Label>
                  <Input value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))} required placeholder="John Doe" />
                </div>
                <div className="space-y-1">
                  <Label>Admin Email *</Label>
                  <Input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} required placeholder="admin@acme.co.ke" />
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

      {/* Dev invite link dialog */}
      {devLink && (
        <Dialog open onOpenChange={() => setDevLink(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Admin Invite Link (Dev)</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mb-2">Share this link with the admin to activate their account. In production this would be sent by email.</p>
            <code className="block text-xs bg-muted p-3 rounded break-all">{devLink}</code>
            <DialogFooter>
              <Button onClick={() => { navigator.clipboard.writeText(devLink); toast.success("Copied"); }}>Copy Link</Button>
              <Button variant="outline" onClick={() => setDevLink(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
