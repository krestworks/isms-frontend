import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Check, X, RefreshCw } from "lucide-react";
import { approvalsApi, ApiApprovalRequest } from "@/lib/approvalsApi";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { toast } from "sonner";

function describeAction(r: ApiApprovalRequest): string {
  const verb = r.actionKey.split(".").pop() || r.actionKey;
  return `${verb} ${r.entityType}`;
}

/**
 * Generic cross-module approvals inbox — lists Tier-1 (two-person-approval)
 * requests the current user can act on (excludes their own requests; the
 * backend already filters to only requests they hold permission for).
 * Modeled on ApproverInbox.tsx's structure, but this one is generic across
 * every module rather than HR-leave-specific.
 */
export function ApprovalsInbox() {
  const [requests, setRequests] = useState<ApiApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ request: ApiApprovalRequest; type: "approve" | "reject" } | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await approvalsApi.listActionable();
      setRequests(res.data ?? []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async () => {
    if (!pending) return;
    setActing(true);
    try {
      if (pending.type === "approve") {
        await approvalsApi.approve(pending.request.id);
        toast.success(`Approved — ${describeAction(pending.request)} now takes effect`);
      } else {
        await approvalsApi.reject(pending.request.id);
        toast.success("Request rejected");
      }
      setPending(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Action failed"); }
    finally { setActing(false); }
  };

  if (!loading && requests.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Pending Approvals</h3>
            <Badge variant="outline" className="text-[10px]">{requests.length} pending</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {requests.slice(0, 20).map(r => (
            <div key={r.id} className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-semibold text-sm capitalize">{describeAction(r)}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{r.module}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Requested by <span className="text-foreground font-medium">{r.requestedByName}</span> · {new Date(r.requestedAt).toLocaleString()}
                  </p>
                  {r.reason && <p className="text-muted-foreground italic mt-1">"{r.reason}"</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" className="h-7 text-xs" onClick={() => setPending({ request: r, type: "approve" })} disabled={acting}>
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => setPending({ request: r, type: "reject" })} disabled={acting}>
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {requests.length > 20 && (
            <p className="text-center text-[11px] text-muted-foreground pt-1">Showing 20 of {requests.length}.</p>
          )}
        </div>

        <DangerConfirmModal
          open={!!pending}
          title={pending?.type === "approve" ? "Approve this request?" : "Reject this request?"}
          description={pending ? `${describeAction(pending.request)}, requested by ${pending.request.requestedByName}. ${
            pending.type === "approve"
              ? "This executes the action immediately once confirmed."
              : "The request will be discarded — nothing will be executed."
          }` : undefined}
          confirmLabel={pending?.type === "approve" ? "Approve" : "Reject"}
          variant={pending?.type === "approve" ? "default" : "destructive"}
          loading={acting}
          onConfirm={act}
          onCancel={() => setPending(null)}
        />
      </CardContent>
    </Card>
  );
}
