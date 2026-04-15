import { useState } from "react";
import { Plus } from "lucide-react";
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

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedOn: string;
  approvedBy: string;
  leaveBalance: number;
}

const mockData: LeaveRequest[] = [
  { id: "LV-001", employeeId: "EMP-001", employeeName: "James Mwangi", department: "Fuel", leaveType: "Annual", startDate: "2026-04-20", endDate: "2026-04-25", days: 5, reason: "Family vacation", status: "pending", appliedOn: "2026-04-10", approvedBy: "", leaveBalance: 16 },
  { id: "LV-002", employeeId: "EMP-002", employeeName: "Grace Wanjiku", department: "LPG", leaveType: "Sick", startDate: "2026-04-12", endDate: "2026-04-13", days: 2, reason: "Medical appointment", status: "completed", appliedOn: "2026-04-11", approvedBy: "Admin", leaveBalance: 8 },
  { id: "LV-003", employeeId: "EMP-004", employeeName: "Mary Akinyi", department: "Water", leaveType: "Maternity", startDate: "2026-05-01", endDate: "2026-07-30", days: 90, reason: "Maternity leave", status: "confirmed", appliedOn: "2026-03-15", approvedBy: "Admin", leaveBalance: 21 },
  { id: "LV-004", employeeId: "EMP-003", employeeName: "Peter Ochieng", department: "Car Wash", leaveType: "Annual", startDate: "2026-04-28", endDate: "2026-04-30", days: 3, reason: "Personal matters", status: "cancelled", appliedOn: "2026-04-08", approvedBy: "", leaveBalance: 18 },
  { id: "LV-005", employeeId: "EMP-005", employeeName: "David Kimani", department: "Automotive", leaveType: "Compassionate", startDate: "2026-04-16", endDate: "2026-04-18", days: 3, reason: "Family bereavement", status: "pending", appliedOn: "2026-04-14", approvedBy: "", leaveBalance: 21 },
];

const leaveTypes = ["Annual", "Sick", "Maternity", "Paternity", "Compassionate", "Unpaid", "Study"];
const departments = ["Fuel", "LPG", "Water", "Automotive", "Car Wash"];

const columns: Column<LeaveRequest>[] = [
  { key: "id", label: "Ref", sortable: true },
  { key: "employeeName", label: "Employee", sortable: true },
  { key: "department", label: "Department", render: (i) => <Badge variant="outline">{i.department}</Badge> },
  { key: "leaveType", label: "Type", render: (i) => <Badge variant="secondary">{i.leaveType}</Badge> },
  { key: "startDate", label: "From", sortable: true },
  { key: "endDate", label: "To" },
  { key: "days", label: "Days", render: (i) => <span className="font-medium">{i.days}</span> },
  { key: "leaveBalance", label: "Balance", render: (i) => <span className="text-muted-foreground">{i.leaveBalance}d</span> },
  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "department", label: "Department", options: departments.map(d => ({ label: d, value: d })) },
  { key: "leaveType", label: "Type", options: leaveTypes.map(t => ({ label: t, value: t })) },
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Approved", value: "confirmed" }, { label: "Rejected", value: "cancelled" }, { label: "Completed", value: "completed" }] },
];

export default function LeaveManagementTab() {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState({ employeeName: "", department: "Fuel", leaveType: "Annual", startDate: "", endDate: "", days: 0, reason: "", status: "pending", leaveBalance: 21 });

  const stats = {
    pending: data.filter(d => d.status === "pending").length,
    approved: data.filter(d => d.status === "confirmed").length,
    rejected: data.filter(d => d.status === "cancelled").length,
    totalDays: data.filter(d => d.status === "confirmed" || d.status === "completed").reduce((s, d) => s + d.days, 0),
  };

  const openNew = () => { setEditing(null); setForm({ employeeName: "", department: "Fuel", leaveType: "Annual", startDate: "", endDate: "", days: 0, reason: "", status: "pending", leaveBalance: 21 }); setModalOpen(true); };
  const openEdit = (item: LeaveRequest) => { setEditing(item); setForm({ employeeName: item.employeeName, department: item.department, leaveType: item.leaveType, startDate: item.startDate, endDate: item.endDate, days: item.days, reason: item.reason, status: item.status, leaveBalance: item.leaveBalance }); setModalOpen(true); };
  
  const calcDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff) + 1);
  };

  const handleSave = () => {
    if (editing) {
      setData(d => d.map(i => (i.id === editing.id ? { ...i, ...form, employeeId: editing.employeeId, appliedOn: editing.appliedOn, approvedBy: form.status === "confirmed" ? "Admin" : editing.approvedBy } : i)));
    } else {
      setData(d => [...d, { id: `LV-${String(d.length + 1).padStart(3, "0")}`, employeeId: `EMP-${String(d.length + 1).padStart(3, "0")}`, ...form, appliedOn: new Date().toISOString().split("T")[0], approvedBy: "" }]);
    }
    setModalOpen(false);
  };
  const handleDelete = (item: LeaveRequest) => setData(d => d.filter(i => i.id !== item.id));

  const set = (field: string, value: any) => {
    const newForm = { ...form, [field]: value };
    if (field === "startDate" || field === "endDate") {
      const s = field === "startDate" ? value : form.startDate;
      const e = field === "endDate" ? value : form.endDate;
      newForm.days = calcDays(s, e);
    }
    setForm(newForm);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Management</h3>
          <p className="text-sm text-muted-foreground">Review, approve and track leave applications</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Leave Request</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending Approval</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{stats.approved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-destructive">{stats.rejected}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Days Granted</p><p className="text-2xl font-bold">{stats.totalDays}</p></CardContent></Card>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["employeeName", "id"]} searchPlaceholder="Search leave requests..." filters={filterOpts} onView={item => setViewing(item)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Leave Request" : "New Leave Request"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Submit"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={e => set("employeeName", e.target.value)} /></div>
          <div><Label>Department</Label>
            <Select value={form.department} onValueChange={v => set("department", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Leave Type</Label>
            <Select value={form.leaveType} onValueChange={v => set("leaveType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{leaveTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Leave Balance (days)</Label><Input type="number" value={form.leaveBalance} onChange={e => set("leaveBalance", Number(e.target.value))} /></div>
          <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} /></div>
          <div><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} /></div>
          <div className="col-span-2 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Calculated Days:</span>
            <span className="font-bold text-lg">{form.days} day{form.days !== 1 ? "s" : ""}</span>
          </div>
          <div className="col-span-2"><Label>Reason *</Label><Textarea value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Reason for leave request..." /></div>
          {editing && (
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Approved</SelectItem>
                  <SelectItem value="cancelled">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Leave Request Details" isView>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">{viewing.id}</Badge>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
              <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
              <div><span className="text-muted-foreground">Leave Type:</span> <Badge variant="secondary">{viewing.leaveType}</Badge></div>
              <div><span className="text-muted-foreground">Leave Balance:</span> {viewing.leaveBalance} days</div>
              <div><span className="text-muted-foreground">From:</span> {viewing.startDate}</div>
              <div><span className="text-muted-foreground">To:</span> {viewing.endDate}</div>
              <div><span className="text-muted-foreground">Days:</span> <span className="font-semibold">{viewing.days}</span></div>
              <div><span className="text-muted-foreground">Applied:</span> {viewing.appliedOn}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {viewing.reason}</div>
              <div><span className="text-muted-foreground">Approved By:</span> {viewing.approvedBy || "—"}</div>
            </div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
