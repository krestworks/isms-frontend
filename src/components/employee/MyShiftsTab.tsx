import { useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";

interface Shift {
  id: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  department: string;
  supervisor: string;
  status: string;
}

const mockData: Shift[] = [
  { id: "SH-001", date: "2026-04-14", shift: "Morning", startTime: "06:00", endTime: "14:00", department: "Fuel", supervisor: "Grace Wanjiku", status: "in_progress" },
  { id: "SH-002", date: "2026-04-15", shift: "Morning", startTime: "06:00", endTime: "14:00", department: "Fuel", supervisor: "Grace Wanjiku", status: "pending" },
  { id: "SH-003", date: "2026-04-16", shift: "Day", startTime: "08:00", endTime: "17:00", department: "Fuel", supervisor: "Grace Wanjiku", status: "pending" },
  { id: "SH-004", date: "2026-04-17", shift: "Morning", startTime: "06:00", endTime: "14:00", department: "Fuel", supervisor: "Grace Wanjiku", status: "pending" },
  { id: "SH-005", date: "2026-04-18", shift: "Night", startTime: "22:00", endTime: "06:00", department: "Fuel", supervisor: "David Kimani", status: "pending" },
  { id: "SH-006", date: "2026-04-13", shift: "Morning", startTime: "06:00", endTime: "14:00", department: "Fuel", supervisor: "Grace Wanjiku", status: "completed" },
  { id: "SH-007", date: "2026-04-12", shift: "Morning", startTime: "06:00", endTime: "14:00", department: "Fuel", supervisor: "Grace Wanjiku", status: "completed" },
];

const columns: Column<Shift>[] = [
  { key: "date", label: "Date", sortable: true },
  { key: "shift", label: "Shift", render: (i) => <Badge variant={i.shift === "Morning" ? "default" : i.shift === "Day" ? "secondary" : "outline"}>{i.shift}</Badge> },
  { key: "startTime", label: "Start" },
  { key: "endTime", label: "End" },
  { key: "department", label: "Department" },
  { key: "supervisor", label: "Supervisor" },
  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "shift", label: "Shift", options: [{ label: "Morning", value: "Morning" }, { label: "Day", value: "Day" }, { label: "Night", value: "Night" }] },
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "In Progress", value: "in_progress" }, { label: "Completed", value: "completed" }] },
];

export default function MyShiftsTab() {
  const [viewing, setViewing] = useState<Shift | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">My Shifts</h3>
        <p className="text-sm text-muted-foreground">View your upcoming and past shift schedule</p>
      </div>
      <DataTable data={mockData} columns={columns} searchKeys={["date", "supervisor"]} searchPlaceholder="Search shifts..." filters={filterOpts} onView={(item) => setViewing(item)} />

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Shift Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Date:</span> {viewing.date}</div>
            <div><span className="text-muted-foreground">Shift:</span> {viewing.shift}</div>
            <div><span className="text-muted-foreground">Start:</span> {viewing.startTime}</div>
            <div><span className="text-muted-foreground">End:</span> {viewing.endTime}</div>
            <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
            <div><span className="text-muted-foreground">Supervisor:</span> {viewing.supervisor}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
