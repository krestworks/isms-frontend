import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { hrApi, ApiAttendance } from "@/lib/hrApi";

function fmtTime(dt?: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const columns: Column<ApiAttendance>[] = [
  { key: "date", label: "Date", sortable: true, render: r => new Date(r.date).toLocaleDateString() },
  { key: "checkIn",  label: "Clock In",  render: r => fmtTime(r.checkIn) },
  { key: "checkOut", label: "Clock Out", render: r => fmtTime(r.checkOut) },
  { key: "status",   label: "Status",    render: r => <StatusBadge status={r.status} /> },
  { key: "note",     label: "Note",      render: r => r.note || "—" },
];

export default function MyAttendanceTab() {
  const [records, setRecords]   = useState<ApiAttendance[]>([]);
  const [loading, setLoading]   = useState(true);
  const [clocking, setClocking] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrApi.self.attendance.list({ limit: 60 });
      setRecords(res.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayRec = useMemo(() => records.find(r => r.date?.startsWith(today)), [records, today]);
  const monthRecs = useMemo(() => records.filter(r => r.date?.startsWith(today.slice(0, 7))), [records, today]);

  const monthHrs = monthRecs.reduce((s, r) => {
    if (r.checkIn && r.checkOut) {
      const diff = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
      return s + diff / 3_600_000;
    }
    return s;
  }, 0);

  const handleClockIn = async () => {
    setClocking(true);
    try {
      await hrApi.self.attendance.checkIn();
      toast.success("Clocked in successfully");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Clock in failed");
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    setClocking(true);
    try {
      await hrApi.self.attendance.checkOut();
      toast.success("Clocked out successfully");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Clock out failed");
    } finally {
      setClocking(false);
    }
  };

  const todayStatus = todayRec?.checkOut
    ? "Checked Out"
    : todayRec?.checkIn
    ? "Checked In"
    : "Not Checked In";

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
              <div className="font-semibold">{todayStatus}</div>
              {todayRec?.checkIn && (
                <div className="text-xs text-muted-foreground">
                  In: {fmtTime(todayRec.checkIn)}
                  {todayRec.checkOut ? ` · Out: ${fmtTime(todayRec.checkOut)}` : ""}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{monthHrs.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground">Hours This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{monthRecs.filter(r => r.status === "Present").length}</div>
            <div className="text-xs text-muted-foreground">Days Present</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Attendance Log</h3>
        <div className="flex gap-2">
          {!todayRec?.checkIn && (
            <Button onClick={handleClockIn} disabled={clocking}>
              <LogIn className="h-4 w-4 mr-2" /> Clock In
            </Button>
          )}
          {todayRec?.checkIn && !todayRec.checkOut && (
            <Button onClick={handleClockOut} variant="destructive" disabled={clocking}>
              <LogOut className="h-4 w-4 mr-2" /> Clock Out
            </Button>
          )}
        </div>
      </div>

      <DataTable data={records} columns={columns} searchKeys={["date"]} searchPlaceholder="Search by date..." />
    </div>
  );
}
