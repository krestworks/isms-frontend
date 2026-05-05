import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { attendanceStore, useDerivedAttendance, DerivedAttendance } from "@/data/shiftsStore";
import { useSession } from "@/data/sessionStore";

export default function MyAttendanceTab() {
  const { user } = useSession();
  const empId = user.employeeId || "EMP-001";
  const all = useDerivedAttendance();
  const data = useMemo(() => all.filter(a => a.employeeId === empId).sort((a, b) => b.date.localeCompare(a.date)), [all, empId]);
  const today = new Date().toISOString().split("T")[0];
  const todayRec = data.find(d => d.date === today);

  const monthHrs = data.filter(d => d.date.slice(0, 7) === today.slice(0, 7)).reduce((s, d) => s + d.hoursWorked, 0);
  const daysPresent = data.filter(d => d.status === "completed" || d.status === "in_progress").length;

  const handleClockIn = () => {
    if (!todayRec) return toast.error("No shift scheduled today");
    attendanceStore.punch(empId, today, "in", new Date().toTimeString().slice(0, 5));
    toast.success("Clocked in");
  };
  const handleClockOut = () => {
    attendanceStore.punch(empId, today, "out", new Date().toTimeString().slice(0, 5));
    toast.success("Clocked out");
  };

  const columns: Column<DerivedAttendance>[] = [
    { key: "date", label: "Date", sortable: true },
    { key: "shift", label: "Shift", render: i => <Badge variant="outline">{i.shift}</Badge> },
    { key: "clockIn", label: "Clock In", render: i => i.clockIn || "—" },
    { key: "clockOut", label: "Clock Out", render: i => i.clockOut || "—" },
    { key: "hoursWorked", label: "Hours", render: i => i.hoursWorked > 0 ? `${i.hoursWorked}h` : "—" },
    { key: "status", label: "Status", render: i => <StatusBadge status={i.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-primary/30"><CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><Clock className="h-6 w-6 text-primary" /></div>
          <div>
            <div className="text-sm text-muted-foreground">Today's Status</div>
            <div className="font-semibold">{todayRec?.status === "completed" ? "Done" : todayRec?.status === "in_progress" ? "Clocked In" : "Not Clocked In"}</div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{monthHrs}h</div><div className="text-xs text-muted-foreground">Hours This Month</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{daysPresent}</div><div className="text-xs text-muted-foreground">Days Present</div></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Attendance Log</h3>
        <div className="flex gap-2">
          {!todayRec?.clockIn && <Button onClick={handleClockIn}><LogIn className="h-4 w-4 mr-2" /> Clock In</Button>}
          {todayRec?.clockIn && !todayRec.clockOut && <Button onClick={handleClockOut} variant="destructive"><LogOut className="h-4 w-4 mr-2" /> Clock Out</Button>}
        </div>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["date"]} searchPlaceholder="Search by date..." />
    </div>
  );
}
