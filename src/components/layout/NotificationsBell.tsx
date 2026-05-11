import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, X, Clock, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCorrectionRequests, attendanceStore, CorrectionRequest } from "@/data/shiftsStore";
import { useNotifications, notifications as notifStore } from "@/data/notificationsStore";
import { sessionStore, useSession } from "@/data/sessionStore";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const APPROVER_ROLES = ["Admin", "Manager"];

export function NotificationsBell() {
  useSession();
  const all = useCorrectionRequests();
  const myNotifs = useNotifications();
  const user = sessionStore.user();
  const isApprover = APPROVER_ROLES.includes(user.activeRole);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Toast on new notifications since last check.
  const seenRef = useRef<Set<string>>(new Set(myNotifs.map(n => n.id)));
  useEffect(() => {
    myNotifs.forEach(n => {
      if (!seenRef.current.has(n.id)) {
        seenRef.current.add(n.id);
        if (!n.read) toast(n.title, { description: n.body });
      }
    });
  }, [myNotifs]);

  const pendingForApprover = useMemo(
    () => all.filter(r => r.status === "pending"),
    [all]
  );
  const unreadCount = myNotifs.filter(n => !n.read).length;
  const badgeCount = isApprover ? pendingForApprover.length + unreadCount : unreadCount;

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
          {badgeCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {badgeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {isApprover ? `${pendingForApprover.length} pending approval${pendingForApprover.length === 1 ? "" : "s"}` : `${unreadCount} unread`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={() => notifStore.markAllRead()} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Mark all
              </button>
            )}
            {isApprover && <Link to="/" onClick={() => setOpen(false)} className="text-[11px] text-primary hover:underline">Open inbox</Link>}
          </div>
        </div>
        <ScrollArea className="max-h-[460px]">
          {/* Personal notifications first */}
          {myNotifs.length > 0 && (
            <div className="divide-y divide-border">
              <p className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your notifications</p>
              {myNotifs.slice(0, 8).map(n => (
                <div key={n.id} className={`px-4 py-3 text-xs space-y-1 cursor-pointer hover:bg-muted/40 ${!n.read ? "bg-primary/5" : ""}`} onClick={() => notifStore.markRead(n.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{n.title}</p>
                    <Badge variant={n.kind === "correction.approved" ? "default" : n.kind === "correction.rejected" ? "destructive" : "outline"} className="text-[10px]">{n.kind.split(".")[1] || "info"}</Badge>
                  </div>
                  <p className="text-muted-foreground">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(n.ts).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Approver pending queue */}
          {isApprover && pendingForApprover.length > 0 && (
            <div className="divide-y divide-border">
              <p className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pending approvals</p>
              {pendingForApprover.slice(0, 5).map(r => {
                const isActive = activeId === r.id;
                return (
                  <div key={r.id} className="px-4 py-3 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{r.employeeName}</p>
                        <p className="text-muted-foreground">{r.date} · {r.proposedClockIn || "—"}–{r.proposedClockOut || "—"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />pending</Badge>
                    </div>
                    <p className="text-muted-foreground italic line-clamp-2">"{r.reason}"</p>
                    {isActive ? (
                      <div className="space-y-2 pt-1">
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes (required to reject)" className="text-xs h-16" />
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => approve(r)}><Check className="h-3 w-3 mr-1" /> Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive" onClick={() => reject(r)}><X className="h-3 w-3 mr-1" /> Reject</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActiveId(null); setNotes(""); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs w-full text-emerald-700" onClick={() => { setActiveId(r.id); setNotes(""); }}>Review</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {myNotifs.length === 0 && (!isApprover || pendingForApprover.length === 0) && (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              <Bell className="h-5 w-5 mx-auto mb-2 opacity-40" />
              You're all caught up.
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

