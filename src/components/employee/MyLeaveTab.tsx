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
  { id: "LV-001", leaveType: "Annual", startDate: "2026-04-20", endDate: "2026-04-25", days: 5, reason: "Family vacation", status: "pending", appliedOn: "2026-04-10", approvedBy: "" },
  { id: "LV-005", leaveType: "Sick", startDate: "2026-03-05", endDate: "2026-03-06", days: 2, reason: "Flu", status: "completed", appliedOn: "2026-03-05", approvedBy: "Manager" },
  { id: "LV-008", leaveType: "Annual", startDate: "2026-01-10", endDate: "2026-01-12", days: 3, reason: "Travel", status: "completed", appliedOn: "2026-01-02", approvedBy: "Manager" },
];

const leaveBalance = { annual: 21, sick: 10, used: 10, remaining: 21 };
const leaveTypes = ["Annual", "Sick", "Compassionate", "Unpaid"];

const columns: Column<LeaveRequest>[] = [
  { key: "id", label: "Ref", sortable: true },
  { key: "leaveType", label: "Type", render: (i) => <Badge variant="outline">{i.leaveType}</Badge> },
  { key: "startDate", label: "From", sortable: true },
  { key: "endDate", label: "To" },
  { key: "days", label: "Days" },
  { key: "appliedOn", label: "Applied", sortable: true },
  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
  { key: "approvedBy", label: "Approved By", render: (i) => i.approvedBy || "—" },
];

const filterOpts: FilterOption[] = [
  { key: "leaveType", label: "Type", options: leaveTypes.map((t) => ({ label: t, value: t })) },
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Approved", value: "confirmed" }, { label: "Rejected", value: "cancelled" }, { label: "Completed", value: "completed" }] },
];

export default function MyLeaveTab() {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState({ leaveType: "Annual", startDate: "", endDate: "", days: 0, reason: "" });

  const openNew = () => { setForm({ leaveType: "Annual", startDate: "", endDate: "", days: 0, reason: "" }); setModalOpen(true); };
  const handleSubmit = () => {
    setData((d) => [...d, { id: `LV-${String(d.length + 10).padStart(3, "0")}`, ...form, status: "pending", appliedOn: new Date().toISOString().split("T")[0], approvedBy: "" }]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{leaveBalance.annual}</div><div className="text-xs text-muted-foreground">Annual Leave</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{leaveBalance.sick}</div><div className="text-xs text-muted-foreground">Sick Leave</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-destructive">{leaveBalance.used}</div><div className="text-xs text-muted-foreground">Used</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{leaveBalance.remaining}</div><div className="text-xs text-muted-foreground">Remaining</div></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Leave History</h3>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Apply for Leave</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["id", "leaveType"]} searchPlaceholder="Search leaves..." filters={filterOpts} onView={(item) => setViewing(item)} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="Apply for Leave" description="Submit a new leave request" onSubmit={handleSubmit} submitLabel="Submit Application">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Leave Type</Label>
            <Select value={form.leaveType} onValueChange={(v) => setForm({ ...form, leaveType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{leaveTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Days</Label><Input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></div>
          <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          <div className="col-span-2"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave..." /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Leave Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Ref:</span> {viewing.id}</div>
            <div><span className="text-muted-foreground">Type:</span> {viewing.leaveType}</div>
            <div><span className="text-muted-foreground">From:</span> {viewing.startDate}</div>
            <div><span className="text-muted-foreground">To:</span> {viewing.endDate}</div>
            <div><span className="text-muted-foreground">Days:</span> {viewing.days}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {viewing.reason}</div>
            <div><span className="text-muted-foreground">Applied:</span> {viewing.appliedOn}</div>
            <div><span className="text-muted-foreground">Approved By:</span> {viewing.approvedBy || "Pending"}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
