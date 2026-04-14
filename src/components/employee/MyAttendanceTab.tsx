import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, LogOut, Clock } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  status: string;
  shift: string;
}

const mockData: AttendanceRecord[] = [
  { id: "ATT-001", date: "2026-04-14", clockIn: "06:02", clockOut: "", hoursWorked: 0, status: "in_progress", shift: "Morning" },
  { id: "ATT-010", date: "2026-04-13", clockIn: "06:00", clockOut: "14:05", hoursWorked: 8, status: "completed", shift: "Morning" },
  { id: "ATT-015", date: "2026-04-12", clockIn: "05:58", clockOut: "14:10", hoursWorked: 8.2, status: "completed", shift: "Morning" },
  { id: "ATT-020", date: "2026-04-11", clockIn: "06:05", clockOut: "14:00", hoursWorked: 7.9, status: "completed", shift: "Morning" },
  { id: "ATT-025", date: "2026-04-10", clockIn: "", clockOut: "", hoursWorked: 0, status: "pending", shift: "Morning" },
];

const isClockedIn = mockData[0]?.status === "in_progress";

const columns: Column<AttendanceRecord>[] = [
  { key: "date", label: "Date", sortable: true },
  { key: "shift", label: "Shift", render: (i) => <Badge variant="outline">{i.shift}</Badge> },
  { key: "clockIn", label: "Clock In", render: (i) => i.clockIn || "—" },
  { key: "clockOut", label: "Clock Out", render: (i) => i.clockOut || "—" },
  { key: "hoursWorked", label: "Hours", render: (i) => i.hoursWorked > 0 ? `${i.hoursWorked}h` : "—" },
  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "status", label: "Status", options: [{ label: "Completed", value: "completed" }, { label: "In Progress", value: "in_progress" }, { label: "Absent", value: "pending" }] },
];

export default function MyAttendanceTab() {
  const [data, setData] = useState(mockData);
  const [clockedIn, setClockedIn] = useState(isClockedIn);
  const [viewing, setViewing] = useState<AttendanceRecord | null>(null);

  const handleClockIn = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    const date = now.toISOString().split("T")[0];
    setData((d) => [{ id: `ATT-${String(d.length + 30).padStart(3, "0")}`, date, clockIn: time, clockOut: "", hoursWorked: 0, status: "in_progress", shift: "Morning" }, ...d]);
    setClockedIn(true);
  };

  const handleClockOut = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    setData((d) => d.map((r, i) => i === 0 && r.status === "in_progress" ? { ...r, clockOut: time, hoursWorked: 8, status: "completed" } : r));
    setClockedIn(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-primary/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Today's Status</div>
              <div className="font-semibold">{clockedIn ? "Clocked In" : "Not Clocked In"}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">156h</div>
            <div className="text-xs text-muted-foreground">Hours This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">20</div>
            <div className="text-xs text-muted-foreground">Days Present</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Attendance Log</h3>
        <div className="flex gap-2">
          {!clockedIn ? (
            <Button onClick={handleClockIn} className="bg-green-600 hover:bg-green-700"><LogIn className="h-4 w-4 mr-2" /> Clock In</Button>
          ) : (
            <Button onClick={handleClockOut} variant="destructive"><LogOut className="h-4 w-4 mr-2" /> Clock Out</Button>
          )}
        </div>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["date"]} searchPlaceholder="Search by date..." filters={filterOpts} onView={(item) => setViewing(item)} />

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Attendance Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Date:</span> {viewing.date}</div>
            <div><span className="text-muted-foreground">Shift:</span> {viewing.shift}</div>
            <div><span className="text-muted-foreground">Clock In:</span> {viewing.clockIn || "—"}</div>
            <div><span className="text-muted-foreground">Clock Out:</span> {viewing.clockOut || "—"}</div>
            <div><span className="text-muted-foreground">Hours:</span> {viewing.hoursWorked > 0 ? `${viewing.hoursWorked}h` : "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
