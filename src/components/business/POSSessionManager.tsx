import { useEffect, useState } from "react";
import {
  LogIn, LogOut, Lock, Download, FileText, BarChart2,
  ClipboardCheck, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  posSessionStore, CashierSession, ClosingEntry, PayMethodTotals,
} from "@/data/posSessionStore";
import { useSession } from "@/data/sessionStore";
import { brandingStore } from "@/data/brandingStore";
import { ApiBizBusiness, ApiBizSale } from "@/lib/bizApi";

interface Props {
  business: ApiBizBusiness;
  sales: ApiBizSale[];
}

const METHODS = ["Cash", "M-Pesa", "Card", "Credit"];
const fmt = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });

// ── Sales analytics for a session ────────────────────────────────────────────

function computeSessionSales(sales: ApiBizSale[], openedAt: string, closedAt?: string) {
  const from = new Date(openedAt).getTime();
  const to   = closedAt ? new Date(closedAt).getTime() : Date.now();

  const sessionSales = sales.filter(s => {
    const t = new Date(s.date).getTime();
    return t >= from && t <= to && s.status !== "void";
  });

  const totalSales = sessionSales.reduce((s, x) => s + x.totalAmount, 0);
  const totalTransactions = sessionSales.length;

  const payMethodTotals: PayMethodTotals = { Cash: 0, "M-Pesa": 0, Card: 0, Credit: 0 };
  sessionSales.forEach(s => {
    const m = s.paymentMethod ?? "Cash";
    payMethodTotals[m] = (payMethodTotals[m] ?? 0) + s.totalAmount;
  });

  return { sessionSales, totalSales, totalTransactions, payMethodTotals };
}

// ── Report generators ─────────────────────────────────────────────────────────

function buildRawReport(session: CashierSession, sales: ApiBizSale[], b: any, bizName: string): string {
  const { sessionSales } = computeSessionSales(sales, session.openedAt, session.closedAt);
  const lines = [
    `${b?.name ?? bizName}`,
    `RAW SALES REPORT — Session ${session.id}`,
    `Cashier: ${session.cashier}`,
    `Opened:  ${fmtDate(session.openedAt)}`,
    session.closedAt ? `Closed:  ${fmtDate(session.closedAt)}` : "",
    "=".repeat(60),
    `${"REF".padEnd(16)}${"DATE".padEnd(22)}${"METHOD".padEnd(10)}${"AMOUNT".padStart(12)}`,
    "-".repeat(60),
    ...sessionSales.map(s =>
      `${(s.saleRef ?? "—").padEnd(16)}${s.date.slice(0, 19).replace("T", " ").padEnd(22)}${(s.paymentMethod ?? "Cash").padEnd(10)}${("Ksh " + fmt(s.totalAmount)).padStart(12)}`
    ),
    "-".repeat(60),
    `TOTAL: ${sessionSales.length} sale(s) — Ksh ${fmt(sessionSales.reduce((s, x) => s + x.totalAmount, 0))}`,
    "",
    `Generated: ${new Date().toLocaleString()}`,
  ].filter(l => l !== undefined);
  return lines.join("\n");
}

function buildSalesReport(session: CashierSession, sales: ApiBizSale[], b: any, bizName: string): string {
  const { sessionSales, totalSales, payMethodTotals } = computeSessionSales(sales, session.openedAt, session.closedAt);

  // Group by product name
  const byProduct: Record<string, { qty: number; total: number }> = {};
  sessionSales.forEach(s => {
    (s.items ?? []).forEach((item: any) => {
      if (!byProduct[item.name]) byProduct[item.name] = { qty: 0, total: 0 };
      byProduct[item.name].qty   += item.qty ?? 1;
      byProduct[item.name].total += item.totalPrice ?? 0;
    });
  });

  const lines = [
    `${b?.name ?? bizName}`,
    `SALES REPORT — Session ${session.id}`,
    `Cashier: ${session.cashier}   Opened: ${fmtDate(session.openedAt)}`,
    "=".repeat(50),
    "PRODUCT BREAKDOWN",
    "-".repeat(50),
    `${"PRODUCT".padEnd(28)}${"QTY".padStart(6)}${"TOTAL".padStart(16)}`,
    ...Object.entries(byProduct)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, d]) =>
        `${name.slice(0, 27).padEnd(28)}${String(d.qty).padStart(6)}${("Ksh " + fmt(d.total)).padStart(16)}`
      ),
    "-".repeat(50),
    "",
    "PAYMENT METHOD BREAKDOWN",
    "-".repeat(50),
    ...METHODS.filter(m => (payMethodTotals[m] ?? 0) > 0).map(m =>
      `${m.padEnd(20)}${"Ksh " + fmt(payMethodTotals[m] ?? 0)}`
    ),
    "=".repeat(50),
    `TOTAL SALES: Ksh ${fmt(totalSales)}   |   ${sessionSales.length} transactions`,
    "",
    `Generated: ${new Date().toLocaleString()}`,
  ];
  return lines.join("\n");
}

function buildReconReport(session: CashierSession, b: any, bizName: string): string {
  const entries = session.closingEntries ?? [];
  const totalVariance = entries.reduce((s, e) => s + e.variance, 0);
  const lines = [
    `${b?.name ?? bizName}`,
    `RECONCILIATION REPORT — Session ${session.id}`,
    `Cashier: ${session.cashier}   Status: ${session.status.toUpperCase()}`,
    session.closedAt ? `Closed: ${fmtDate(session.closedAt)}` : "",
    session.committedAt ? `Committed: ${fmtDate(session.committedAt)}` : "",
    "=".repeat(60),
    `Opening Float: Ksh ${fmt(session.openingFloat)}`,
    "",
    `${"METHOD".padEnd(14)}${"EXPECTED".padStart(14)}${"ACTUAL".padStart(14)}${"VARIANCE".padStart(14)}`,
    "-".repeat(60),
    ...entries.map(e =>
      `${e.method.padEnd(14)}${("Ksh " + fmt(e.expected)).padStart(14)}${("Ksh " + fmt(e.actual)).padStart(14)}${(e.variance >= 0 ? "+" : "") + fmt(e.variance).padStart(13)}`
    ),
    "-".repeat(60),
    `${"NET VARIANCE".padEnd(42)}${((totalVariance >= 0 ? "+" : "") + "Ksh " + fmt(Math.abs(totalVariance))).padStart(18)}`,
    totalVariance === 0 ? "  → BALANCED ✓" : totalVariance > 0 ? "  → SURPLUS (over)" : "  → SHORTAGE (short)",
    "",
    session.closingNotes ? `Notes: ${session.closingNotes}` : "",
    "",
    `Generated: ${new Date().toLocaleString()}`,
  ].filter(l => l !== undefined);
  return lines.join("\n");
}

function buildConsolidatedReport(session: CashierSession, sales: ApiBizSale[], b: any, bizName: string): string {
  return [
    buildSalesReport(session, sales, b, bizName),
    "\n\n" + "─".repeat(60) + "\n\n",
    buildReconReport(session, b, bizName),
    "\n\n" + "─".repeat(60) + "\n\n",
    buildRawReport(session, sales, b, bizName),
  ].join("");
}

function downloadTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function POSSessionManager({ business, sales }: Props) {
  const { user } = useSession();
  const [session, setSession] = useState<CashierSession | null>(() => posSessionStore.get(business.id));
  const [panelOpen, setPanelOpen] = useState(false);

  // Open session dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [openFloat, setOpenFloat]   = useState("");
  const [openCashier, setOpenCashier] = useState(user.name || "");

  // Auto-prompt to open session on first mount if none exists
  useEffect(() => {
    const current = posSessionStore.get(business.id);
    if (!current || current.status === "committed") {
      setOpenCashier(user.name || "");
      setOpenFloat("");
      setOpenDialog(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  // Close session dialog
  const [closeDialog, setCloseDialog] = useState(false);
  const [closingEntries, setClosingEntries] = useState<Record<string, string>>({});
  const [closingNotes, setClosingNotes] = useState("");
  const [showRecon, setShowRecon]   = useState(false);

  // Commit confirm
  const [commitDialog, setCommitDialog] = useState(false);

  useEffect(() => {
    const unsub = posSessionStore.subscribe(business.id, () => {
      setSession(posSessionStore.get(business.id));
    });
    return unsub;
  }, [business.id]);

  const sessionSalesData = session
    ? computeSessionSales(sales, session.openedAt, session.closedAt)
    : null;

  // ── Open session ─────────────────────────────────────────────────────────────

  const handleOpen = () => {
    if (!openCashier.trim()) { toast.error("Cashier name required"); return; }
    const s = posSessionStore.open(business.id, openCashier.trim(), parseFloat(openFloat) || 0);
    setSession(s);
    setOpenDialog(false);
    toast.success("Session opened. You can now process sales.");
  };

  // ── Close session ─────────────────────────────────────────────────────────────

  const expectedByMethod = (): Record<string, number> => {
    if (!sessionSalesData) return {};
    return sessionSalesData.payMethodTotals;
  };

  const buildEntries = (): ClosingEntry[] => {
    const expected = expectedByMethod();
    return METHODS.map(m => {
      const exp = expected[m] ?? 0;
      const act = parseFloat(closingEntries[m] || "0") || 0;
      return { method: m, expected: exp, actual: act, variance: act - exp };
    }).filter(e => e.expected > 0 || e.actual > 0);
  };

  const handleClose = () => {
    if (!session || !sessionSalesData) return;
    const entries = buildEntries();
    const s = posSessionStore.close(
      business.id, entries, closingNotes,
      sessionSalesData.totalSales, sessionSalesData.totalTransactions,
      sessionSalesData.payMethodTotals,
    );
    setSession(s);
    setCloseDialog(false);
    setShowRecon(true);
    toast.success("Session closed. Review the reconciliation below.");
  };

  const handleCommit = () => {
    const s = posSessionStore.commit(business.id);
    setSession(s);
    setCommitDialog(false);
    toast.success("Session committed. No further changes allowed.");
  };

  // ── Reports ───────────────────────────────────────────────────────────────────

  const b = brandingStore.get();
  const bizName = b?.name ?? business.name;
  const sfx = session ? `_${session.id}_${new Date().toISOString().slice(0, 10)}` : "";

  const downloadReport = (type: "raw" | "sales" | "recon" | "consolidated") => {
    if (!session) return;
    const map = {
      raw:          () => buildRawReport(session, sales, b, bizName),
      sales:        () => buildSalesReport(session, sales, b, bizName),
      recon:        () => buildReconReport(session, b, bizName),
      consolidated: () => buildConsolidatedReport(session, sales, b, bizName),
    };
    downloadTxt(map[type](), `${type}_report${sfx}.txt`);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded`);
  };

  // ── Status badge ──────────────────────────────────────────────────────────────

  const statusColor = !session ? "bg-gray-100 text-gray-700"
    : session.status === "open"      ? "bg-green-100 text-green-800"
    : session.status === "closed"    ? "bg-amber-100 text-amber-800"
    : "bg-blue-100 text-blue-800";

  const statusLabel = !session ? "No Session"
    : session.status === "open"      ? `Session Open · ${session.cashier}`
    : session.status === "closed"    ? `Closed · ${session.cashier}`
    : `Committed · ${session.cashier}`;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Session banner — always visible above POS */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card mb-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor}`}>
            {session?.status?.toUpperCase() ?? "NO SESSION"}
          </span>
          <span className="text-muted-foreground truncate">{statusLabel}</span>
          {session?.status === "open" && sessionSalesData && (
            <span className="text-xs text-muted-foreground shrink-0">
              · {sessionSalesData.totalTransactions} sales · Ksh {fmt(sessionSalesData.totalSales)}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {!session && (
            <Button size="sm" className="h-7 text-xs" onClick={() => { setOpenCashier(user.name || ""); setOpenFloat(""); setOpenDialog(true); }}>
              <LogIn className="h-3.5 w-3.5 mr-1" />Open Session
            </Button>
          )}
          {session?.status === "open" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setClosingEntries({}); setClosingNotes(""); setCloseDialog(true); }}>
              <LogOut className="h-3.5 w-3.5 mr-1" />Close Session
            </Button>
          )}
          {session?.status === "closed" && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={() => setCommitDialog(true)}>
              <Lock className="h-3.5 w-3.5 mr-1" />Commit
            </Button>
          )}
          {session?.status === "committed" && (
            <Button size="sm" className="h-7 text-xs" onClick={() => {
              posSessionStore.clear(business.id);
              setOpenCashier(user.name || "");
              setOpenFloat("");
              setOpenDialog(true);
            }}>
              <LogIn className="h-3.5 w-3.5 mr-1" />New Session
            </Button>
          )}
          {session && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPanelOpen(v => !v)}>
              {panelOpen ? <><ChevronUp className="h-3 w-3 mr-1" />Hide</> : <><ChevronDown className="h-3 w-3 mr-1" />Details</>}
            </Button>
          )}
        </div>
      </div>

      {/* Expandable session details / reports panel */}
      {session && panelOpen && (
        <div className="rounded-xl border bg-card p-4 mb-3 space-y-4">
          {/* Session summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Opened</p>
              <p className="font-medium text-xs">{fmtDate(session.openedAt)}</p>
            </div>
            {session.closedAt && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Closed</p>
                <p className="font-medium text-xs">{fmtDate(session.closedAt)}</p>
              </div>
            )}
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Opening Float</p>
              <p className="font-bold">Ksh {fmt(session.openingFloat)}</p>
            </div>
            {session.totalSales !== undefined && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="font-bold text-primary">Ksh {fmt(session.totalSales)}</p>
              </div>
            )}
          </div>

          {/* Reconciliation table */}
          {session.closingEntries && session.closingEntries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reconciliation</h4>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">Method</th>
                    <th className="text-right px-3 py-2">Expected</th>
                    <th className="text-right px-3 py-2">Actual</th>
                    <th className="text-right px-3 py-2">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {session.closingEntries.map(e => (
                    <tr key={e.method} className={Math.abs(e.variance) > 0.5 ? "bg-amber-50/40" : ""}>
                      <td className="px-3 py-1.5 font-medium">{e.method}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">Ksh {fmt(e.expected)}</td>
                      <td className="px-3 py-1.5 text-right">Ksh {fmt(e.actual)}</td>
                      <td className={`px-3 py-1.5 text-right font-semibold ${e.variance === 0 ? "text-green-600" : "text-amber-600"}`}>
                        {e.variance >= 0 ? "+" : ""}{fmt(e.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Report downloads */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Download Reports</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadReport("raw")}>
                <Download className="h-3.5 w-3.5 mr-1.5" /><FileText className="h-3.5 w-3.5 mr-1" />Raw Report
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadReport("sales")}>
                <Download className="h-3.5 w-3.5 mr-1.5" /><BarChart2 className="h-3.5 w-3.5 mr-1" />Sales Report
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadReport("recon")}>
                <Download className="h-3.5 w-3.5 mr-1.5" /><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Reconciled Report
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadReport("consolidated")}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Consolidated Report
              </Button>
            </div>
          </div>

          {/* Start new session after commit */}
          {session.status === "committed" && (
            <Button className="w-full" onClick={() => {
              posSessionStore.clear(business.id);
              setSession(null);
              setPanelOpen(false);
              setOpenCashier(user.name || "");
              setOpenFloat("");
              setOpenDialog(true);
            }}>
              <LogIn className="h-4 w-4 mr-2" />Start New Session
            </Button>
          )}
        </div>
      )}

      {/* ── Open Session Dialog ── */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><LogIn className="h-5 w-5 text-green-500" />Open Cashier Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Start a new session to begin processing sales. Record your opening float (cash in drawer).</p>
            <div><Label>Cashier Name *</Label><Input className="mt-1" value={openCashier} onChange={e => setOpenCashier(e.target.value)} placeholder="Your name" /></div>
            <div>
              <Label>Opening Float (Ksh)</Label>
              <Input className="mt-1" type="number" min={0} value={openFloat} onChange={e => setOpenFloat(e.target.value)} placeholder="0.00" />
              <p className="text-xs text-muted-foreground mt-1">Cash amount in the till before sales begin</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleOpen}><LogIn className="h-4 w-4 mr-1.5" />Open Session</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Close Session Dialog ── */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-amber-500" />Close Session</DialogTitle></DialogHeader>
          {session && sessionSalesData && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Cashier</span><span className="font-medium">{session.cashier}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Opened</span><span>{fmtDate(session.openedAt)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Transactions</span><span className="font-bold">{sessionSalesData.totalTransactions}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Sales</span><span className="font-bold text-primary">Ksh {fmt(sessionSalesData.totalSales)}</span></div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Count Physical Cash / Payments</h4>
                <p className="text-xs text-muted-foreground mb-3">Enter the actual amount counted for each payment method. Leave blank if none received.</p>
                <div className="space-y-3">
                  {METHODS.filter(m => (sessionSalesData.payMethodTotals[m] ?? 0) > 0 || m === "Cash").map(m => {
                    const expected = sessionSalesData.payMethodTotals[m] ?? 0;
                    const actual = parseFloat(closingEntries[m] || "0") || 0;
                    const variance = actual - expected;
                    return (
                      <div key={m} className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <p className="text-sm font-medium">{m}</p>
                          <p className="text-xs text-muted-foreground">Exp: Ksh {fmt(expected)}</p>
                        </div>
                        <Input
                          type="number" min={0} placeholder="Actual"
                          value={closingEntries[m] ?? ""}
                          onChange={e => setClosingEntries(v => ({ ...v, [m]: e.target.value }))}
                        />
                        {closingEntries[m] !== undefined && (
                          <span className={`text-sm font-semibold ${variance === 0 ? "text-green-600" : "text-amber-600"}`}>
                            {variance >= 0 ? "+" : ""}{fmt(variance)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Closing Notes</Label>
                <Textarea className="mt-1" rows={2} placeholder="Any discrepancies, notes, handover..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCloseDialog(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleClose}><LogOut className="h-4 w-4 mr-1.5" />Close Session</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Commit Confirm Dialog ── */}
      <Dialog open={commitDialog} onOpenChange={setCommitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-blue-500" />Commit Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50/40 p-3 flex gap-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Committing locks this session permanently. No further edits or voids will be possible. Download all reports before committing.</span>
            </div>
            {session && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadReport("raw")}><Download className="h-3 w-3 mr-1" />Raw</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadReport("sales")}><Download className="h-3 w-3 mr-1" />Sales</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadReport("recon")}><Download className="h-3 w-3 mr-1" />Reconciled</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadReport("consolidated")}><Download className="h-3 w-3 mr-1" />Consolidated</Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCommitDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCommit}><Lock className="h-4 w-4 mr-1.5" />Commit & Lock</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
