import { useEffect, useState } from "react";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { Plus, Network, ToggleLeft, ToggleRight, CalendarDays, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  hrApi,
  ApiStation, ApiDepartment, ApiJobTitle, ApiLeaveType, ApiShiftPattern, ApiStationModule, ApiPublicHoliday,
} from "@/lib/hrApi";
import { settingsApi } from "@/lib/settingsApi";
import { usePermissions } from "@/lib/permissions";

// ── Station selector ──────────────────────────────────────────────────────────

function useStations() {
  const [stations, setStations] = useState<ApiStation[]>([]);
  useEffect(() => {
    hrApi.stations.list().then(r => setStations(r.data)).catch(() => {});
  }, []);
  return stations;
}

// ── Departments ───────────────────────────────────────────────────────────────

function DepartmentsSubTab({ stationId }: { stationId: string }) {
  const [data, setData] = useState<ApiDepartment[]>([]);
  const [tree, setTree] = useState<ApiDepartment[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiDepartment | null>(null);
  const [form, setForm] = useState({ name: "", description: "", parentId: "", isGlobal: true });
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; description?: string; onConfirm: () => void } | null>(null);
  const can = usePermissions();
  const canManage = can("hr.setup.departments");

  const load = async () => {
    try {
      const [list, treeRes] = await Promise.all([
        hrApi.departments.list(stationId || undefined),
        hrApi.departments.tree(stationId || undefined),
      ]);
      setData(list.data);
      setTree(treeRes.data);
    } catch (e: any) { toast.error(e?.message || "Failed to load departments"); }
  };

  useEffect(() => { load(); }, [stationId]);

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", parentId: "", isGlobal: !stationId }); setModalOpen(true); };
  const openEdit = (d: ApiDepartment) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description || "", parentId: d.parentId || "", isGlobal: d.stationId === "global" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const scopedStationId = form.isGlobal ? undefined : (stationId || undefined);
      if (editing) {
        await hrApi.departments.update(editing.id, { name: form.name, description: form.description || undefined, parentId: form.parentId || null });
        toast.success("Department updated");
      } else {
        await hrApi.departments.create({ name: form.name, description: form.description || undefined, parentId: form.parentId || undefined }, scopedStationId);
        toast.success("Department created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleDelete = (d: ApiDepartment) => {
    setConfirmDlg({
      title: `Delete department "${d.name}"?`,
      description: "This will permanently delete the department.",
      onConfirm: async () => {
        try {
          await hrApi.departments.remove(d.id);
          toast.success("Department deleted");
          load();
        } catch (e: any) { toast.error(e.message || "Cannot delete"); }
      },
    });
  };

  const columns: Column<ApiDepartment>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "parent", label: "Parent", render: d => d.parent ? <Badge variant="outline">{d.parent.name}</Badge> : <span className="text-muted-foreground">—</span> },
    { key: "description", label: "Description", render: d => d.description || "—" },
    { key: "_count", label: "Sub-depts", render: d => d._count?.children ?? "—" },
    { key: "stationId", label: "Scope", render: d => <Badge variant={d.stationId === "global" ? "secondary" : "outline"}>{d.stationId === "global" ? "Global" : "Station"}</Badge> },
  ];

  const renderTree = (nodes: ApiDepartment[], depth = 0): React.ReactNode =>
    nodes.map(node => (
      <div key={node.id} style={{ marginLeft: depth * 20 }} className="py-1">
        <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
          {depth > 0 && <span className="text-muted-foreground">└─</span>}
          <Network className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{node.name}</span>
          {node.description && <span className="text-xs text-muted-foreground">{node.description}</span>}
          {node.jobTitles && node.jobTitles.length > 0 && (
            <div className="flex gap-1 ml-auto">{node.jobTitles.map(jt => <Badge key={jt.id} variant="outline" className="text-[10px]">{jt.title}</Badge>)}</div>
          )}
        </div>
        {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")}>List</Button>
          <Button size="sm" variant={viewMode === "tree" ? "default" : "outline"} onClick={() => setViewMode("tree")}>Org Chart</Button>
        </div>
        {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Department</Button>}
      </div>

      {viewMode === "list" ? (
        <DataTable data={data} columns={columns} searchKeys={["name"]} searchPlaceholder="Search departments..."
          onEdit={canManage ? openEdit : undefined} onDelete={canManage ? handleDelete : undefined} />
      ) : (
        <Card><CardContent className="p-4">
          {tree.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-8">No departments configured yet</p>
            : renderTree(tree)}
        </CardContent></Card>
      )}

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Department" : "Add Department"}
        onSubmit={handleSave} submitLabel={editing ? "Update" : "Create"}>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Operations" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" /></div>
          <div><Label>Parent Department</Label>
            <Select value={form.parentId || "none"} onValueChange={v => setForm(f => ({ ...f, parentId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Top-level (no parent)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Top-level —</SelectItem>
                {data.filter(d => d.id !== editing?.id).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Available to all stations</p>
              <p className="text-xs text-muted-foreground">Global departments are shared across every station</p>
            </div>
            <Switch
              checked={form.isGlobal}
              onCheckedChange={v => setForm(f => ({ ...f, isGlobal: v }))}
              disabled={!stationId}
            />
          </div>
          {!stationId && <p className="text-xs text-muted-foreground -mt-2">Select a specific station above to create a station-scoped department.</p>}
        </div>
      </ModalForm>

      <DangerConfirmModal
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        confirmLabel="Delete"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  );
}

// ── Job Titles ────────────────────────────────────────────────────────────────

function JobTitlesSubTab({ stationId }: { stationId: string }) {
  const [data, setData] = useState<ApiJobTitle[]>([]);
  const [depts, setDepts] = useState<ApiDepartment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiJobTitle | null>(null);
  const [form, setForm] = useState({ title: "", description: "", departmentId: "", grade: "", isGlobal: true });
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; description?: string; onConfirm: () => void } | null>(null);
  const can = usePermissions();
  const canManage = can("hr.setup.jobtitles");

  const load = async () => {
    try {
      const [jts, ds] = await Promise.all([
        hrApi.jobTitles.list({ stationId: stationId || undefined }),
        hrApi.departments.list(stationId || undefined),
      ]);
      setData(jts.data);
      setDepts(ds.data);
    } catch (e: any) { toast.error(e?.message || "Failed to load job titles"); }
  };

  useEffect(() => { load(); }, [stationId]);

  const openNew = () => { setEditing(null); setForm({ title: "", description: "", departmentId: "", grade: "", isGlobal: !stationId }); setModalOpen(true); };
  const openEdit = (jt: ApiJobTitle) => {
    setEditing(jt);
    setForm({ title: jt.title, description: jt.description || "", departmentId: jt.departmentId || "", grade: jt.grade || "", isGlobal: jt.stationId === "global" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const scopedStationId = form.isGlobal ? undefined : (stationId || undefined);
      if (editing) {
        await hrApi.jobTitles.update(editing.id, { title: form.title, description: form.description || undefined, departmentId: form.departmentId || null, grade: form.grade || undefined });
        toast.success("Job title updated");
      } else {
        await hrApi.jobTitles.create({ title: form.title, description: form.description || undefined, departmentId: form.departmentId || undefined, grade: form.grade || undefined }, scopedStationId);
        toast.success("Job title created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleDelete = (jt: ApiJobTitle) => {
    setConfirmDlg({
      title: `Delete job title "${jt.title}"?`,
      description: "This job title will be permanently removed.",
      onConfirm: async () => {
        try { await hrApi.jobTitles.remove(jt.id); toast.success("Deleted"); load(); }
        catch (e: any) { toast.error(e.message || "Cannot delete"); }
      },
    });
  };

  const columns: Column<ApiJobTitle>[] = [
    { key: "title", label: "Title", sortable: true },
    { key: "grade", label: "Grade", render: jt => jt.grade || "—" },
    { key: "department", label: "Department", render: jt => jt.department ? <Badge variant="outline">{jt.department.name}</Badge> : <span className="text-muted-foreground">—</span> },
    { key: "description", label: "Description", render: jt => jt.description || "—" },
    { key: "_count", label: "Employees", render: jt => jt._count?.employees ?? "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Job Title</Button>}
      </div>
      <DataTable data={data} columns={columns} searchKeys={["title"]} searchPlaceholder="Search job titles..."
        onEdit={canManage ? openEdit : undefined} onDelete={canManage ? handleDelete : undefined} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Job Title" : "Add Job Title"}
        onSubmit={handleSave} submitLabel={editing ? "Update" : "Create"}>
        <div className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Attendant" /></div>
          <div><Label>Grade / Level</Label><Input value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. G5, L3" /></div>
          <div><Label>Department</Label>
            <Select value={form.departmentId || "none"} onValueChange={v => setForm(f => ({ ...f, departmentId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Any department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Any —</SelectItem>
                {depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" /></div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Available to all stations</p>
              <p className="text-xs text-muted-foreground">Global job titles are shared across every station</p>
            </div>
            <Switch checked={form.isGlobal} onCheckedChange={v => setForm(f => ({ ...f, isGlobal: v }))} disabled={!stationId} />
          </div>
          {!stationId && <p className="text-xs text-muted-foreground -mt-2">Select a specific station above to create a station-scoped job title.</p>}
        </div>
      </ModalForm>

      <DangerConfirmModal
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        confirmLabel="Delete"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  );
}

// ── Leave Types ───────────────────────────────────────────────────────────────

function LeaveTypesSubTab({ stationId }: { stationId: string }) {
  const blankForm = {
    name: "", daysAllowed: "21", isPaid: true,
    carryOver: false, carryOverMax: "0",
    noticeDays: "0", maxConsecutive: "0",
    minTenureMonths: "0", genderRestriction: "",
    accrualType: "annual",
    excludeHolidays: true, excludeWeekends: true,
    isGlobal: true,
  };

  const [data, setData] = useState<ApiLeaveType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiLeaveType | null>(null);
  const [form, setForm] = useState(blankForm);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; description?: string; onConfirm: () => void } | null>(null);
  const can = usePermissions();
  const canManage = can("hr.setup.leavetypes");

  const load = async () => {
    try { const r = await hrApi.leaveTypes.list(stationId || undefined); setData(r.data); }
    catch (e: any) { toast.error(e?.message || "Failed to load leave types"); }
  };

  useEffect(() => { load(); }, [stationId]);

  const openNew = () => { setEditing(null); setForm({ ...blankForm, isGlobal: !stationId }); setModalOpen(true); };
  const openEdit = (lt: ApiLeaveType) => {
    setEditing(lt);
    setForm({
      name: lt.name, daysAllowed: String(lt.daysAllowed), isPaid: lt.isPaid,
      carryOver: lt.carryOver ?? false, carryOverMax: String(lt.carryOverMax ?? 0),
      noticeDays: String(lt.noticeDays ?? 0), maxConsecutive: String(lt.maxConsecutive ?? 0),
      minTenureMonths: String(lt.minTenureMonths ?? 0), genderRestriction: lt.genderRestriction ?? "",
      accrualType: lt.accrualType ?? "annual",
      excludeHolidays: lt.excludeHolidays ?? true, excludeWeekends: lt.excludeWeekends ?? true,
      isGlobal: lt.stationId === "global",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const scopedStationId = form.isGlobal ? undefined : (stationId || undefined);
      const payload = {
        name: form.name, daysAllowed: parseInt(form.daysAllowed, 10), isPaid: form.isPaid,
        carryOver: form.carryOver, carryOverMax: parseInt(form.carryOverMax, 10),
        noticeDays: parseInt(form.noticeDays, 10), maxConsecutive: parseInt(form.maxConsecutive, 10),
        minTenureMonths: parseInt(form.minTenureMonths, 10), genderRestriction: form.genderRestriction || null,
        accrualType: form.accrualType,
        excludeHolidays: form.excludeHolidays, excludeWeekends: form.excludeWeekends,
      };
      if (editing) {
        await hrApi.leaveTypes.update(editing.id, payload);
        toast.success("Leave type updated");
      } else {
        await hrApi.leaveTypes.create(payload, scopedStationId);
        toast.success("Leave type created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleDelete = (lt: ApiLeaveType) => {
    setConfirmDlg({
      title: `Delete leave type "${lt.name}"?`,
      description: "This leave type will be permanently removed. Existing requests may be affected.",
      onConfirm: async () => {
        try { await hrApi.leaveTypes.remove(lt.id); toast.success("Deleted"); load(); }
        catch (e: any) { toast.error(e.message || "Cannot delete — check for existing requests"); }
      },
    });
  };

  const handleToggle = async (lt: ApiLeaveType) => {
    try { await hrApi.leaveTypes.update(lt.id, { isActive: !lt.isActive }); toast.success(`${lt.name} ${lt.isActive ? "deactivated" : "activated"}`); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const columns: Column<ApiLeaveType>[] = [
    { key: "name", label: "Leave Type", sortable: true },
    { key: "daysAllowed", label: "Days/Year", render: lt => <span className="font-medium">{lt.daysAllowed}</span> },
    { key: "isPaid", label: "Type", render: lt => <Badge variant={lt.isPaid ? "default" : "secondary"}>{lt.isPaid ? "Paid" : "Unpaid"}</Badge> },
    { key: "isActive", label: "Status", render: lt => <Badge variant={lt.isActive ? "default" : "outline"}>{lt.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "stationId", label: "Scope", render: lt => <Badge variant="outline">{lt.stationId === "global" ? "All Stations" : "Station"}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Leave Type</Button>}
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name"]} searchPlaceholder="Search leave types..."
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        actions={canManage ? (lt) => (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleToggle(lt)}>
            {lt.isActive ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
          </Button>
        ) : undefined} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Leave Type" : "Add Leave Type"}
        onSubmit={handleSave} submitLabel={editing ? "Update" : "Create"}>
        <div className="space-y-5">
          {/* Basic */}
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Annual Leave" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Days Allowed / Year</Label><Input type="number" min={1} value={form.daysAllowed} onChange={e => setForm(f => ({ ...f, daysAllowed: e.target.value }))} /></div>
              <div><Label>Pay Type</Label>
                <Select value={form.isPaid ? "paid" : "unpaid"} onValueChange={v => setForm(f => ({ ...f, isPaid: v === "paid" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Policy section */}
          <div className="border rounded-lg p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leave Policy</p>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Accrual Type</Label>
                <Select value={form.accrualType} onValueChange={v => setForm(f => ({ ...f, accrualType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="annual">Annual (lump sum)</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Gender Restriction</Label>
                <Select value={form.genderRestriction || "none"} onValueChange={v => setForm(f => ({ ...f, genderRestriction: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No restriction</SelectItem>
                    <SelectItem value="Male">Male only</SelectItem>
                    <SelectItem value="Female">Female only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Notice Required (days)</Label><Input type="number" min={0} value={form.noticeDays} onChange={e => setForm(f => ({ ...f, noticeDays: e.target.value }))} /></div>
              <div><Label>Max Consecutive (days)</Label><Input type="number" min={0} value={form.maxConsecutive} onChange={e => setForm(f => ({ ...f, maxConsecutive: e.target.value }))} placeholder="0 = unlimited" /></div>
              <div><Label>Min Tenure (months)</Label><Input type="number" min={0} value={form.minTenureMonths} onChange={e => setForm(f => ({ ...f, minTenureMonths: e.target.value }))} /></div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between py-1.5 border-b">
                <div>
                  <p className="text-sm font-medium">Exclude Weekends</p>
                  <p className="text-xs text-muted-foreground">Saturdays and Sundays don't count against leave days</p>
                </div>
                <Switch checked={form.excludeWeekends} onCheckedChange={v => setForm(f => ({ ...f, excludeWeekends: v }))} />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b">
                <div>
                  <p className="text-sm font-medium">Exclude Public Holidays</p>
                  <p className="text-xs text-muted-foreground">Public holidays don't count against leave days</p>
                </div>
                <Switch checked={form.excludeHolidays} onCheckedChange={v => setForm(f => ({ ...f, excludeHolidays: v }))} />
              </div>
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium">Allow Carry Over</p>
                  <p className="text-xs text-muted-foreground">Unused days roll over to the next year</p>
                </div>
                <Switch checked={form.carryOver} onCheckedChange={v => setForm(f => ({ ...f, carryOver: v }))} />
              </div>
              {form.carryOver && (
                <div className="pl-2 pt-1">
                  <Label>Max Carry Over Days (0 = unlimited)</Label>
                  <Input type="number" min={0} value={form.carryOverMax} onChange={e => setForm(f => ({ ...f, carryOverMax: e.target.value }))} className="mt-1.5" />

                </div>
              )}
            </div>
          </div>

          {/* Scope */}
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Available to all stations</p>
              <p className="text-xs text-muted-foreground">Global leave types are shared across every station</p>
            </div>
            <Switch checked={form.isGlobal} onCheckedChange={v => setForm(f => ({ ...f, isGlobal: v }))} disabled={!stationId} />
          </div>
          {!stationId && <p className="text-xs text-muted-foreground -mt-2">Select a specific station above to create a station-scoped leave type.</p>}
        </div>
      </ModalForm>

      <DangerConfirmModal
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        confirmLabel="Delete"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  );
}

// ── Shift Patterns ────────────────────────────────────────────────────────────

function ShiftsSubTab({ stationId }: { stationId: string }) {
  const [data, setData] = useState<ApiShiftPattern[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiShiftPattern | null>(null);
  const [form, setForm] = useState({ name: "", startTime: "08:00", endTime: "17:00", isDefault: false });
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; description?: string; onConfirm: () => void } | null>(null);
  const can = usePermissions();
  const canManage = can("hr.setup.shifts");

  const load = async () => {
    if (!stationId) return;
    try { const r = await hrApi.shifts.list(stationId); setData(r.data); }
    catch (e: any) { toast.error(e?.message || "Failed to load shifts"); }
  };

  useEffect(() => { load(); }, [stationId]);

  const openNew = () => { setEditing(null); setForm({ name: "", startTime: "08:00", endTime: "17:00", isDefault: false }); setModalOpen(true); };
  const openEdit = (s: ApiShiftPattern) => { setEditing(s); setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, isDefault: s.isDefault }); setModalOpen(true); };

  const handleSave = async () => {
    if (!stationId) return toast.error("Select a station first");
    try {
      if (editing) {
        await hrApi.shifts.update(editing.id, { name: form.name, startTime: form.startTime, endTime: form.endTime, isDefault: form.isDefault });
        toast.success("Shift updated");
      } else {
        await hrApi.shifts.create({ ...form, stationId }, stationId);
        toast.success("Shift pattern created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleDelete = (s: ApiShiftPattern) => {
    setConfirmDlg({
      title: `Delete shift "${s.name}"?`,
      description: "This shift pattern will be permanently removed.",
      onConfirm: async () => {
        try { await hrApi.shifts.remove(s.id); toast.success("Deleted"); load(); }
        catch (e: any) { toast.error(e.message || "Cannot delete — shift has assignments"); }
      },
    });
  };

  const columns: Column<ApiShiftPattern>[] = [
    { key: "name", label: "Shift Name", sortable: true },
    { key: "startTime", label: "Start" },
    { key: "endTime", label: "End" },
    { key: "isDefault", label: "Default", render: s => s.isDefault ? <Badge>Default</Badge> : null },
    { key: "_count", label: "Assignments", render: s => s._count?.assignments ?? "—" },
  ];

  return (
    <div className="space-y-4">
      {!stationId && <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">Select a station above to manage shift patterns.</p>}
      <div className="flex justify-end">
        {canManage && stationId && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Shift</Button>}
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name"]} searchPlaceholder="Search shifts..."
        onEdit={canManage ? openEdit : undefined} onDelete={canManage ? handleDelete : undefined} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Shift Pattern" : "New Shift Pattern"}
        onSubmit={handleSave} submitLabel={editing ? "Update" : "Create"}>
        <div className="space-y-4">
          <div><Label>Shift Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Shift" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Time *</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
            <div><Label>End Time *</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="h-4 w-4" />
            <Label htmlFor="isDefault" className="cursor-pointer">Set as default shift for this station</Label>
          </div>
        </div>
      </ModalForm>

      <DangerConfirmModal
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        confirmLabel="Delete"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  );
}

// ── Public Holidays ───────────────────────────────────────────────────────────

// Which weekdays don't count as working days for leave-day calculations —
// previously hardcoded to Sat+Sun everywhere, so a station that runs Saturday
// as a working day (or a different rest-day schedule) had no way to say so.
// Stored per-station via the generic StationConfig "workdays" section.
const WEEKDAYS = [
  { value: 0, label: "Sunday" }, { value: 1, label: "Monday" }, { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" }, { value: 4, label: "Thursday" }, { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];
const DEFAULT_NON_WORKING_DAYS = [0, 6]; // Sun + Sat — matches the old hardcoded behavior

function NonWorkingDaysCard({ stationId }: { stationId: string }) {
  const [nonWorkingDays, setNonWorkingDays] = useState<number[]>(DEFAULT_NON_WORKING_DAYS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const can = usePermissions();
  const canManage = can("hr.setup.leavetypes");

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    settingsApi.config.get<{ nonWorkingDays?: number[] }>("workdays", stationId)
      .then(r => setNonWorkingDays(r.data?.nonWorkingDays ?? DEFAULT_NON_WORKING_DAYS))
      .catch(() => setNonWorkingDays(DEFAULT_NON_WORKING_DAYS))
      .finally(() => setLoading(false));
  }, [stationId]);

  const toggleDay = (day: number) => {
    setNonWorkingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.config.set("workdays", { nonWorkingDays }, stationId);
      toast.success("Non-working days updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!stationId) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Select a specific station above to configure its non-working days (this setting is per-station).
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Non-working days</CardTitle>
        <p className="text-xs text-muted-foreground font-normal mt-1">
          Days excluded from leave-day and attendance calculations for this station. Leave types with
          "Exclude weekends" enabled will skip these days instead of always assuming Sat/Sun.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map(d => (
            <button
              key={d.value}
              type="button"
              disabled={!canManage || loading}
              onClick={() => toggleDay(d.value)}
              className={`px-3 py-1.5 rounded-md text-xs border transition-colors disabled:opacity-50 ${
                nonWorkingDays.includes(d.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted text-muted-foreground border-input"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {canManage && (
          <Button size="sm" onClick={save} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function HolidaysSubTab({ stationId }: { stationId: string }) {
  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<ApiPublicHoliday[]>([]);
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPublicHoliday | null>(null);
  const [form, setForm] = useState({ name: "", date: "", isRecurring: true });
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; onConfirm: () => void } | null>(null);
  const can = usePermissions();
  const canManage = can("hr.setup.holidays");

  const load = async () => {
    try { const r = await hrApi.holidays.list(stationId ? { stationId } : undefined); setData(r.data); }
    catch (e: any) { toast.error(e?.message || "Failed to load holidays"); }
  };

  useEffect(() => { load(); }, [stationId]);

  const visible = data.filter(h => {
    const d = new Date(h.date);
    if (h.isRecurring) return true;
    return d.getFullYear() === yearFilter;
  });

  const openNew = () => { setEditing(null); setForm({ name: "", date: "", isRecurring: true }); setModalOpen(true); };
  const openEdit = (h: ApiPublicHoliday) => {
    setEditing(h);
    setForm({ name: h.name, date: h.date.slice(0, 10), isRecurring: h.isRecurring });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.date) return toast.error("Name and date are required");
    try {
      if (editing) {
        await hrApi.holidays.update(editing.id, { name: form.name, date: form.date, isRecurring: form.isRecurring });
        toast.success("Holiday updated");
      } else {
        await hrApi.holidays.create({ name: form.name, date: form.date, isRecurring: form.isRecurring }, stationId || undefined);
        toast.success("Holiday added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
  };

  const handleDelete = (h: ApiPublicHoliday) => {
    setConfirmDlg({
      title: `Remove "${h.name}"?`,
      onConfirm: async () => {
        try { await hrApi.holidays.remove(h.id); toast.success("Holiday removed"); load(); }
        catch (e: any) { toast.error(e.message || "Cannot delete"); }
      },
    });
  };

  const KENYA_DEFAULTS = [
    { name: "New Year's Day",  date: "2024-01-01", isRecurring: true },
    { name: "Labour Day",      date: "2024-05-01", isRecurring: true },
    { name: "Madaraka Day",    date: "2024-06-01", isRecurring: true },
    { name: "Huduma Day",      date: "2024-10-10", isRecurring: true },
    { name: "Mashujaa Day",    date: "2024-10-20", isRecurring: true },
    { name: "Jamhuri Day",     date: "2024-12-12", isRecurring: true },
    { name: "Christmas Day",   date: "2024-12-25", isRecurring: true },
    { name: "Boxing Day",      date: "2024-12-26", isRecurring: true },
    { name: "Good Friday",     date: "2024-03-29", isRecurring: false },
    { name: "Easter Monday",   date: "2024-04-01", isRecurring: false },
  ];

  const loadKenyaDefaults = async () => {
    // The backend now rejects exact duplicates (name+date+scope) with a 409,
    // but skip already-loaded ones client-side too so re-clicking this button
    // (e.g. across repeated visits) doesn't even attempt them, and so the
    // "already existed" count is accurate rather than lumping failures in.
    const existingKeys = new Set(
      data.map(h => `${h.name.trim().toLowerCase()}|${new Date(h.date).toISOString().split("T")[0].slice(5)}`)
    );
    const toCreate = KENYA_DEFAULTS.filter(
      h => !existingKeys.has(`${h.name.trim().toLowerCase()}|${h.date.slice(5)}`)
    );
    if (toCreate.length === 0) {
      toast.info("Kenya public holidays are already loaded");
      return;
    }
    let created = 0, skipped = 0;
    for (const h of toCreate) {
      try {
        await hrApi.holidays.create(h, undefined);
        created++;
      } catch {
        skipped++; // most likely a 409 from a duplicate created concurrently elsewhere
      }
    }
    toast.success(`${created} Kenya public holiday(s) added${skipped ? ` (${skipped} already existed)` : ""}`);
    load();
  };

  const columns: Column<ApiPublicHoliday>[] = [
    { key: "name", label: "Holiday", sortable: true },
    {
      key: "date", label: "Date", render: h => {
        const d = new Date(h.date);
        return h.isRecurring
          ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
          : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
      }
    },
    { key: "isRecurring", label: "Recurrence", render: h => <Badge variant={h.isRecurring ? "default" : "secondary"}>{h.isRecurring ? "Yearly" : "Once"}</Badge> },
    { key: "stationId", label: "Scope", render: h => <Badge variant="outline">{h.stationId === "global" ? "All Stations" : "This Station"}</Badge> },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-4">
      <NonWorkingDaysCard stationId={stationId} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Recurring holidays show every year. One-time holidays are filtered by year.</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            {years.map(y => (
              <button key={y} onClick={() => setYearFilter(y)}
                className={`px-3 py-1 text-xs transition-colors ${y === yearFilter ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
                {y}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          {canManage && data.length === 0 && (
            <Button size="sm" variant="outline" onClick={loadKenyaDefaults}>Load Kenya Defaults</Button>
          )}
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Holiday</Button>}
        </div>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No public holidays configured yet.</p>
          {canManage && (
            <div className="flex items-center gap-2 mt-3 justify-center">
              <Button size="sm" variant="outline" onClick={loadKenyaDefaults}>Load Kenya Defaults</Button>
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Holiday</Button>
            </div>
          )}
        </CardContent></Card>
      ) : (
        <DataTable data={visible} columns={columns} searchKeys={["name"]} searchPlaceholder="Search holidays..."
          onEdit={canManage ? openEdit : undefined}
          onDelete={canManage ? handleDelete : undefined} />
      )}

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Holiday" : "Add Public Holiday"}
        onSubmit={handleSave} submitLabel={editing ? "Update" : "Add Holiday"}>
        <div className="space-y-4">
          <div><Label>Holiday Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. New Year's Day" /></div>
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="flex items-center justify-between py-2 border rounded-lg px-4">
            <div>
              <p className="text-sm font-medium">Recurring Annually</p>
              <p className="text-xs text-muted-foreground">Holiday repeats every year on the same date</p>
            </div>
            <Switch checked={form.isRecurring} onCheckedChange={v => setForm(f => ({ ...f, isRecurring: v }))} />
          </div>
          {stationId && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
              This holiday will apply to the selected station only. Leave station as "All Stations" to make it global.
            </p>
          )}
        </div>
      </ModalForm>

      <DangerConfirmModal
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        confirmLabel="Remove"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  );
}

// ── Station Modules ───────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  hr: "HR Management", fuel: "Fuel Management", lpg: "LPG Management",
  water: "Water Production", carwash: "Car Wash", auto: "Auto Services",
  pos: "POS / Inventory", finance: "Finance", compliance: "Compliance",
};

function ModulesSubTab({ station }: { station: ApiStation | null }) {
  const [modules, setModules] = useState<ApiStationModule[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const can = usePermissions();
  const canManage = can("stations.modules.configure");

  const load = async () => {
    if (!station) return;
    try { const r = await hrApi.modules.get(station.id); setModules(r.data); }
    catch (e: any) { toast.error(e?.message || "Failed to load modules"); }
  };

  useEffect(() => { load(); }, [station?.id]);

  const toggle = async (mod: string, current: boolean) => {
    if (!station) return;
    if (mod === "hr") return toast.error("HR module cannot be disabled");
    setSaving(mod);
    try {
      await hrApi.modules.update(station.id, { [mod]: !current });
      toast.success(`${MODULE_LABELS[mod] || mod} ${!current ? "enabled" : "disabled"}`);
      load();
    } catch (e: any) { toast.error(e.message || "Failed to update"); }
    finally { setSaving(null); }
  };

  if (!station) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Select a station above to manage its modules.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Configure which modules are active for <strong>{station.name}</strong>. HR is always enabled.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modules.map(m => (
          <Card key={m.module} className={m.isEnabled ? "border-primary/30" : ""}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{MODULE_LABELS[m.module] || m.module}</p>
                <p className="text-xs text-muted-foreground">{m.isEnabled ? "Active" : "Inactive"}</p>
              </div>
              <button
                disabled={!canManage || m.module === "hr" || saving === m.module}
                onClick={() => toggle(m.module, m.isEnabled)}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {m.isEnabled
                  ? <ToggleRight className="h-8 w-8 text-primary" />
                  : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function HRSetupTab() {
  const stations = useStations();
  const [selectedStationId, setSelectedStationId] = useState("");
  const selectedStation = stations.find(s => s.id === selectedStationId) || null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">HR Setup</h3>
        <p className="text-sm text-muted-foreground">Configure departments, job titles, leave types, public holidays, shift patterns, and station modules</p>
      </div>

      {/* Station picker — used by shifts and modules */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Station Context</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Select value={selectedStationId || "global"} onValueChange={v => setSelectedStationId(v === "global" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All stations (global)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">All Stations (global)</SelectItem>
                  {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Departments and job titles created without a station are shared across all stations.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="departments">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="jobtitles">Job Titles</TabsTrigger>
          <TabsTrigger value="leavetypes">Leave Types</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="shifts">Shift Patterns</TabsTrigger>
          <TabsTrigger value="modules">Station Modules</TabsTrigger>
        </TabsList>
        <TabsContent value="departments"><DepartmentsSubTab stationId={selectedStationId} /></TabsContent>
        <TabsContent value="jobtitles"><JobTitlesSubTab stationId={selectedStationId} /></TabsContent>
        <TabsContent value="leavetypes"><LeaveTypesSubTab stationId={selectedStationId} /></TabsContent>
        <TabsContent value="holidays"><HolidaysSubTab stationId={selectedStationId} /></TabsContent>
        <TabsContent value="shifts"><ShiftsSubTab stationId={selectedStationId} /></TabsContent>
        <TabsContent value="modules"><ModulesSubTab station={selectedStation} /></TabsContent>
      </Tabs>
    </div>
  );
}
