import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, X, Clock, CheckCheck, RefreshCw, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/data/sessionStore";
import { hrApi, ApiNotification, ApiLeaveRequest } from "@/lib/hrApi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const APPROVER_ROLES = ["Admin", "Manager", "LocationHead"];

const TYPE_COLOR: Record<string, string> = {
  leave_approved: "bg-green-100 text-green-800",
  leave_rejected: "bg-red-100 text-red-800",
  leave_adjusted: "bg-blue-100 text-blue-800",
  disciplinary:   "bg-orange-100 text-orange-800",
  system:         "bg-gray-100 text-gray-700",
};

export function NotificationsBell() {
  const { user } = useSession();
  const navigate  = useNavigate();
  const isApprover = APPROVER_ROLES.includes(user.activeRole);
  const [open, setOpen] = useState(false);

  // Personal notifications from the real API
  const [notifs, setNotifs]         = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Pending-leave approvals
  const [pendingLeaves, setPendingLeaves] = useState<ApiLeaveRequest[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [approvalNote, setApprovalNote]   = useState("");
  const [acting, setActing]               = useState(false);

  // Toast for new incoming notifications (diff against seen)
  const seenIds = useRef<Set<string>>(new Set());

  const loadNotifs = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const res = await hrApi.self.notifications.list({ limit: 30 });
      const incoming = res.data ?? [];
      incoming.forEach(n => {
        if (!seenIds.current.has(n.id) && !n.isRead) {
          toast(n.title, { description: n.message });
        }
        seenIds.current.add(n.id);
      });
      setNotifs(incoming);
      setUnreadCount(res.unreadCount ?? 0);
    } catch { /* non-critical */ }
    finally { setLoadingNotifs(false); }
  }, []);

  const loadPending = useCallback(async () => {
    if (!isApprover) return;
    try {
      const res = await hrApi.leaves.list({ status: "Pending" } as any);
      setPendingLeaves(res.data ?? []);
    } catch { /* non-critical */ }
  }, [isApprover]);

  // Poll every 30s while open, once on mount
  useEffect(() => { loadNotifs(); }, [loadNotifs]);
  useEffect(() => {
    if (!open) return;
    loadNotifs();
    loadPending();
    const timer = setInterval(() => { loadNotifs(); loadPending(); }, 30_000);
    return () => clearInterval(timer);
  }, [open, loadNotifs, loadPending]);

  const markRead = async (n: ApiNotification) => {
    if (n.isRead) {
      if (n.link) { navigate(n.link); setOpen(false); }
      return;
    }
    try {
      await hrApi.self.notifications.markRead(n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (n.link) { navigate(n.link); setOpen(false); }
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await hrApi.self.notifications.markAllRead();
      setNotifs(prev => prev.map(x => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch { toast.error("Failed to mark all as read"); }
  };

  const clearRead = async () => {
    try {
      await hrApi.self.notifications.clear();
      setNotifs(prev => prev.filter(x => !x.isRead));
    } catch { toast.error("Failed to clear"); }
  };

  const act = async (r: ApiLeaveRequest, action: "approve" | "reject") => {
    if (action === "reject" && !approvalNote.trim()) return toast.error("A note is required to reject");
    setActing(true);
    try {
      await hrApi.leaves.approve(r.id, action, approvalNote || undefined);
      toast.success(action === "approve" ? `Approved leave for ${r.employee?.user?.name ?? "employee"}` : "Leave rejected");
      setActiveId(null); setApprovalNote("");
      loadPending();
    } catch (e: any) { toast.error(e?.message || "Action failed"); }
    finally { setActing(false); }
  };

  const badgeCount = unreadCount + (isApprover ? pendingLeaves.length : 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Notifications">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {badgeCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[420px] p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              {isApprover && pendingLeaves.length > 0 ? ` · ${pendingLeaves.length} leave pending` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { loadNotifs(); loadPending(); }} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingNotifs ? "animate-spin" : ""}`} />
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Mark all read">
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={clearRead} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Clear read notifications">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <ScrollArea className="max-h-[500px]">
          {/* Personal notifications */}
          {notifs.length > 0 && (
            <div className="divide-y">
              {notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`px-4 py-3 text-xs cursor-pointer hover:bg-muted/50 transition-colors ${!n.isRead ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">{n.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${TYPE_COLOR[n.type] || "bg-muted text-muted-foreground"}`}>
                      {n.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pending leave approvals */}
          {isApprover && pendingLeaves.length > 0 && (
            <div className="divide-y">
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pending Leave Approvals
              </p>
              {pendingLeaves.slice(0, 6).map(r => {
                const isActive  = activeId === r.id;
                const empName   = r.employee?.user?.name ?? "Employee";
                const leaveName = r.leaveType?.name ?? "Leave";
                return (
                  <div key={r.id} className="px-4 py-3 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{empName}</p>
                        <p className="text-muted-foreground">{leaveName} · {r.days}d · {r.startDate?.split("T")[0]} → {r.endDate?.split("T")[0]}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0"><Clock className="h-2.5 w-2.5 mr-1" />pending</Badge>
                    </div>
                    {r.reason && <p className="text-muted-foreground italic line-clamp-2">"{r.reason}"</p>}
                    {isActive ? (
                      <div className="space-y-1.5 pt-0.5">
                        <Textarea value={approvalNote} onChange={e => setApprovalNote(e.target.value)} placeholder="Note (required to reject)" className="text-xs h-14" />
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => act(r, "approve")} disabled={acting}>
                            <Check className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive" onClick={() => act(r, "reject")} disabled={acting}>
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActiveId(null); setApprovalNote(""); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs w-full" onClick={() => { setActiveId(r.id); setApprovalNote(""); }}>
                        Review
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {notifs.length === 0 && (!isApprover || pendingLeaves.length === 0) && (
            <div className="px-4 py-12 text-center text-xs text-muted-foreground">
              <Bell className="h-6 w-6 mx-auto mb-2 opacity-30" />
              You're all caught up!
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
