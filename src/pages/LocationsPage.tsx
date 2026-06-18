import { useCallback, useEffect, useState } from "react";
import { Plus, MapPin, ArrowRight, RefreshCw, RotateCcw, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sessionStore, useSession } from "@/data/sessionStore";
import { usePermissions } from "@/lib/permissions";
import { stationsApi, ApiStationFull } from "@/lib/stationsApi";
import { toast } from "sonner";

const TYPES    = ["Branch", "Headquarters", "Franchise", "Depot", "Region", "Outlet"];
const STATUSES = ["Active", "Inactive", "Maintenance"];

const emptyForm = { name: "", type: "Branch", status: "Active", city: "", address: "", phone: "", openedOn: "" };

function daysLeft(deletedAt: string): number {
  const grace = new Date(deletedAt).getTime() + 5 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((grace - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function LocationsPage() {
  const { user, activeLocation } = useSession();
  const can = usePermissions();

  const canViewAll  = can("stations.view");
  const canCreate   = can("stations.create");
  const canManage   = can("stations.manage");

  const [stations, setStations]             = useState<ApiStationFull[]>([]);
  const [deleted, setDeleted]               = useState<ApiStationFull[]>([]);
  const [loading, setLoading]               = useState(true);
  const [modalOpen, setModalOpen]           = useState(false);
  const [editing, setEditing]               = useState<ApiStationFull | null>(null);
  const [viewing, setViewing]               = useState<ApiStationFull | null>(null);
  const [form, setForm]                     = useState(emptyForm);
  const [saving, setSaving]                 = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget]     = useState<ApiStationFull | null>(null);
  const [deleteConfirm, setDeleteConfirm]   = useState("");
  const [deleting, setDeleting]             = useState(false);

  // Purge confirmation state
  const [purgeTarget, setPurgeTarget]       = useState<ApiStationFull | null>(null);
  const [purging, setPurging]               = useState(false);

  // Card pagination
  const CARDS_PER_PAGE = 4;
  const [cardPage, setCardPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, deletedRes] = await Promise.all([
        stationsApi.list(),
        canManage ? stationsApi.list({ include_deleted: true }) : Promise.resolve({ success: true, data: [] as ApiStationFull[] }),
      ]);
      const activeStations = activeRes.data ?? [];
      const allStations    = deletedRes.data ?? [];

      setStations(activeStations);
      setDeleted(allStations.filter(s => s.deletedAt));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { load(); }, [load]);

  const switchTo = (name: string) => {
    sessionStore.switchLocation(name);
    toast.success(`Switched scope → ${name}`);
  };

  // ── Create / Edit ───────────────────────────────────────────────────────────

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, openedOn: new Date().toISOString().split("T")[0] });
    setModalOpen(true);
  };

  const openEdit = (s: ApiStationFull) => {
    setEditing(s);
    setForm({
      name: s.name, type: s.type, status: s.status,
      city: s.city ?? "", address: s.address ?? "",
      phone: s.phone ?? "", openedOn: s.openedOn ? s.openedOn.split("T")[0] : "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Station name is required");
    setSaving(true);
    try {
      if (editing) {
        await stationsApi.update(editing.id, form);
        toast.success("Station updated");
      } else {
        await stationsApi.create(form);
        toast.success("Station created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save station");
    } finally {
      setSaving(false);
    }
  };

  // ── Soft-delete ─────────────────────────────────────────────────────────────

  const confirmDelete = (s: ApiStationFull) => {
    setDeleteTarget(s);
    setDeleteConfirm("");
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== deleteTarget.name) return;
    setDeleting(true);
    try {
      await stationsApi.delete(deleteTarget.id);
      toast.success("Station scheduled for deletion. It will be permanently removed after 5 days.");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete station");
    } finally {
      setDeleting(false);
    }
  };

  // ── Restore ─────────────────────────────────────────────────────────────────

  const handleRestore = async (s: ApiStationFull) => {
    try {
      await stationsApi.restore(s.id);
      toast.success(`${s.name} restored`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore station");
    }
  };

  // ── Hard-delete (purge) ──────────────────────────────────────────────────────

  const handlePurge = async () => {
    if (!purgeTarget) return;
    setPurging(true);
    try {
      await stationsApi.purge(purgeTarget.id);
      toast.success(`${purgeTarget.name} permanently deleted`);
      setPurgeTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || e?.data?.message || "Failed to permanently delete station");
    } finally {
      setPurging(false);
    }
  };

  // ── Table ────────────────────────────────────────────────────────────────────

  const columns: Column<ApiStationFull>[] = [
    { key: "name",    label: "Name",    sortable: true },
    { key: "type",    label: "Type",    render: s => <Badge variant="outline">{s.type}</Badge> },
    { key: "city",    label: "City",    render: s => s.city || "—" },
    { key: "phone",   label: "Phone",   render: s => s.phone || "—" },
    { key: "openedOn",label: "Opened",  render: s => s.openedOn ? s.openedOn.split("T")[0] : "—", sortable: true },
    { key: "status",  label: "Status",  render: s => <StatusBadge status={s.status} /> },
  ];

  const filterOpts: FilterOption[] = [
    { key: "type",   label: "Type",   options: TYPES.map(t => ({ label: t, value: t })) },
    { key: "status", label: "Status", options: STATUSES.map(s => ({ label: s, value: s })) },
  ];

  const stats = {
    total:       stations.length,
    active:      stations.filter(s => s.status === "Active").length,
    branches:    stations.filter(s => s.type === "Branch").length,
    pendingPurge: deleted.length,
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <ModulePageShell title="Locations" description="Branches, depots & regional outlets" icon={MapPin}>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold">{canViewAll ? "All Locations" : "Your Location"}</h3>
            <p className="text-sm text-muted-foreground">
              {canViewAll
                ? "Manage stations and assign modules per location"
                : "Viewing your assigned station"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
            {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Location</Button>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total",          value: stats.total },
            { label: "Active",         value: stats.active,      color: "text-green-600" },
            { label: "Branches",       value: stats.branches,    color: "text-primary" },
            { label: "Pending Deletion", value: stats.pendingPurge, color: stats.pendingPurge > 0 ? "text-destructive" : "" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Location cards — paginated, one row at a time */}
        {stations.length > 0 && (() => {
          const totalPages = Math.ceil(stations.length / CARDS_PER_PAGE);
          const safePage   = Math.min(cardPage, totalPages - 1);
          const pageStations = stations.slice(safePage * CARDS_PER_PAGE, (safePage + 1) * CARDS_PER_PAGE);
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {pageStations.map(loc => {
                  const isActive  = activeLocation === loc.name;
                  const isHome    = user.homeLocation === loc.id;
                  const canSwitch = canViewAll || isHome;
                  return (
                    <Card key={loc.id} className={isActive ? "border-primary shadow-md" : ""}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{loc.name}</span>
                              {isActive && <Badge variant="default" className="text-[9px]">Active</Badge>}
                              {isHome   && <Badge variant="outline" className="text-[9px]">Home</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground">{loc.type}{loc.city ? ` · ${loc.city}` : ""}</p>
                          </div>
                          <StatusBadge status={loc.status} />
                        </div>
                        {loc.phone && <p className="text-xs text-muted-foreground">{loc.phone}</p>}
                        <Button
                          size="sm"
                          variant={isActive ? "secondary" : "outline"}
                          className="w-full"
                          disabled={!canSwitch || isActive}
                          onClick={() => switchTo(loc.name)}
                        >
                          {isActive ? "Currently viewing" : <>Switch <ArrowRight className="h-3.5 w-3.5 ml-1" /></>}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCardPage(p => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {safePage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCardPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage === totalPages - 1}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Table */}
        <DataTable
          data={stations}
          columns={columns}
          searchKeys={["name", "city"]}
          searchPlaceholder="Search locations..."
          filters={filterOpts}
          onView={s => setViewing(s)}
          onEdit={canManage ? openEdit : undefined}
          onDelete={canManage ? confirmDelete : undefined}
        />

        {/* Pending Deletion section — admin/manage only */}
        {canManage && deleted.length > 0 && (
          <Card className="border-destructive/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Pending Deletion ({deleted.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deleted.map(s => {
                const remaining = daysLeft(s.deletedAt!);
                const canPurgeNow = remaining === 0;
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Deleted {new Date(s.deletedAt!).toLocaleDateString()} ·{" "}
                        {canPurgeNow
                          ? <span className="text-destructive font-medium">Grace period ended — ready to purge</span>
                          : <span>{remaining} day{remaining !== 1 ? "s" : ""} until permanent deletion</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRestore(s)}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!canPurgeNow}
                        onClick={() => setPurgeTarget(s)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {canPurgeNow ? "Delete Now" : `${remaining}d left`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Create / Edit modal */}
        <ModalForm
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? "Edit Location" : "Add Location"}
          onSubmit={handleSave}
          submitLabel={saving ? (editing ? "Updating..." : "Creating...") : (editing ? "Update" : "Create")}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>City</Label><Input value={form.city} onChange={e => set("city", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={e => set("address", e.target.value)} />
              </div>
              <div><Label>Opened On</Label><Input type="date" value={form.openedOn} onChange={e => set("openedOn", e.target.value)} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ModalForm>

        {/* View modal */}
        <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Location Details" isView>
          {viewing && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{viewing.type}</Badge>
                <StatusBadge status={viewing.status} />
              </div>
              <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
              {viewing.city    && <div><span className="text-muted-foreground">City:</span> {viewing.city}</div>}
              {viewing.address && <div><span className="text-muted-foreground">Address:</span> {viewing.address}</div>}
              {viewing.phone   && <div><span className="text-muted-foreground">Phone:</span> {viewing.phone}</div>}
              {viewing.openedOn && <div><span className="text-muted-foreground">Opened:</span> {viewing.openedOn.split("T")[0]}</div>}
              <div><span className="text-muted-foreground">Created:</span> {viewing.createdAt.split("T")[0]}</div>
            </div>
          )}
        </ModalForm>

        {/* Delete confirmation modal — requires typing station name */}
        <ModalForm
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Schedule Station for Deletion"
          onSubmit={handleDelete}
          submitLabel={deleting ? "Scheduling..." : "Schedule Deletion"}
          submitVariant="destructive"
        >
          {deleteTarget && (
            <div className="space-y-4">
              <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>{deleteTarget.name}</strong> will be hidden immediately and permanently deleted after
                  a 5-day grace period. All attached data (employees, records, shifts) will also be removed.
                  You can restore it any time before the grace period ends.
                </span>
              </div>
              <div>
                <Label>
                  Type <span className="font-mono font-semibold">{deleteTarget.name}</span> to confirm
                </Label>
                <Input
                  className="mt-1"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={deleteTarget.name}
                />
              </div>
              {deleteConfirm !== deleteTarget.name && deleteConfirm.length > 0 && (
                <p className="text-xs text-destructive">Name does not match</p>
              )}
            </div>
          )}
        </ModalForm>

        {/* Purge confirmation modal */}
        <ModalForm
          open={!!purgeTarget}
          onClose={() => setPurgeTarget(null)}
          title="Permanently Delete Station"
          onSubmit={handlePurge}
          submitLabel={purging ? "Deleting..." : "Delete Permanently"}
          submitVariant="destructive"
        >
          {purgeTarget && (
            <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                This will <strong>permanently and irreversibly</strong> delete <strong>{purgeTarget.name}</strong> and
                all data attached to it. This action cannot be undone.
              </span>
            </div>
          )}
        </ModalForm>

      </div>
    </ModulePageShell>
  );
}
