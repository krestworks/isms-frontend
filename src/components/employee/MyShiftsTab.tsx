import { useMemo, useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Clock } from "lucide-react";
import { useShifts, attendanceStore, useDerivedAttendance } from "@/data/shiftsStore";
import { useSession } from "@/data/sessionStore";
import { toast } from "sonner";

export default function MyShiftsTab() {
  const { user } = useSession();
  const empId = user.employeeId || "EMP-001";
  const shifts = useShifts(s => s.employeeId === empId);
  const today = new Date().toISOString().split("T")[0];
  const todayShift = shifts.find(s => s.date === today);
  const punch = attendanceStore.get(empId, today);

  const upcoming = useMemo(() => shifts.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [shifts, today]);

  const handleClockIn = () => {
    if (!todayShift) return toast.error("No shift scheduled for today");
    attendanceStore.punch(empId, today, "in", new Date().toTimeString().slice(0, 5));
    toast.success("Clocked in");
  };
  const handleClockOut = () => {
    attendanceStore.punch(empId, today, "out", new Date().toTimeString().slice(0, 5));
    toast.success("Clocked out");
  };

  const columns: Column<typeof shifts[number]>[] = [
    { key: "date", label: "Date", sortable: true },
    { key: "shift", label: "Shift", render: i => <Badge variant="outline">{i.shift}</Badge> },
    { key: "startTime", label: "Start" },
    { key: "endTime", label: "End" },
    { key: "location", label: "Location" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-primary/30"><CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><Clock className="h-6 w-6 text-primary" /></div>
          <div>
            <div className="text-sm text-muted-foreground">Today's Shift</div>
            <div className="font-semibold">{todayShift ? `${todayShift.shift}` : "No shift today"}</div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{punch?.clockIn || "—"}</div>
          <div className="text-xs text-muted-foreground">Clock In</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{punch?.clockOut || "—"}</div>
          <div className="text-xs text-muted-foreground">Clock Out</div>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Upcoming Shifts</h3>
        <div className="flex gap-2">
          {!punch?.clockIn && <Button onClick={handleClockIn}><LogIn className="h-4 w-4 mr-2" /> Clock In</Button>}
          {punch?.clockIn && !punch.clockOut && <Button onClick={handleClockOut} variant="destructive"><LogOut className="h-4 w-4 mr-2" /> Clock Out</Button>}
        </div>
      </div>
      <DataTable data={upcoming} columns={columns} searchKeys={["date", "location"]} searchPlaceholder="Search..." />
    </div>
  );
}
