import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Check, X, Clock, Search, RefreshCw } from "lucide-react";
import { sessionStore, useSession } from "@/data/sessionStore";
import { hrApi, ApiLeaveRequest } from "@/lib/hrApi";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const APPROVER_ROLES = ["Admin", "Manager"];

export function ApproverInbox() {
  useSession();
  const user = sessionStore.user();
  const isApprover = APPROVER_ROLES.includes(user.activeRole);

  const [requests, setRequests] = useState<ApiLeaveRequest[]>([]);
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState<"Pending" | "Approved" | "Rejected" | "all">("Pending");
  const [query, setQuery]       = useState("");
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes]       = useState("");
  const [acting, setActing]     = useState(false);

  const load = useCallback(async () => {
    if (!isApprover) return;
    setLoading(true);
    try {
      const params: any = {};
      if (status !== "all") params.status = status;
      const res = await hrApi.leaves.list(params);
      setRequests(res.data ?? []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [isApprover, status]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (query) {
        const name = r.employee?.user.name?.toLowerCase() ?? "";
        if (!name.includes(query.toLowerCase())) return false;
      }
      if (from && r.startDate < from) return false;
      if (to   && r.endDate   > to)   return false;
      return true;
    });
  }, [requests, query, from, to]);

  if (!isApprover) return null;

  const act = async (r: ApiLeaveRequest, action: "approve" | "reject") => {
    if (action === "reject" && !notes.trim()) return toast.error("Add a note explaining the rejection");
    setActing(true);
    try {
      await hrApi.leaves.approve(r.id, action, notes || undefined);
      toast.success(action === "approve" ? `Approved leave for ${r.employee?.user.name ?? "employee"}` : "Leave request rejected");
      setActiveId(null); setNotes("");
      load();
    } catch (e: any) { toast.error(e?.message || "Action failed"); }
    finally { setActing(false); }
  };

  const pendingCount = requests.filter(r => r.status === "Pending").length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Leave Approvals</h3>
            <Badge variant="outline" className="text-[10px]">{pendingCount} pending</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Link to="/hr" className="text-xs text-primary hover:underline">View in HR →</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search employee" className="h-8 pl-7 text-xs" />
          </div>
          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs" placeholder="From" />
          <Input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="h-8 text-xs" placeholder="To" />
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            <Check className="h-5 w-5 mx-auto mb-2 text-emerald-600" />
            {loading ? "Loading..." : "No requests match your filters."}
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {filtered.slice(0, 20).map(r => {
              const isActive  = activeId === r.id;
              const isPending = r.status === "Pending";
              const empName   = r.employee?.user.name ?? "Employee";
              const leaveName = r.leaveType?.name ?? "Leave";
              return (
                <div key={r.id} className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-sm">{empName}</span>
                        <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />{r.startDate} → {r.endDate}</Badge>
                        <Badge variant={r.status === "Pending" ? "outline" : r.status === "Approved" ? "default" : "destructive"} className="text-[10px] capitalize">{r.status}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {leaveName} · <strong className="text-foreground">{r.days} day{r.days !== 1 ? "s" : ""}</strong>
                        {r.leaveType?.isPaid ? " · Paid" : " · Unpaid"}
                      </p>
                      {r.reason && <p className="text-muted-foreground italic mt-1">"{r.reason}"</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Submitted {new Date(r.createdAt).toLocaleString()}
                        {r.note ? ` · note: ${r.note}` : ""}
                      </p>
                    </div>
                    {isPending && !isActive && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" className="h-7 text-xs" onClick={() => act(r, "approve")} disabled={acting}><Check className="h-3 w-3 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => { setActiveId(r.id); setNotes(""); }}><X className="h-3 w-3 mr-1" /> Reject</Button>
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <div className="space-y-2 pt-1 border-t border-border">
                      <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for rejection (required)" className="text-xs h-16" />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive" onClick={() => act(r, "reject")} disabled={acting}>Confirm Reject</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActiveId(null); setNotes(""); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length > 20 && (
              <p className="text-center text-[11px] text-muted-foreground pt-1">Showing 20 of {filtered.length}. Refine filters to narrow down.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
