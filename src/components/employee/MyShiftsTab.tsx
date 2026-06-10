import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { hrApi, ApiShiftAssignment } from "@/lib/hrApi";
import { toast } from "sonner";

const columns: Column<ApiShiftAssignment>[] = [
  { key: "date", label: "Date", sortable: true, render: a => new Date(a.date).toLocaleDateString() },
  { key: "shiftPattern", label: "Shift", render: a => <Badge variant="outline">{a.shiftPattern?.name ?? "—"}</Badge> },
  { key: "startTime", label: "Start", render: a => a.shiftPattern?.startTime ?? "—" },
  { key: "endTime",   label: "End",   render: a => a.shiftPattern?.endTime ?? "—" },
];

export default function MyShiftsTab() {
  const [assignments, setAssignments] = useState<ApiShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(Date.now() - 7 * 86_400_000).toISOString().split("T")[0];
      const res = await hrApi.self.shifts.list({ from, limit: 60 });
      setAssignments(res.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load shift assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayShift = useMemo(() => assignments.find(a => a.date?.startsWith(today)), [assignments, today]);
  const upcoming   = useMemo(() => assignments.filter(a => a.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [assignments, today]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-primary/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Today's Shift</div>
              <div className="font-semibold">
                {todayShift ? todayShift.shiftPattern?.name ?? "Assigned" : "No shift today"}
              </div>
              {todayShift?.shiftPattern && (
                <div className="text-xs text-muted-foreground">
                  {todayShift.shiftPattern.startTime} – {todayShift.shiftPattern.endTime}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{upcoming.length}</div>
            <div className="text-xs text-muted-foreground">Upcoming Shifts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{assignments.length}</div>
            <div className="text-xs text-muted-foreground">Shifts (Last 37 Days)</div>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-semibold">Upcoming Shifts</h3>
      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading shifts...</div>
      ) : upcoming.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No upcoming shifts scheduled. Contact your manager or HR.
          </CardContent>
        </Card>
      ) : (
        <DataTable data={upcoming} columns={columns} searchKeys={["date"]} searchPlaceholder="Search by date..." />
      )}
    </div>
  );
}
