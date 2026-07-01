import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { ApiLeaveRequest, ApiPublicHoliday, hrApi } from "@/lib/hrApi";

interface Props {
  leaves?:   ApiLeaveRequest[];
  mode?:     "employee" | "hr";
  holidays?: ApiPublicHoliday[];
}

const MONTHS = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const STATUS_BAR: Record<string, string> = {
  Approved:  "bg-green-100 text-green-800 border-l-2 border-green-500",
  Pending:   "bg-amber-100 text-amber-800 border-l-2 border-amber-500",
  Rejected:  "bg-red-50 text-red-400",
  Cancelled: "bg-gray-100 text-gray-400",
};

export function LeaveCalendar({ leaves: propLeaves, mode = "hr", holidays: propHolidays }: Props) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [leaves,   setLeaves]   = useState<ApiLeaveRequest[]>(propLeaves ?? []);
  const [holidays, setHolidays] = useState<ApiPublicHoliday[]>(propHolidays ?? []);
  const [loading, setLoading]   = useState(propLeaves === undefined);

  // Self-load when called without leaves prop
  useEffect(() => {
    if (propLeaves !== undefined) { setLeaves(propLeaves); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [lRes, hRes] = await Promise.all([
          hrApi.leaves.list({ limit: 500 } as any),
          (propHolidays ?? []).length === 0 ? hrApi.holidays.list() : Promise.resolve({ data: propHolidays ?? [] }),
        ]);
        if (!cancelled) {
          setLeaves(lRes.data ?? []);
          if ((propHolidays ?? []).length === 0) setHolidays(hRes.data ?? []);
        }
      } catch { /* non-critical */ }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [propLeaves]);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay();
  const startOffset = (firstDow + 6) % 7;  // Mon=0 … Sun=6

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  const holidayForDay = (day: number): ApiPublicHoliday | undefined => {
    const d = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return holidays.find(h => {
      const hDate = new Date(h.date);
      if (h.isRecurring) return (hDate.getMonth() + 1) === (month + 1) && hDate.getDate() === day;
      return h.date.slice(0, 10) === d;
    });
  };

  const eventsForDay = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return leaves.filter(l => {
      const s = l.startDate.slice(0, 10);
      const e = l.endDate.slice(0, 10);
      return d >= s && d <= e;
    });
  };

  const dayStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-12 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading calendar…
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <button onClick={prev} className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
        <button onClick={next} className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-muted/10">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="divide-y">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x">
            {week.map((day, di) => {
              const isWeekend = di >= 5;
              const isToday   = day !== null && dayStr(day) === todayStr;
              const events    = day ? eventsForDay(day) : [];
              const holiday   = day ? holidayForDay(day) : undefined;
              return (
                <div
                  key={di}
                  title={holiday ? holiday.name : undefined}
                  className={`min-h-[90px] p-1.5 flex flex-col gap-0.5 ${
                    !day      ? "bg-muted/15"   :
                    holiday   ? "bg-rose-50/70" :
                    isWeekend ? "bg-muted/5"    : ""
                  }`}
                >
                  {day && (
                    <>
                      <div className="flex items-start justify-between gap-0.5">
                        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                          isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                        }`}>{day}</span>
                        {holiday && (
                          <span className="text-[9px] leading-tight text-rose-600 font-medium text-right line-clamp-2 mt-0.5">
                            {holiday.name}
                          </span>
                        )}
                      </div>
                      {events.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          title={mode === "hr"
                            ? `${ev.employee?.user?.name ?? "Employee"} — ${ev.leaveType?.name} (${ev.status})`
                            : `${ev.leaveType?.name} (${ev.status})`}
                          className={`text-[10px] leading-tight px-1 py-[2px] rounded-sm truncate cursor-default ${STATUS_BAR[ev.status] ?? STATUS_BAR.Cancelled}`}
                        >
                          {mode === "hr" ? (ev.employee?.user?.name ?? "Employee") : (ev.leaveType?.name ?? "Leave")}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <span className="text-[10px] text-muted-foreground px-1">+{events.length - 3}</span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t bg-muted/10 text-[11px]">
        {[
          { label: "Approved",  cls: "bg-green-100 border-l-2 border-green-500" },
          { label: "Pending",   cls: "bg-amber-100 border-l-2 border-amber-500" },
          { label: "Rejected",  cls: "bg-red-50" },
          { label: "Cancelled", cls: "bg-gray-100" },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3 w-6 rounded-sm ${cls}`} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
        {holidays.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-6 rounded-sm bg-rose-50/70 border border-rose-200" />
            <span className="text-muted-foreground">Public Holiday</span>
          </div>
        )}
        <span className="ml-auto text-muted-foreground">{leaves.length} leave record(s)</span>
      </div>
    </div>
  );
}
