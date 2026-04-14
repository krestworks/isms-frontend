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
}

const mockData: LeaveRequest[] = [
  { id: "LV-001", employeeId: "EMP-001", employeeName: "James Mwangi", department: "Fuel", leaveType: "Annual", startDate: "2026-04-20", endDate: "2026-04-25", days: 5, reason: "Family vacation", status: "pending", appliedOn: "2026-04-10", approvedBy: "" },
  { id: "LV-002", employeeId: "EMP-002", employeeName: "Grace Wanjiku", department: "LPG", leaveType: "Sick", startDate: "2026-04-12", endDate: "2026-04-13", days: 2, reason: "Medical appointment", status: "completed", appliedOn: "2026-04-11", approvedBy: "Admin" },
  { id: "LV-003", employeeId: "EMP-004", employeeName: "Mary Akinyi", department: "Water", leaveType: "Maternity", startDate: "2026-05-01", endDate: "2026-07-30", days: 90, reason: "Maternity leave", status: "confirmed", appliedOn: "2026-03-15", approvedBy: "Admin" },
  { id: "LV-004", employeeId: "EMP-003", employeeName: "Peter Ochieng", department: "Car Wash", leaveType: "Annual", startDate: "2026-04-28", endDate: "2026-04-30", days: 3, reason: "Personal matters", status: "cancelled", appliedOn: "2026-04-08", approvedBy: "" },
];

const leaveTypes = ["Annual", "Sick", "Maternity", "Paternity", "Compassionate", "Unpaid"];

const columns: Column<LeaveRequest>[] = [
  { key: "id", label: "Ref", sortable: true },
  { key: "employeeName", label: "Employee", sortable: true },
  { key: "department", label: "Department" },
  { key: "leaveType", label: "Type", render: (item) => <Badge variant="outline">{item.leaveType}</Badge> },
  { key: "startDate", label: "From", sortable: true },
  { key: "endDate", label: "To" },
  { key: "days", label: "Days" },
  { key: "status", label: "Status", render: (item) => <StatusBadge status={item.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "leaveType", label: "Type", options: leaveTypes.map((t) => ({ label: t, value: t })) },
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Confirmed", value: "confirmed" }, { label: "Cancelled", value: "cancelled" }, { label: "Completed", value: "completed" }] },
];

export default function LeaveManagementTab() {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState({ employeeName: "", department: "Fuel", leaveType: "Annual", startDate: "", endDate: "", days: 0, reason: "", status: "pending" });

  const openNew = () => { setEditing(null); setForm({ employeeName: "", department: "Fuel", leaveType: "Annual", startDate: "", endDate: "", days: 0, reason: "", status: "pending" }); setModalOpen(true); };
  const openEdit = (item: LeaveRequest) => { setEditing(item); setForm({ employeeName: item.employeeName, department: item.department, leaveType: item.leaveType, startDate: item.startDate, endDate: item.endDate, days: item.days, reason: item.reason, status: item.status }); setModalOpen(true); };
  const handleSave = () => {
    if (editing) {
      setData((d) => d.map((i) => (i.id === editing.id ? { ...i, ...form, employeeId: editing.employeeId, appliedOn: editing.appliedOn, approvedBy: form.status === "confirmed" ? "Admin" : editing.approvedBy } : i)));
    } else {
      setData((d) => [...d, { id: `LV-${String(d.length + 1).padStart(3, "0")}`, employeeId: `EMP-${String(d.length + 1).padStart(3, "0")}`, ...form, appliedOn: new Date().toISOString().split("T")[0], approvedBy: "" }]);
    }
    setModalOpen(false);
  };
  const handleDelete = (item: LeaveRequest) => setData((d) => d.filter((i) => i.id !== item.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Management</h3>
          <p className="text-sm text-muted-foreground">Review and approve leave applications</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Leave Request</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["employeeName", "id"]} searchPlaceholder="Search leave requests..." filters={filterOpts} onView={(item) => setViewing(item)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Leave Request" : "New Leave Request"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Submit"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Employee Name</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} /></div>
          <div><Label>Department</Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Fuel", "LPG", "Water", "Automotive", "Car Wash"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Leave Type</Label>
            <Select value={form.leaveType} onValueChange={(v) => setForm({ ...form, leaveType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{leaveTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Days</Label><Input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></div>
          <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          <div className="col-span-2"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          {editing && (
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Approved</SelectItem><SelectItem value="cancelled">Rejected</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
          )}
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Leave Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Ref:</span> {viewing.id}</div>
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
            <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
            <div><span className="text-muted-foreground">Type:</span> {viewing.leaveType}</div>
            <div><span className="text-muted-foreground">From:</span> {viewing.startDate}</div>
            <div><span className="text-muted-foreground">To:</span> {viewing.endDate}</div>
            <div><span className="text-muted-foreground">Days:</span> {viewing.days}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {viewing.reason}</div>
            <div><span className="text-muted-foreground">Applied:</span> {viewing.appliedOn}</div>
            <div><span className="text-muted-foreground">Approved By:</span> {viewing.approvedBy || "—"}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
