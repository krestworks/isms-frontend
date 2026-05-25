import { useCallback, useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
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
import { toast } from "sonner";
import { hrApi, ApiLeaveRequest, ApiLeaveType } from "@/lib/hrApi";
import { usePermissions } from "@/lib/permissions";

export default function LeaveManagementTab() {
  const [requests, setRequests] = useState<ApiLeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ApiLeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<{ req: ApiLeaveRequest; action: "approve" | "reject" } | null>(null);
  const [viewing, setViewing] = useState<ApiLeaveRequest | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const can = usePermissions();
  const canSubmit = can("hr.leaves.view");
  const canApprove = can("hr.leaves.approve");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, typesRes] = await Promise.all([
        hrApi.leaves.list({ page: 1 }),
        hrApi.leaveTypes.list(),
      ]);
      setRequests(reqRes.data ?? []);
      setLeaveTypes(typesRes.data ?? []);
    } catch {
      toast.error("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    pending: requests.filter(r => r.status === "Pending").length,
    approved: requests.filter(r => r.status === "Approved").length,
    rejected: requests.filter(r => r.status === "Rejected").length,
    totalDays: requests.filter(r => r.status === "Approved").reduce((s, r) => s + r.days, 0),
  };

  const handleSubmit = async () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) return toast.error("Fill all required fields");
    setSaving(true);
    try {
      await hrApi.leaves.submit({ leaveTypeId: form.leaveTypeId, startDate: form.startDate, endDate: form.endDate, reason: form.reason });
      toast.success("Leave request submitted");
      setSubmitOpen(false);
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setSaving(true);
    try {
      await hrApi.leaves.approve(approveTarget.req.id, approveTarget.action, approveNote || undefined);
      toast.success(approveTarget.action === "approve" ? "Leave approved" : "Leave rejected");
      setApproveTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (req: ApiLeaveRequest) => {
    try {
      await hrApi.leaves.cancel(req.id);
      toast.success("Leave request cancelled");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to cancel");
    }
  };

  const columns: Column<ApiLeaveRequest>[] = [
    { key: "id", label: "Ref", render: r => <span className="font-mono text-xs">{r.id.slice(-8).toUpperCase()}</span> },
    { key: "employee", label: "Employee", render: r => r.employee?.user.name || "—", sortable: true },
    { key: "leaveTypeId", label: "Type", render: r => <Badge variant="secondary">{r.leaveType?.name || "—"}</Badge> },
    { key: "startDate", label: "From", sortable: true },
    { key: "endDate", label: "To" },
    { key: "days", label: "Days", render: r => <span className="font-medium">{r.days}</span> },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "createdAt", label: "Applied", render: r => r.createdAt.split("T")[0] },
  ];

  const filterOpts: FilterOption[] = [
    { key: "status", label: "Status", options: [
      { label: "Pending", value: "Pending" },
      { label: "Approved", value: "Approved" },
      { label: "Rejected", value: "Rejected" },
      { label: "Cancelled", value: "Cancelled" },
    ]},
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Management</h3>
          <p className="text-sm text-muted-foreground">Review, approve and track leave applications</p>
        </div>
        {canSubmit && (
          <Button onClick={() => setSubmitOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Request Leave
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending Approval</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{stats.approved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-destructive">{stats.rejected}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Days Granted</p><p className="text-2xl font-bold">{stats.totalDays}</p></CardContent></Card>
      </div>

      <DataTable
        data={requests}
        columns={columns}
        searchKeys={["startDate", "endDate"]}
        searchPlaceholder="Search leave requests..."
        filters={filterOpts}
        onView={item => setViewing(item)}
        actions={(req) => (
          <div className="flex gap-1">
            {canApprove && req.status === "Pending" && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-green-700"
                  onClick={() => { setApproveTarget({ req, action: "approve" }); setApproveNote(""); }}>
                  <Check className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                  onClick={() => { setApproveTarget({ req, action: "reject" }); setApproveNote(""); }}>
                  <X className="h-3 w-3 mr-1" /> Reject
                </Button>
              </>
            )}
            {canSubmit && (req.status === "Pending" || req.status === "Approved") && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                onClick={() => handleCancel(req)}>
                Cancel
              </Button>
            )}
          </div>
        )}
      />

      {/* Submit Leave */}
      <ModalForm
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Request Leave"
        description="Submit a leave request for yourself. Days are calculated excluding weekends."
        onSubmit={handleSubmit}
        submitLabel={saving ? "Submitting..." : "Submit Request"}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Leave Type *</Label>
            <Select value={form.leaveTypeId} onValueChange={v => setForm(f => ({ ...f, leaveTypeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
              <SelectContent>
                {leaveTypes.filter(lt => lt.isActive).map(lt => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name} ({lt.daysAllowed}d — {lt.isPaid ? "Paid" : "Unpaid"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
          <div><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          <div className="col-span-2">
            <Label>Reason</Label>
            <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave (optional)" />
          </div>
        </div>
      </ModalForm>

      {/* Approve / Reject */}
      <ModalForm
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title={approveTarget?.action === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
        onSubmit={handleApprove}
        submitLabel={saving ? "Processing..." : approveTarget?.action === "approve" ? "Approve" : "Reject"}
        submitVariant={approveTarget?.action === "reject" ? "destructive" : "default"}
      >
        {approveTarget && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Employee:</span> {approveTarget.req.employee?.user.name || "—"}</div>
              <div><span className="text-muted-foreground">Type:</span> <Badge variant="secondary">{approveTarget.req.leaveType?.name || "—"}</Badge></div>
              <div><span className="text-muted-foreground">From:</span> {approveTarget.req.startDate}</div>
              <div><span className="text-muted-foreground">To:</span> {approveTarget.req.endDate}</div>
              <div><span className="text-muted-foreground">Days:</span> <strong>{approveTarget.req.days}</strong></div>
            </div>
            {approveTarget.req.reason && (
              <div className="p-2 rounded bg-muted/40 text-xs italic">{approveTarget.req.reason}</div>
            )}
            <div>
              <Label>Note (optional)</Label>
              <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)} placeholder="Add a note for the employee..." />
            </div>
          </div>
        )}
      </ModalForm>

      {/* View Details */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Leave Request Details" isView>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{viewing.id}</span>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Employee:</span> {viewing.employee?.user.name || "—"}</div>
              <div><span className="text-muted-foreground">Type:</span> <Badge variant="secondary">{viewing.leaveType?.name || "—"}</Badge></div>
              <div><span className="text-muted-foreground">From:</span> {viewing.startDate}</div>
              <div><span className="text-muted-foreground">To:</span> {viewing.endDate}</div>
              <div><span className="text-muted-foreground">Days:</span> <span className="font-semibold">{viewing.days}</span></div>
              <div><span className="text-muted-foreground">Applied:</span> {viewing.createdAt.split("T")[0]}</div>
              {viewing.reason && <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {viewing.reason}</div>}
              {viewing.note && <div className="col-span-2 p-2 bg-muted/40 rounded text-xs"><span className="text-muted-foreground">Note from approver:</span> {viewing.note}</div>}
              {viewing.approvedAt && <div><span className="text-muted-foreground">Actioned:</span> {viewing.approvedAt.split("T")[0]}</div>}
            </div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
