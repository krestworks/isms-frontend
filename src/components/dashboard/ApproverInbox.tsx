import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Check, X, Clock, Search } from "lucide-react";
import { useCorrectionRequests, attendanceStore, CorrectionRequest } from "@/data/shiftsStore";
import { sessionStore, useSession } from "@/data/sessionStore";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const APPROVER_ROLES = ["Admin", "Manager"];

export function ApproverInbox() {
  useSession();
  const all = useCorrectionRequests();
  const user = sessionStore.user();
  const isApprover = APPROVER_ROLES.includes(user.activeRole);

  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState<null | "approve" | "reject">(null);
  const [bulkNotes, setBulkNotes] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    return all.filter(r => {
      if (status !== "all" && r.status !== status) return false;
      if (query && !r.employeeName.toLowerCase().includes(query.toLowerCase())) return false;
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      return true;
    });
  }, [all, status, query, from, to]);

  if (!isApprover) return null;

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const allVisiblePendingIds = filtered.filter(r => r.status === "pending").map(r => r.id);
  const allChecked = allVisiblePendingIds.length > 0 && allVisiblePendingIds.every(id => selected.has(id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(allVisiblePendingIds));
  };

  const approve = (r: CorrectionRequest) => {
    attendanceStore.approveCorrection(r.id, user.name, notes);
    toast.success(`Approved correction for ${r.employeeName}`);
    setActiveId(null); setNotes("");
  };
  const reject = (r: CorrectionRequest) => {
    if (!notes.trim()) return toast.error("Add a note explaining the rejection");
    attendanceStore.rejectCorrection(r.id, user.name, notes);
    toast.success("Request rejected");
    setActiveId(null); setNotes("");
  };

  const runBulk = () => {
    const ids = Array.from(selected).filter(id => allVisiblePendingIds.includes(id));
    if (ids.length === 0) return;
    if (bulkOpen === "approve") {
      attendanceStore.approveMany(ids, user.name, bulkNotes);
      toast.success(`Approved ${ids.length} request${ids.length === 1 ? "" : "s"}`);
    } else if (bulkOpen === "reject") {
      if (!bulkNotes.trim()) return toast.error("Rejection note is required");
      attendanceStore.rejectMany(ids, user.name, bulkNotes);
      toast.success(`Rejected ${ids.length} request${ids.length === 1 ? "" : "s"}`);
    }
    setSelected(new Set()); setBulkOpen(null); setBulkNotes("");
  };

  const pendingCount = all.filter(r => r.status === "pending").length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Approver Inbox</h3>
            <Badge variant="outline" className="text-[10px]">{pendingCount} pending</Badge>
          </div>
          <Link to="/hr" className="text-xs text-primary hover:underline">View in HR →</Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search employee" className="h-8 pl-7 text-xs" />
          </div>
          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs" placeholder="From" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs" placeholder="To" />
        </div>

        {/* Bulk bar */}
        {status === "pending" && filtered.some(r => r.status === "pending") && (
          <div className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-md bg-muted/40 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
              <span>{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
            </label>
            {selected.size > 0 && (
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={() => { setBulkOpen("approve"); setBulkNotes(""); }}><Check className="h-3 w-3 mr-1" /> Bulk approve</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => { setBulkOpen("reject"); setBulkNotes(""); }}><X className="h-3 w-3 mr-1" /> Bulk reject</Button>
              </div>
            )}
          </div>
        )}

        {/* Bulk modal-ish inline */}
        {bulkOpen && (
          <div className="mb-3 p-3 rounded-lg border border-border bg-muted/20 space-y-2">
            <p className="text-xs font-medium">{bulkOpen === "approve" ? `Approve ${selected.size} request${selected.size === 1 ? "" : "s"}` : `Reject ${selected.size} request${selected.size === 1 ? "" : "s"}`}</p>
            <Textarea value={bulkNotes} onChange={e => setBulkNotes(e.target.value)} placeholder={bulkOpen === "reject" ? "Reason for rejection (required)" : "Optional notes shared with employees"} className="text-xs h-16" />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={runBulk}>Confirm</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setBulkOpen(null); setBulkNotes(""); }}>Cancel</Button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            <Check className="h-5 w-5 mx-auto mb-2 text-emerald-600" />
            No requests match your filters.
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {filtered.slice(0, 20).map(r => {
              const isActive = activeId === r.id;
              const isPending = r.status === "pending";
              return (
                <div key={r.id} className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-2">
                  <div className="flex items-start gap-3">
                    {isPending && <Checkbox className="mt-1" checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-sm">{r.employeeName}</span>
                        <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />{r.date}</Badge>
                        <Badge variant={r.status === "pending" ? "outline" : r.status === "approved" ? "default" : "destructive"} className="text-[10px] capitalize">{r.status}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Current: {r.currentClockIn || "—"}–{r.currentClockOut || "—"} → <strong className="text-foreground">{r.proposedClockIn || "—"}–{r.proposedClockOut || "—"}</strong>
                      </p>
                      <p className="text-muted-foreground italic mt-1">"{r.reason}"</p>
                      <p className="text-[10px] text-muted-foreground mt-1">By {r.requestedBy} · {new Date(r.requestedAt).toLocaleString()}{r.reviewedBy ? ` · reviewed by ${r.reviewedBy}` : ""}</p>
                    </div>
                    {isPending && !isActive && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" className="h-7 text-xs" onClick={() => approve(r)}><Check className="h-3 w-3 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => { setActiveId(r.id); setNotes(""); }}><X className="h-3 w-3 mr-1" /> Reject</Button>
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <div className="space-y-2 pt-1 border-t border-border">
                      <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for rejection (required)" className="text-xs h-16" />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive" onClick={() => reject(r)}>Confirm Reject</Button>
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
