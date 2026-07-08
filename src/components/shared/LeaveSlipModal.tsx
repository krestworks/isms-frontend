import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { hrApi, ApiLeaveSlip } from "@/lib/hrApi";
import { BrandedDocHeader } from "@/components/shared/BrandedDocHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface LeaveSlipModalProps {
  /** The leave request id to show a slip for, or null to keep the modal closed. */
  leaveRequestId: string | null;
  onClose: () => void;
}

/**
 * Printable leave slip — shared by the employee self-service portal and the
 * HR leave management screen so both sides render/print the exact same
 * document instead of maintaining two copies.
 */
export function LeaveSlipModal({ leaveRequestId, onClose }: LeaveSlipModalProps) {
  const [slip, setSlip]       = useState<ApiLeaveSlip | null>(null);
  const [loading, setLoading] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leaveRequestId) { setSlip(null); return; }
    setLoading(true);
    hrApi.leaves.getSlip(leaveRequestId)
      .then(res => setSlip(res.data))
      .catch((e: any) => toast.error(e?.message || "Failed to load leave slip"))
      .finally(() => setLoading(false));
  }, [leaveRequestId]);

  const handlePrint = () => {
    if (!viewRef.current || !slip) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Leave Slip - ${slip.ref}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:12px}
      td,th{padding:6px 10px;border:1px solid #ddd}th{background:#f5f5f5;text-align:left;width:160px}</style>
    </head><body>${viewRef.current.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={!!leaveRequestId} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Leave Slip</DialogTitle></DialogHeader>

        {loading && <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>}

        {slip && (
          <div className="border border-border rounded-lg p-6 bg-background">
            <div ref={viewRef} className="space-y-4">
              <BrandedDocHeader docTitle="LEAVE SLIP" docRef={slip.ref} docDate={slip.appliedOn} />
              <div className="flex justify-end -mt-4"><StatusBadge status={slip.status} /></div>
              <Separator />
              <table className="text-sm">
                <tbody>
                  <tr><th>Employee</th><td>{slip.employee.name}</td></tr>
                  <tr><th>Employee #</th><td>{slip.employee.number ?? "—"}</td></tr>
                  <tr><th>Department</th><td>{slip.employee.department}</td></tr>
                  <tr><th>Job Title</th><td>{slip.employee.jobTitle}</td></tr>
                  <tr><th>Leave Type</th><td>{slip.leaveType} ({slip.isPaid ? "Paid" : "Unpaid"})</td></tr>
                  <tr><th>Period</th><td>{slip.startDate} to {slip.endDate}{slip.isHalfDay ? ` — half day (${slip.halfDayPeriod})` : ""}</td></tr>
                  <tr><th>Days</th><td>{slip.days}</td></tr>
                  {slip.reason && <tr><th>Reason</th><td>{slip.reason}</td></tr>}
                  {slip.note && <tr><th>Note</th><td>{slip.note}</td></tr>}
                  <tr><th>Applied On</th><td>{slip.appliedOn}</td></tr>
                  {slip.approvedOn && <tr><th>Decided On</th><td>{slip.approvedOn}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} disabled={!slip}><Printer className="h-3.5 w-3.5 mr-1.5" />Print / Save PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
