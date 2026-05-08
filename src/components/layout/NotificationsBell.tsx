import { useMemo, useState } from "react";
import { Bell, Check, X, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCorrectionRequests, attendanceStore, CorrectionRequest } from "@/data/shiftsStore";
import { sessionStore, useSession } from "@/data/sessionStore";
import { isLocationVisible } from "@/lib/permissions";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const APPROVER_ROLES = ["Admin", "Manager"];

export function NotificationsBell() {
  useSession();
  const all = useCorrectionRequests();
  const user = sessionStore.user();
  const isApprover = APPROVER_ROLES.includes(user.activeRole);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const items = useMemo(() => {
    if (isApprover) {
      return all.filter(r => r.status === "pending");
    }
    // For employees: show status of their own requests (recent)
    return all
      .filter(r => r.requestedBy === user.name || r.employeeId === user.employeeId)
      .slice(-10)
      .reverse();
  }, [all, isApprover, user]);

  const pendingCount = isApprover
    ? items.length
    : items.filter(i => i.status === "pending").length;

  const approve = (r: CorrectionRequest) => {
    attendanceStore.approveCorrection(r.id, user.name, notes);
    toast.success(`Approved ${r.employeeName}'s correction`);
    setActiveId(null); setNotes("");
  };
  const reject = (r: CorrectionRequest) => {
    if (!notes.trim()) return toast.error("Please add a note explaining the rejection");
    attendanceStore.rejectCorrection(r.id, user.name, notes);
    toast.success("Request rejected");
    setActiveId(null); setNotes("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Notifications">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {pendingCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {isApprover ? `${pendingCount} pending approval${pendingCount === 1 ? "" : "s"}` : "Your correction requests"}
            </p>
          </div>
          {isApprover && (
            <Link to="/hr" onClick={() => setOpen(false)} className="text-[11px] text-primary hover:underline">Open inbox</Link>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              <Bell className="h-5 w-5 mx-auto mb-2 opacity-40" />
              You're all caught up.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map(r => {
                const isActive = activeId === r.id;
                const scoped = isLocationVisible(undefined); // requests don't carry location; show all
                if (!scoped) return null;
                return (
                  <div key={r.id} className="px-4 py-3 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{r.employeeName}</p>
                        <p className="text-muted-foreground">{r.date} · {r.proposedClockIn || "—"}–{r.proposedClockOut || "—"}</p>
                      </div>
                      <Badge variant={r.status === "pending" ? "outline" : r.status === "approved" ? "default" : "destructive"} className="text-[10px] capitalize">
                        {r.status === "pending" && <Clock className="h-2.5 w-2.5 mr-1" />}
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground italic line-clamp-2">"{r.reason}"</p>
                    {isApprover && r.status === "pending" && (
                      isActive ? (
                        <div className="space-y-2 pt-1">
                          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes (required to reject)" className="text-xs h-16" />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => approve(r)}><Check className="h-3 w-3 mr-1" /> Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive" onClick={() => reject(r)}><X className="h-3 w-3 mr-1" /> Reject</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActiveId(null); setNotes(""); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" className="h-7 text-xs flex-1 text-emerald-700" onClick={() => { setActiveId(r.id); setNotes(""); }}>Review</Button>
                        </div>
                      )
                    )}
                    {!isApprover && r.reviewedBy && (
                      <p className="text-[10px] text-muted-foreground">Reviewed by {r.reviewedBy}{r.reviewNotes ? ` — "${r.reviewNotes}"` : ""}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
