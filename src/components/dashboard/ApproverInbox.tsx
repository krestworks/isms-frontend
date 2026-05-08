import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Inbox, Check, X, Clock } from "lucide-react";
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
  const pending = all.filter(r => r.status === "pending");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  if (!isApprover) return null;

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

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Approver Inbox</h3>
            <Badge variant="outline" className="text-[10px]">{pending.length} pending</Badge>
          </div>
          <Link to="/hr" className="text-xs text-primary hover:underline">View all in HR →</Link>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Attendance correction requests waiting for your approval.</p>

        {pending.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            <Check className="h-5 w-5 mx-auto mb-2 text-emerald-600" />
            No pending requests — you're all caught up.
          </div>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 5).map(r => {
              const isActive = activeId === r.id;
              return (
                <div key={r.id} className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{r.employeeName}</span>
                        <Badge variant="outline" className="text-[10px]"><Clock className="h-2.5 w-2.5 mr-1" />{r.date}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Current: {r.currentClockIn || "—"}–{r.currentClockOut || "—"} → <strong className="text-foreground">{r.proposedClockIn || "—"}–{r.proposedClockOut || "—"}</strong>
                      </p>
                      <p className="text-muted-foreground italic mt-1">"{r.reason}"</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Requested by {r.requestedBy} · {new Date(r.requestedAt).toLocaleString()}</p>
                    </div>
                    {!isActive && (
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
            {pending.length > 5 && (
              <Link to="/hr" className="block text-center text-xs text-primary hover:underline pt-1">+ {pending.length - 5} more in HR Attendance</Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
