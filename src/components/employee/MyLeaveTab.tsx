import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, List, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LeaveCalendar } from "@/components/shared/LeaveCalendar";
import { toast } from "sonner";
import { hrApi, ApiLeaveRequest, ApiLeaveBalance, ApiLeaveType, ApiPublicHoliday } from "@/lib/hrApi";

const blank = { leaveTypeId: "", startDate: "", endDate: "", reason: "" };

const columns: Column<ApiLeaveRequest>[] = [
  { key: "id", label: "Ref", render: r => r.id.slice(-8).toUpperCase() },
  { key: "leaveType", label: "Type", render: r => <Badge variant="outline">{r.leaveType?.name ?? "—"}</Badge> },
  { key: "startDate", label: "From", sortable: true, render: r => new Date(r.startDate).toLocaleDateString() },
  { key: "endDate", label: "To", render: r => new Date(r.endDate).toLocaleDateString() },
  { key: "days", label: "Days" },
  { key: "createdAt", label: "Applied", sortable: true, render: r => new Date(r.createdAt).toLocaleDateString() },
  { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
  { key: "approvedBy", label: "Actioned By", render: r => (r.approvedBy as string) || "—" },
];

const filterOpts: FilterOption[] = [
  { key: "status", label: "Status", options: [
    { label: "Pending", value: "Pending" },
    { label: "Approved", value: "Approved" },
    { label: "Rejected", value: "Rejected" },
    { label: "Cancelled", value: "Cancelled" },
  ]},
];

export default function MyLeaveTab() {
  const [requests,   setRequests]   = useState<ApiLeaveRequest[]>([]);
  const [balances,   setBalances]   = useState<ApiLeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ApiLeaveType[]>([]);
  const [holidays,   setHolidays]   = useState<ApiPublicHoliday[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [viewing, setViewing]       = useState<ApiLeaveRequest | null>(null);
  const [form, setForm]             = useState(blank);
  const [saving, setSaving]         = useState(false);
  const [view, setView]             = useState<"list" | "calendar">("list");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, balRes, typRes, holRes] = await Promise.all([
        hrApi.self.leaves.list({ limit: 100 }),
        hrApi.self.leaves.balances(),
        hrApi.self.leaves.types(),
        hrApi.holidays.list(),
      ]);
      setRequests(reqRes.data ?? []);
      setBalances(balRes.data ?? []);
      setLeaveTypes(typRes.data ?? []);
      setHolidays(holRes.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      return toast.error("Leave type, start date, and end date are required");
    }
    setSaving(true);
    try {
      await hrApi.self.leaves.submit({
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      });
      toast.success("Leave request submitted");
      setModalOpen(false);
      setForm(blank);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (req: ApiLeaveRequest) => {
    if (req.status !== "Pending") return toast.error("Only pending requests can be cancelled");
    try {
      await hrApi.self.leaves.cancel(req.id);
      toast.success("Leave request cancelled");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to cancel");
    }
  };

  return (
    <div className="space-y-4">
      {/* Leave balance cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {balances.length > 0 ? (
          balances.map(b => (
            <Card key={b.leaveType.id}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{b.available}</div>
                <div className="text-xs font-medium">{b.leaveType.name}</div>
                <div className="text-[10px] text-muted-foreground">{b.used} used · {b.pending} pending</div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-4">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              No leave balances allocated yet. Contact HR.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Leave History</h3>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors border-l ${view === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => { setForm(blank); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Apply for Leave
          </Button>
        </div>
      </div>

      {view === "calendar" ? (
        <LeaveCalendar leaves={requests} mode="employee" holidays={holidays} />
      ) : (
        <DataTable
          data={requests}
          columns={columns}
          searchKeys={["id"]}
          searchPlaceholder="Search leave requests..."
          filters={filterOpts}
          onView={r => setViewing(r)}
          extraActions={[{ label: "Cancel", onClick: handleCancel }]}
        />
      )}

      {/* Apply modal */}
      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Apply for Leave"
        description="Submit a new leave request to your manager"
        onSubmit={handleSubmit}
        submitLabel={saving ? "Submitting..." : "Submit Application"}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Leave Type</Label>
            <Select value={form.leaveTypeId} onValueChange={v => setForm(f => ({ ...f, leaveTypeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
              <SelectContent>
                {leaveTypes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.daysAllowed} days/yr)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
          <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          <div className="col-span-2">
            <Label>Reason (optional)</Label>
            <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave..." />
          </div>
        </div>
      </ModalForm>

      {/* View modal */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Leave Request Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Ref:</span> {viewing.id.slice(-8).toUpperCase()}</div>
            <div><span className="text-muted-foreground">Type:</span> {viewing.leaveType?.name ?? "—"}</div>
            <div><span className="text-muted-foreground">From:</span> {new Date(viewing.startDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">To:</span> {new Date(viewing.endDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Days:</span> {viewing.days}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {viewing.reason || "—"}</div>
            <div><span className="text-muted-foreground">Applied:</span> {new Date(viewing.createdAt).toLocaleDateString()}</div>
            {viewing.approvedBy && <div><span className="text-muted-foreground">Actioned By:</span> {viewing.approvedBy as string}</div>}
            {viewing.note && <div className="col-span-2"><span className="text-muted-foreground">Note:</span> {viewing.note}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
